import mysql from "mysql2/promise";

function poolOptions(): mysql.PoolOptions {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      host: process.env.DB_HOST ?? "127.0.0.1",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "kasir_gita_db",
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true,
      timezone: "+07:00",
    };
  }

  let connectionUrl: URL;
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
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    timezone: "+07:00",
  };
}

const globalForMysql = globalThis as typeof globalThis & {
  mysqlPool?: mysql.Pool;
};

export const db =
  globalForMysql.mysqlPool ??
  mysql.createPool(poolOptions());

if (process.env.NODE_ENV !== "production") globalForMysql.mysqlPool = db;
