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

## Deploy ke Vercel dengan MySQL

Di **Project Settings → Environment Variables**, tambahkan `DATABASE_URL` berisi connection string MySQL dari penyedia database. Aplikasi menggunakan `DATABASE_URL` jika diatur; variabel `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, dan `DB_NAME` menjadi fallback untuk Laragon lokal. Jika connection string mengandung `ssl-mode=REQUIRED`, `ssl-mode=VERIFY_CA`, atau `ssl-mode=VERIFY_IDENTITY`, koneksi TLS akan diaktifkan.

Pastikan database MySQL tujuan sudah memiliki tabel dari `database/schema.sql`. Setelah menyimpan environment variable, lakukan redeploy. Jangan commit atau membagikan nilai `DATABASE_URL`; simpan hanya di Vercel Environment Variables atau `.env.local` yang diabaikan Git.

## Akun demo

- Admin: `admin` / `admin123`
- Kasir: `kasir` / `kasir123`

Jalankan seed berulang kali dengan aman: akun yang sudah ada tidak ditimpa. Ubah password demo sebelum dipakai di lingkungan publik. Login menyediakan pilihan Admin atau Kasir; akun kasir tambahan dibuat oleh admin dari menu Pengguna.
