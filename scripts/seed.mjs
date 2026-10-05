import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

dotenv.config({ path: ".env.local" });
dotenv.config();

function connectionOptions() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      host: process.env.DB_HOST ?? "127.0.0.1",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "kasir_gita_db",
    };
  }

  let connectionUrl;
  try {
    connectionUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL bukan URL MySQL yang valid.");
  }
  if (connectionUrl.protocol !== "mysql:") {
    throw new Error("DATABASE_URL harus menggunakan skema mysql://.");
  }

  const sslMode = connectionUrl.searchParams.get("ssl-mode")?.toUpperCase();
  const requiresSsl = ["REQUIRED", "VERIFY_CA", "VERIFY_IDENTITY"].includes(sslMode ?? "");
  connectionUrl.searchParams.delete("ssl-mode");
  return {
    uri: connectionUrl.toString(),
    ...(requiresSsl ? { ssl: {} } : {}),
  };
}

const connection = await mysql.createConnection(connectionOptions());

try {
  const accounts = [
    { name: "Admin Toko", username: "admin", password: "admin123", role: "admin" },
    { name: "Kasir Toko", username: "kasir", password: "kasir123", role: "cashier" },
  ];
  for (const account of accounts) {
    const [rows] = await connection.execute("SELECT id FROM users WHERE username = ?", [account.username]);
    if (rows.length) continue;
    const hash = await bcrypt.hash(account.password, 12);
    await connection.execute(
      "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
      [account.name, account.username, hash, account.role],
    );
  }

  const [products] = await connection.execute("SELECT id FROM products LIMIT 1");
  if (!products.length) {
    await connection.query(
      "INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)",
      [
        "Roti Cokelat", "Roti Manis", 8000, 30,
        "Roti Keju", "Roti Manis", 9000, 24,
        "Croissant Butter", "Pastry", 12000, 18,
        "Roti Tawar", "Roti Tawar", 16000, 12,
        "Kopi Susu", "Minuman", 14000, 20,
      ],
    );
  }
  console.log("Seed selesai. Login admin/admin123 atau kasir/kasir123.");
} finally {
  await connection.end();
}
