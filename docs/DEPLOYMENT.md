# Deployment — Heroku, PostgreSQL, Name.com, Cloudflare

Target deployment Saring adalah **Heroku** (Node.js buildpack resmi) dengan
**PostgreSQL** sebagai database utama. Aplikasi berjalan sebagai server Node.js
(`next start`), bukan static export.

Domain dikelola di **Name.com**, dan **Cloudflare** dipakai sebagai lapisan
proteksi web (proxy, WAF, rate limiting edge, Turnstile).

> Dokumen ini hanya menjelaskan konfigurasi. Tidak ada secret, credential, atau
> nilai DNS yang ditulis di sini. Semua nilai rahasia dibuat di dashboard
> penyedia masing-masing.

## 1. Konfigurasi yang sudah ada di repositori

| Berkas | Isi |
|---|---|
| `package.json` | `build: next build`, `start: next start`, `engines.node: 22.x`, `db:migrate` |
| `Procfile` | `release: node scripts/migrate.mjs` dan `web: npm start` |
| `app.json` | metadata aplikasi + buildpack `heroku/nodejs` |
| `lib/db/migrations/*.sql` | migration PostgreSQL terlacak (termasuk `body_json` untuk artikel kaya) |
| `scripts/migrate.mjs` | menjalankan migration yang belum diterapkan |
| `scripts/bootstrap-admin.mjs` | menaikkan role satu akun yang sudah terdaftar menjadi admin |
| `.env.example` | daftar variabel lingkungan tanpa nilai rahasia |
| `next.config.ts` | security header + CSP produksi |
| `proxy.ts` | pengalihan awal halaman privat (bukan otorisasi) |

Aplikasi **membutuhkan** `DATABASE_URL` pada production. Tanpa itu, `getStore()`
melempar error dan halaman yang bergantung pada database menolak melayani data
(fail closed) alih-alih diam-diam memakai penyimpanan in-memory yang kehilangan
data.

## 2. Prasyarat

- Akun Heroku + Heroku CLI (`heroku --version`).
- Add-on Heroku Postgres (lihat langkah 3).
- Akun Name.com untuk domain, dan akun Cloudflare bila memakai proxy/WAF.
- Akses ke repositori untuk `git push heroku`.

## 3. Provision PostgreSQL

```bash
heroku addons:create heroku-postgresql:<plan> -a <nama-app>
heroku config -a <nama-app>        # memastikan DATABASE_URL tersedia
```

Heroku menyetel `DATABASE_URL` otomatis. Jangan menyalin nilainya ke dokumen,
issue, atau kode. Bila memakai database eksternal, set manual:

```bash
heroku config:set DATABASE_URL=... -a <nama-app>
```

### Batas koneksi

Setiap dyno membuka pool sendiri. `DATABASE_POOL_MAX` (default `5`) membatasi
pool per instance. Pada plan kecil, jumlah dyno x `DATABASE_POOL_MAX` harus
masih di bawah batas koneksi database. Contoh: 2 dyno x 5 = 10 koneksi.

## 4. Variabel lingkungan produksi

Wajib:

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL. Disetel otomatis oleh add-on Heroku. |
| `SESSION_SECRET` | Minimal 32 karakter acak. Tanpa ini, production melempar error. |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | Secret Siteverify. **Hanya server.** Tanpa ini, form terlindungi menolak request. |
| `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` | Site key publik untuk widget. Aman dibaca browser. |

Disarankan:

| Variabel | Keterangan |
|---|---|
| `GOOGLE_SAFE_BROWSING_API_KEY` | Reputasi URL. Tanpa key, status `not-configured` dan hasil lokal tetap tampil. |
| `SARING_TRUST_PROXY` | `cloudflare` (memakai `cf-connecting-ip`) atau `heroku` (hop terakhir `x-forwarded-for`). Tanpa ini, rate limit memakai satu bucket bersama. |
| `DATABASE_SSL` | `disable` hanya bila server database tidak memakai TLS. `verify-full` untuk verifikasi sertifikat penuh. |
| `DATABASE_POOL_MAX` | Jumlah koneksi per instance (default 5). |
| `SARING_ENABLE_HSTS` | `1` hanya setelah HTTPS stabil. |

