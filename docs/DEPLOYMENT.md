# Deployment — Heroku

Target deployment adalah **Heroku** dengan **Node.js buildpack resmi**. Aplikasi
berjalan sebagai server Node.js (bukan static export/`output: "export"`).

## Konfigurasi yang sudah disiapkan

- `package.json`
  - `"build": "next build"` — dipanggil Heroku saat kompilasi.
  - `"start": "next start"` — dipanggil saat runtime; `next start` membaca `PORT`
    dari environment Heroku.
  - `"engines": { "node": "22.x" }` — mematok versi Node di Heroku.
- `Procfile` — `web: npm start`.
- `package-lock.json` — lockfile npm yang konsisten; Heroku memakai `npm ci`.
- `app.json` — metadata & buildpack (`heroku/nodejs`) untuk dokumentasi/Review Apps.
- `.gitignore` — sudah mengecualikan `.next/`, `.env*`, artefak Playwright, dsb.

Tidak ada database, redis, atau add-on yang diperlukan.

## Prasyarat

- Akun Heroku dan **Heroku CLI** terpasang (`heroku --version`).
- Akun GitHub (untuk CI) dan repositori publik.
- Akses akun Heroku untuk aplikasi yang bersangkutan.

## Langkah deployment

```bash
# 1. Login
heroku login

# 2. Buat aplikasi (nama disesuaikan; bisa juga tanpa nama agar otomatis)
heroku create saring-app

# 3. Pastikan buildpack Node.js resmi (biasanya otomatis)
heroku buildpacks:set heroku/nodejs -a saring-app

# 4. Push kode
git push heroku main

# 5. Buka aplikasi
heroku open -a saring-app
```

Heroku menjalankan build dan `next build` di sisi server; runtime `next start`
membaca `PORT` yang disetel Heroku secara otomatis.

## Variabel lingkungan

Tanpa credential, aplikasi tetap berjalan dengan analisis lokal dan status reputasi URL `not-configured`. Untuk lookup Google Safe Browsing, set Config Var server-side:

```text
GOOGLE_SAFE_BROWSING_API_KEY=<wajib untuk lookup reputasi; jangan commit>
```

`GOOGLE_SAFE_BROWSING_API_KEY` tidak memakai prefix `NEXT_PUBLIC_`. Tanpa key, pemeriksaan reputasi tidak berjalan sama sekali; UI menampilkan status belum dikonfigurasi dan hasil lokal tetap tampil. Jangan mengaktifkan billing atau memasukkan credential ke frontend.

## Custom domain (Name.com)

> Jangan menebak nilai DNS. Nilai target DNS **diberikan oleh Heroku** untuk
> aplikasi masing-masing.

1. Tambahkan domain di Heroku dan baca **DNS target** yang ditampilkan Heroku:

   ```bash
   heroku domains:add www.namadomain-anda.com -a saring-app
   heroku domains -a saring-app
   ```

   Output `heroku domains` menampilkan kolom **DNS Target** (mis. berbentuk
   `<app>-<hash>.herokudns.com`). Gunakan nilai itu persis seperti yang
   ditampilkan — bukan contoh di dokumen ini.

2. Di panel DNS **Name.com**, buatkan record:

   - Tipe: **CNAME**
   - Host: `www`
   - Answer/Target: **nilai DNS Target dari langkah 1**

3. (Opsional) Untuk apex domain (`namadomain-anda.com`), ikuti panduan Heroku
   untuk apex/root domain (biasanya memerlukan ALIAS/ANAME/pointing yang
   didukung penyedia). Verifikasi opsi yang didukung Name.com.

4. Tunggu propagasi DNS, lalu verifikasi:

   ```bash
   heroku domains -a saring-app
   ```

> Aktivasi domain kustom bersifat opsional dan tidak menghalangi deployment
> dasar. Jangan mengaktifkan resource berbayar atau add-on tanpa izin.

## Checklist smoke-test produksi

1. `npm run build` berhasil tanpa error.
2. `npm run lint` dan `npm run typecheck` bersih.
3. `npm run test` lolos.
4. `npm run test:e2e` lolos terhadap server produksi.
5. Rute `/`, `/periksa`, `/latihan`, `/langkah`, `/pustaka` dapat diakses langsung
   (bukan 404).
6. Alur Periksa menghasilkan hasil yang dapat dijelaskan.
7. Header keamanan (`Content-Security-Policy`, `X-Frame-Options`, …) muncul pada
   respons produksi.
8. URL aplikasi Heroku yang benar-benar di-deploy diverifikasi sebelum diklaim "live".