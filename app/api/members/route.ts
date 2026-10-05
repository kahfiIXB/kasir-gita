import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, requireAdmin, requireUser } from "@/lib/http";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const [rows] = await db.execute(
      "SELECT id, name, phone, discount_percent AS discountPercent FROM members ORDER BY name",
    );
    return NextResponse.json({ members: rows });
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
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const discount = Number(body.discountPercent);
    if (!name || name.length > 100 || !/^[0-9+() -]{8,24}$/.test(phone) ||
        !Number.isFinite(discount) || discount < 0 || discount > 100) {
      return NextResponse.json({ error: "Nama, nomor telepon, atau diskon tidak valid." }, { status: 400 });
    }
    const [result] = await db.execute(
      "INSERT INTO members (name, phone, discount_percent) VALUES (?, ?, ?)",
      [name, phone, discount],
    );
    return NextResponse.json({ id: (result as { insertId: number }).insertId }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Nomor telepon sudah terdaftar sebagai member." }, { status: 409 });
    }
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const id = Number(body.id);
    const discount = Number(body.discountPercent);
    if (!Number.isInteger(id) || id < 1 || !Number.isFinite(discount) || discount < 0 || discount > 100) {
      return NextResponse.json({ error: "Data diskon tidak valid." }, { status: 400 });
    }
    await db.execute("UPDATE members SET discount_percent = ? WHERE id = ?", [discount, id]);
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
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Member tidak valid." }, { status: 400 });
    await db.execute("DELETE FROM members WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
