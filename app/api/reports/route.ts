import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, requireUser } from "@/lib/http";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const requestedPeriod = searchParams.get("period");
    const period = requestedPeriod === "month" ? "month" : "day";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    const date = searchParams.get("date") || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Tanggal laporan tidak valid." }, { status: 400 });
    }
    if (auth.user?.role === "cashier" && (period !== "day" || date !== today)) {
      return NextResponse.json({ error: "Kasir hanya dapat melihat rekap hari ini." }, { status: 403 });
    }
    const start = period === "month" ? `${date.slice(0, 7)}-01` : date;
    const end = period === "month"
      ? `${date.slice(0, 7)}-${new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate()}`
      : date;
    const cashierOnly = auth.user?.role === "cashier";
    const scope = cashierOnly ? "AND user_id = ?" : "";
    const scopeParams = cashierOnly ? [auth.user?.id] : [];
    const [summaryRows] = await db.execute(
      `SELECT COUNT(*) AS transactionCount, COALESCE(SUM(total), 0) AS revenue,
              COALESCE(SUM(discount), 0) AS discounts
       FROM sales WHERE DATE(created_at) BETWEEN ? AND ? ${scope}`,
      [start, end, ...scopeParams],
    );
    const [dailyRows] = period === "month"
      ? await db.execute(
        `SELECT DAY(created_at) AS day, COUNT(*) AS transactions,
                COALESCE(SUM(total), 0) AS revenue
         FROM sales WHERE DATE(created_at) BETWEEN ? AND ? ${scope}
        GROUP BY DAY(created_at)
        ORDER BY DAY(created_at)`,
        [start, end, ...scopeParams],
      )
      : await db.execute(
        `SELECT HOUR(created_at) AS hour, COUNT(*) AS transactions, COALESCE(SUM(total), 0) AS revenue
         FROM sales WHERE DATE(created_at) = ? ${cashierOnly ? "AND user_id = ?" : ""}
         GROUP BY HOUR(created_at) ORDER BY HOUR(created_at)`,
        cashierOnly ? [start, auth.user?.id] : [start],
      );
    const [saleRows] = await db.execute(
      `SELECT s.id, s.invoice, s.total, s.discount, s.created_at AS createdAt,
              u.name AS cashierName, m.name AS memberName,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS itemCount
       FROM sales s JOIN users u ON u.id = s.user_id
       LEFT JOIN members m ON m.id = s.member_id
       WHERE DATE(s.created_at) BETWEEN ? AND ? ${cashierOnly ? "AND s.user_id = ?" : ""}
       ORDER BY s.created_at DESC LIMIT 100`,
      cashierOnly ? [start, end, auth.user?.id] : [start, end],
    );
    return NextResponse.json({ summary: (summaryRows as Array<Record<string, number>>)[0], chart: dailyRows, sales: saleRows, period, date, start, end });
  } catch (error) {
    return errorResponse(error);
  }
}
