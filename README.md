# Kasir Toko Roti

Aplikasi kasir responsif Next.js untuk Laragon dan MySQL. Admin mengelola menu/stok, member dan diskon, akun kasir, serta laporan harian/bulanan. Kasir mencatat transaksi dan melihat laporan hariannya.

## Menjalankan di Laragon

1. Jalankan **MySQL** dari Laragon.
2. Buat database `kasir_gita_db` dengan HeidiSQL/phpMyAdmin atau jalankan `CREATE DATABASE kasir_gita_db;`. Script seed akan membuat tabel aplikasi dari `database/schema.sql` secara otomatis.
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

Untuk inisialisasi tabel dan akun/menu demo pada MySQL online, jalankan dari PowerShell proyek dengan public connection URL dari penyedia MySQL:

```powershell
$env:DATABASE_URL = "mysql://USER:PASSWORD@HOST:PORT/DATABASE"
npm.cmd run seed
```

Seed membuat tabel dari `database/schema.sql` di database yang disebut pada URL sebelum membuat akun/menu demo. Pastikan URL menunjuk ke database tujuan yang benar. Jangan commit atau membagikan nilai `DATABASE_URL`; simpan hanya di Vercel Environment Variables atau di environment PowerShell lokal.

## Akun demo

- Admin: `admin` / `admin123`
- Kasir: `kasir` / `kasir123`

Jalankan seed berulang kali dengan aman: akun yang sudah ada tidak ditimpa. Ubah password demo sebelum dipakai di lingkungan publik. Login menyediakan pilihan Admin atau Kasir; akun kasir tambahan dibuat oleh admin dari menu Pengguna.
