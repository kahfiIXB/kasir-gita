import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { errorResponse, requireUser } from "@/lib/http";

type ProductRow = RowDataPacket & { id: number; name: string; price: number; stock: number };

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    }
    const cashierOnly = auth.user?.role === "cashier";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    if (cashierOnly && date !== today) {
      return NextResponse.json({ error: "Kasir hanya dapat melihat transaksi hari ini." }, { status: 403 });
    }
    const [rows] = await db.execute(
      `SELECT s.id, s.invoice, s.subtotal, s.discount, s.total, s.paid, s.change_amount AS changeAmount,
              s.created_at AS createdAt, u.name AS cashierName, m.name AS memberName,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS itemCount
       FROM sales s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN members m ON m.id = s.member_id
       WHERE DATE(s.created_at) = ? ${cashierOnly ? "AND s.user_id = ?" : ""}
       ORDER BY s.created_at DESC LIMIT 200`,
      cashierOnly ? [date, auth.user?.id] : [date],
    );
    return NextResponse.json({ sales: rows, date });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const connection = await db.getConnection();
  try {
    const body = await request.json();
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
      return NextResponse.json({ error: "Keranjang belanja kosong atau tidak valid." }, { status: 400 });
    }

    const quantities = new Map<number, number>();
    for (const item of body.items) {
      const productId = Number(item?.productId);
      const quantity = Number(item?.quantity);
      if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
        return NextResponse.json({ error: "Barang atau jumlah belanja tidak valid." }, { status: 400 });
      }
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }
    const paid = Number(body.paid);
    if (!Number.isFinite(paid) || paid < 0 || paid > 9999999999.99) {
      return NextResponse.json({ error: "Nominal pembayaran tidak valid." }, { status: 400 });
    }

    await connection.beginTransaction();
    const ids = [...quantities.keys()].sort((a, b) => a - b);
    const [products] = await connection.query<ProductRow[]>(
      `SELECT id, name, price, stock FROM products WHERE active = TRUE AND id IN (${ids.map(() => "?").join(",")}) ORDER BY id FOR UPDATE`,
      ids,
    );
    if (products.length !== ids.length) {
      await connection.rollback();
      return NextResponse.json({ error: "Ada barang yang sudah tidak tersedia." }, { status: 409 });
    }

    const lines = products.map((product) => {
      const quantity = quantities.get(product.id);
      if (quantity === undefined) throw new Error("Jumlah barang tidak valid.");
      if (quantity > product.stock) {
        throw new Error(`Stok ${product.name} tidak mencukupi. Sisa stok ${product.stock}.`);
      }
      return { product, quantity, lineTotal: money(product.price * quantity) };
    });
    const subtotal = money(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    if (subtotal > 9999999999.99) {
      await connection.rollback();
      return NextResponse.json({ error: "Total transaksi melebihi batas yang dapat diproses." }, { status: 400 });
    }
    let memberId: number | null = null;
    let discountPercent = 0;
    if (body.memberId !== null && body.memberId !== undefined && body.memberId !== "") {
      memberId = Number(body.memberId);
      if (!Number.isInteger(memberId) || memberId < 1) {
        await connection.rollback();
        return NextResponse.json({ error: "Member tidak valid." }, { status: 400 });
      }
      const [members] = await connection.query<RowDataPacket[]>(
        "SELECT id, discount_percent FROM members WHERE id = ? FOR UPDATE",
        [memberId],
      );
      if (!members.length) {
        await connection.rollback();
        return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
      }
      discountPercent = Number(members[0].discount_percent);
    }
    const discount = money(subtotal * discountPercent / 100);
    const total = money(subtotal - discount);
    const roundedPaid = money(paid);
    if (roundedPaid < total) {
      await connection.rollback();
      return NextResponse.json({ error: "Uang pembayaran masih kurang." }, { status: 400 });
    }

    const invoiceDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()).replaceAll("-", "");
    const invoice = `GIT-${invoiceDate}-${randomBytes(5).toString("hex").toUpperCase()}`;
    const [sale] = await connection.execute(
      "INSERT INTO sales (invoice, user_id, member_id, subtotal, discount, total, paid, change_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [invoice, auth.user?.id, memberId, subtotal, discount, total, roundedPaid, money(roundedPaid - total)],
    );
    const saleId = (sale as { insertId: number }).insertId;
    for (const line of lines) {
      await connection.execute(
        "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, line_total) VALUES (?, ?, ?, ?, ?, ?)",
        [saleId, line.product.id, line.product.name, line.quantity, line.product.price, line.lineTotal],
      );
      await connection.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [line.quantity, line.product.id]);
    }
    await connection.commit();
    return NextResponse.json({
      sale: { id: saleId, invoice, subtotal, discount, total, paid: roundedPaid, changeAmount: money(roundedPaid - total) },
    }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    if (error instanceof Error && error.message.startsWith("Stok ")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return errorResponse(error);
  } finally {
    connection.release();
  }
}
