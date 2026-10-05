import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, requireAdmin, requireUser } from "@/lib/http";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const [rows] = await db.execute(
      "SELECT id, name, category, price, stock FROM products WHERE active = TRUE ORDER BY category, name",
    );
    return NextResponse.json({ products: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const price = Number(body.price);
    const stock = Number(body.stock);
    if (!name || name.length > 120 || !category || category.length > 60 ||
        !Number.isFinite(price) || price < 0 || price > 9999999999.99 ||
        !Number.isInteger(stock) || stock < 0 || stock > 4294967295) {
      return NextResponse.json({ error: "Nama, kategori, harga, atau stok tidak valid." }, { status: 400 });
    }
    const [result] = await db.execute(
      "INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)",
      [name, category, price, stock],
    );
    return NextResponse.json({ id: (result as { insertId: number }).insertId }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const id = Number(body.id);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const price = Number(body.price);
    const stock = Number(body.stock);
    if (!Number.isInteger(id) || id < 1 || !name || name.length > 120 || !category || category.length > 60 ||
        !Number.isFinite(price) || price < 0 || price > 9999999999.99 ||
        !Number.isInteger(stock) || stock < 0 || stock > 4294967295) {
      return NextResponse.json({ error: "Data menu tidak valid." }, { status: 400 });
    }
    await db.execute(
      "UPDATE products SET name = ?, category = ?, price = ?, stock = ? WHERE id = ? AND active = TRUE",
      [name, category, price, stock, id],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Menu tidak valid." }, { status: 400 });
    await db.execute("UPDATE products SET active = FALSE WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
