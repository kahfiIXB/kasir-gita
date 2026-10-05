import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role;
    if (!username || !password || (role !== "admin" && role !== "cashier")) {
      return NextResponse.json({ error: "Pilih peran, username, dan password." }, { status: 400 });
    }

    const [rows] = await db.execute(
      "SELECT id, name, username, password_hash, role FROM users WHERE username = ?",
      [username],
    );
    const account = (rows as Array<{
      id: number;
      name: string;
      username: string;
      password_hash: string;
      role: "admin" | "cashier";
    }>)[0];
    if (!account || account.role !== role || !(await bcrypt.compare(password, account.password_hash))) {
      return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
    }

    const user = { id: account.id, name: account.name, username: account.username, role: account.role };
    await createSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
