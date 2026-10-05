import mysql from "mysql2/promise";

const globalForMysql = globalThis as typeof globalThis & {
  mysqlPool?: mysql.Pool;
};

export const db =
  globalForMysql.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "kasir_gita_db",
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    timezone: "+07:00",
  });

if (process.env.NODE_ENV !== "production") globalForMysql.mysqlPool = db;
