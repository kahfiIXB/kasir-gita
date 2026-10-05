import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, type SessionUser } from "@/lib/auth";

export async function requireUser() {
  const user = await getSession();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }) };
  }
  try {
    const [rows] = await db.execute("SELECT id FROM users WHERE id = ?", [user.id]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return { user: null, response: NextResponse.json({ error: "Akun ini sudah tidak aktif." }, { status: 401 }) };
    }
    return { user, response: null };
  } catch (error) {
    console.error(error);
    return {
      user: null,
      response: NextResponse.json({ error: "Tidak dapat memverifikasi akun. Periksa koneksi database." }, { status: 500 }),
    };
  }
}

export async function requireAdmin() {
  const auth = await requireUser();
  if (auth.response) return auth;
  if ((auth.user as SessionUser).role !== "admin") {
    return { user: null, response: NextResponse.json({ error: "Akses khusus admin." }, { status: 403 }) };
  }
  return auth;
}

export function errorResponse(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "Terjadi kesalahan pada server. Periksa koneksi database." }, { status: 500 });
}
