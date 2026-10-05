import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kasir Toko Roti",
  description: "Aplikasi kasir dan pencatatan penjualan toko roti.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
