/**
 * Bootstrap admin pertama.
 *
 * Jalankan:  node scripts/bootstrap-admin.mjs <email>
 *
 * Skrip ini hanya menaikkan role pengguna yang SUDAH terdaftar lewat halaman
 * /daftar. Tidak ada akun admin atau password yang ditulis di dalam kode.
 * Nama pengguna pertama tidak ditentukan oleh skrip, sehingga tidak ada
 * kredensial rahasia yang tersimpan di repositori.
 */
import { Pool } from "pg";

const email = process.argv[2];

if (!email) {
  console.error("Penggunaan: node scripts/bootstrap-admin.mjs <email-terdaftar>");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL belum diset. Skrip ini memerlukan PostgreSQL.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL === "verify-full" },
});

try {
  const existing = await pool.query(
    "select id, display_name, role from users where lower(email) = lower($1) limit 1",
    [email],
  );

  if (existing.rowCount === 0) {
    console.error(
      "Email tidak ditemukan. Daftarkan dulu akunnya lewat /daftar, lalu jalankan skrip ini lagi.",
    );
    process.exit(1);
  }

  const user = existing.rows[0];
  if (user.role === "admin") {
    console.log(`Akun ${user.display_name} sudah admin. Tidak ada perubahan.`);
    process.exit(0);
  }

  await pool.query("update users set role = 'admin' where id = $1", [user.id]);
  console.log(
    `Selesai. ${user.display_name} sekarang admin. Keluar lalu masuk kembali agar sesi memuat role baru.`,
  );
} finally {
  await pool.end();
}