Membuat `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set melalui CLI tanpa menuliskan nilainya ke riwayat shell bersama:

```bash
heroku config:set SESSION_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')" -a <nama-app>
```

`SARING_TURNSTILE_BYPASS` dan `SARING_ALLOW_MEMORY_STORE` adalah alat
pengembangan. Keduanya **diabaikan/tidak boleh** dipakai di production.

## 5. Migration database

Migration berada di `lib/db/migrations/` dan dicatat pada tabel
`schema_migrations`. Procfile menjalankan `release` phase sebelum dyno baru
menerima trafik:

```
release: node scripts/migrate.mjs
web: npm start
```

Perintah manual:

```bash
heroku run npm run db:migrate -a <nama-app>        # terapkan yang tertunda
heroku run npm run db:migrate:status -a <nama-app> # lihat status
```

Setiap migration berjalan dalam satu transaksi: bila gagal, tidak ada perubahan
yang tersimpan dan deploy dibatalkan. Tidak ada operasi destruktif otomatis.

Membuat admin pertama (akun harus sudah terdaftar lewat `/daftar`):

```bash
heroku run node scripts/bootstrap-admin.mjs email@contoh.test -a <nama-app>
```

Skrip tidak membuat akun atau password, dan tidak menyimpan kredensial di
repositori.

## 6. Deploy

```bash
heroku login
heroku create <nama-app>
heroku buildpacks:set heroku/nodejs -a <nama-app>
git push heroku main
```

Heroku menjalankan `npm ci`, `next build`, lalu release phase migration, lalu
`next start` yang membaca `PORT` dari platform.

## 7. Health check

`GET /api/health` mengembalikan status ringkas tanpa detail internal:

| Kondisi | Status | Body |
|---|---|---|
| Database terjangkau | `200` | `{"status":"ok","database":"ok"}` |
| Tanpa database, non-production | `200` | `{"status":"ok","database":"not-configured"}` |
| Database tidak terjangkau / tidak dikonfigurasi di production | `503` | `{"status":"degraded","database":"..."}` |

Arahkan uptime monitor eksternal ke endpoint ini. Heroku sendiri menganggap dyno
sehat selama proses web berjalan; endpoint ini untuk pemantauan kesiapan.

## 8. Domain kustom (Name.com) + Cloudflare

> Jangan menebak nilai DNS. Nilai target diberikan oleh Heroku untuk aplikasi
> masing-masing.

1. Tambahkan domain di Heroku lalu baca **DNS Target**:

   ```bash
   heroku domains:add www.namadomain-anda.com -a <nama-app>
   heroku domains -a <nama-app>
   ```

2. Di Cloudflare, tambahkan zone untuk domain tersebut (Cloudflare memberikan
   nameserver pasangan). Ganti nameserver domain di **Name.com** ke nameserver
   yang diberikan Cloudflare. Verifikasi status zone sampai `Active`.

3. Buat record **CNAME** `www` di Cloudflare yang menunjuk ke **DNS Target**
   dari langkah 1, dengan **Proxy status: Proxied** (awan oranye) bila ingin
   memakai WAF, proteksi DDoS, dan rate limiting edge.

4. Untuk apex domain, ikuti panduan Heroku/Cloudflare untuk CNAME flattening
   atau ALIAS. Verifikasi opsi yang benar-benar didukung penyedia.

5. Setelah proxy aktif, set `SARING_TRUST_PROXY=cloudflare` agar rate limit
   memakai `cf-connecting-ip` (header yang ditulis Cloudflare, bukan klien).

**Penting:** selama proxy Cloudflare belum aktif, jangan set
`SARING_TRUST_PROXY=cloudflare`. Header `cf-connecting-ip` dari klien tanpa
proxy tepercaya dapat dipalsukan.

## 9. Proteksi di sisi Cloudflare

Semua butir berikut adalah konfigurasi **dashboard Cloudflare**, bukan kode
aplikasi. Jangan diklaim aktif sebelum benar-benar disetel dan diuji.

| Kebutuhan | Lokasi konfigurasi | Catatan |
|---|---|---|
| Proxy/CDN | DNS record (Proxied) | Wajib agar header Cloudflare dan WAF berlaku. |
| Proteksi DDoS | Otomatis pada plan berbayar; tersedia dasar di semua plan | Tidak perlu kode aplikasi. |
| WAF | Security > WAF | Mulai dari managed ruleset, lalu tinjau false positive pada form. |
| Rate limiting edge | Security > WAF > Rate limiting rules | Lapisan tambahan; rate limit aplikasi tetap aktif. |
| SSL/TLS | SSL/TLS > Overview | Mode **Full (strict)** setelah origin punya sertifikat valid. |
| Turnstile | Turnstile > Add widget | Daftarkan domain produksi; isi site key & secret ke Heroku Config Vars. |
| Always Use HTTPS | SSL/TLS > Edge Certificates | Aktifkan setelah domain proxied. |

Rate limiting aplikasi (tabel `rate_limits` di PostgreSQL) tetap diperlukan
karena aturan edge dapat dilewati (mis. request langsung ke hostname Heroku).
Keduanya bersifat berlapis, bukan saling menggantikan.

Turnstile baru boleh dinyatakan aktif setelah: widget tampil di form, token
terkirim ke server, dan Siteverify mengembalikan `success: true` untuk token
nyata. Selama `CLOUDFLARE_TURNSTILE_SECRET_KEY` kosong, server menolak request
terlindungi (fail closed) dan UI menampilkan pemberitahuan.

## 10. Scaling, session, dan cache bersama

- Sesi memakai cookie terenkripsi (`iron-session`) sehingga **tidak** disimpan
  di memori proses. Menambah dyno tidak menghilangkan sesi, dan tidak diperlukan
  Redis untuk session.
- Rate limit memakai tabel `rate_limits` di PostgreSQL, sehingga penghitung
  berlaku lintas dyno. Penghitung in-memory hanya dipakai pada development.
- Cache aplikasi tidak memakai state proses untuk data pengguna; halaman privat
  mengirim `Cache-Control: private, no-store`.
- Scaling dilakukan lewat Heroku: `heroku ps:scale web=<jumlah>`. Heroku
  menangani load balancing di router; **jangan** membuat load balancer sendiri di
  dalam aplikasi.
- Naikkan `DATABASE_POOL_MAX` hanya bila batas koneksi database mencukupi
  (`jumlah dyno x pool`).

## 11. Checklist smoke test produksi

1. `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test` bersih.
2. `heroku run npm run db:migrate:status` menunjukkan semua migration diterapkan.
3. `GET /api/health` mengembalikan `200` dengan `database: "ok"`.
4. `/`, `/periksa`, `/latihan`, `/langkah`, `/pustaka` dapat dibuka langsung.
5. `/pustaka/<slug-artikel-bawaan>` terbuka; slug tidak dikenal menghasilkan 404.
6. Registrasi + login berhasil; halaman `/akun` menampilkan data pengguna sendiri.
7. Pengguna biasa membuka `/admin` mendapat 404/redirect, dan
   `POST /api/admin/moderate` mengembalikan 403.
8. Artikel yang disetujui muncul di `/pustaka`; artikel pending tidak.
9. Header `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`
   ada pada respons produksi.
10. `Strict-Transport-Security` hanya muncul setelah `SARING_ENABLE_HSTS=1`.
11. Rate limit login benar-benar menolak setelah batas tercapai (HTTP 429).
12. Form terlindungi menolak token CAPTCHA palsu (HTTP 400).

## 12. Yang sengaja tidak dilakukan

- Tidak ada deployment, perubahan DNS, atau aktivasi add-on berbayar dari dalam
  repositori/dokumen ini.
- Tidak ada credential atau nilai DNS nyata yang ditulis ke kode atau dokumen.
- Tidak ada perubahan `.env.local` atau pembacaan nilai secret ke laporan.

