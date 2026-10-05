export type User = {
  id: number;
  name: string;
  username: string;
  role: "admin" | "cashier";
};

export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
};

export type Member = {
  id: number;
  name: string;
  phone: string;
  discountPercent: number;
};

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Permintaan tidak berhasil.");
  return data as T;
}

export function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function dateToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
