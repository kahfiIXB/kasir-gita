# Kasir Toko Roti

Aplikasi kasir responsif Next.js untuk Laragon dan MySQL. Admin mengelola menu/stok, member dan diskon, akun kasir, serta laporan harian/bulanan. Kasir mencatat transaksi dan melihat laporan hariannya.

## Menjalankan di Laragon

1. Jalankan **MySQL** dari Laragon.
2. Buat database `kasir_gita_db` dan tabel-tabelnya dengan mengimpor `database/schema.sql` melalui HeidiSQL/phpMyAdmin, atau jalankan isi file tersebut di MySQL.
3. Salin `.env.example` menjadi `.env.local`. Database default sudah diarahkan ke `kasir_gita_db`; sesuaikan host, port, user, password bila konfigurasi MySQL Laragon berbeda. Ganti `SESSION_SECRET` dengan secret acak minimal 32 karakter; contoh PowerShell: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Pasang dependency dan buat akun/demo menu:

   ```powershell
   npm.cmd install
   npm.cmd run seed
   ```

5. Jalankan Next.js:

   ```powershell
   npm.cmd run dev
   ```

   Buka `http://localhost:3000`.

Laragon menyediakan MySQL, sedangkan server aplikasi Next.js berjalan dengan Node.js melalui `npm run dev` (atau `npm run build` lalu `npm run start`).

## Akun demo

- Admin: `admin` / `admin123`
- Kasir: `kasir` / `kasir123`

Jalankan seed berulang kali dengan aman: akun yang sudah ada tidak ditimpa. Ubah password demo sebelum dipakai di lingkungan publik. Pendaftaran mandiri hanya membuat akun kasir; role admin tidak dapat dipilih dari formulir pendaftaran.
