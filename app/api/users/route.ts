import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/http";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    const [rows] = await db.execute(
      "SELECT id, name, username, role, created_at AS createdAt FROM users ORDER BY created_at DESC",
    );
    return NextResponse.json({ users: rows });
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
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || name.length > 100 || !/^[a-z0-9._-]{3,50}$/.test(username) ||
        password.length < 8 || password.length > 72 || Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json({ error: "Nama, username, atau password tidak valid." }, { status: 400 });
    }
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'cashier')",
      [name, username, hash],
    );
    return NextResponse.json({ id: (result as { insertId: number }).insertId }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Username sudah digunakan." }, { status: 409 });
    }
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1 || id === auth.user?.id) {
      return NextResponse.json({ error: "Akun tersebut tidak dapat dihapus." }, { status: 400 });
    }
    await db.execute("DELETE FROM users WHERE id = ? AND role = 'cashier'", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_ROW_IS_REFERENCED_2") {
      return NextResponse.json({ error: "Kasir ini sudah memiliki transaksi dan tidak dapat dihapus." }, { status: 409 });
    }
    return errorResponse(error);
  }
}
