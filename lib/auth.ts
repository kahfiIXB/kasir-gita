import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const COOKIE_NAME = "kasir_session";

export type SessionUser = {
  id: number;
  name: string;
  username: string;
  role: "admin" | "cashier";
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET harus diisi minimal 32 karakter.");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.id !== "number" ||
      typeof payload.name !== "string" ||
      typeof payload.username !== "string" ||
      (payload.role !== "admin" && payload.role !== "cashier")
    ) {
      return null;
    }
    return {
      id: payload.id,
      name: payload.name,
      username: payload.username,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
