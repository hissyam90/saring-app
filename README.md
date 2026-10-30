# Saring — Pendamping Kepercayaan Digital

> **Saring Sebelum Sharing. Periksa Sebelum Percaya.**
> Belum tentu penipuan. Belum tentu aman. Kenali tandanya sebelum bertindak.

Saring adalah aplikasi web untuk membantu anak muda Indonesia mengenali pesan,
nomor, dan tautan penipuan daring. Pengguna dapat memeriksa sinyal bahaya,
berlatih mengambil keputusan, dan mengetahui langkah yang harus diambil setelah
insiden — tanpa akun untuk pemeriksaan dasar.

Saring adalah **alat bantu pengambilan keputusan**, bukan alat yang memutuskan
sebuah pesan penipuan atau bukan. Hasilnya berupa indikator yang dapat
dijelaskan, disertai langkah lanjutan yang praktis.

**Produksi:** <https://saring.app>

---

## Pratinjau

![Halaman beranda Saring](docs/assets/screenshots/homepage-desktop.png)

![Alat pemeriksaan Saring](docs/assets/screenshots/checker-desktop.png)

---

## Masalah dan tujuan

Penipuan digital memanfaatkan rasa takut, desakan waktu, janji berlebihan, dan
peniruan pihak resmi. Korban umumnya bertindak sebelum sempat memeriksa. Saring
masuk pada jeda itu: **keputusan menjadi lebih aman ketika orang berhenti
sejenak dan memeriksa sinyalnya.**

Tujuan produk:

1. Menunjukkan sinyal bahaya beserta bukti dan alasannya, bukan memberi label
   "aman" atau "penipuan".
2. Menjaga privasi pemeriksaan: analisis pesan dan struktur tautan berjalan di
   peramban, tidak dikirim ke server.
3. Menyediakan langkah lanjutan yang konkret, termasuk kanal pelaporan resmi.
4. Membangun kebiasaan memeriksa lewat latihan berbasis skenario.

---

## Target pengguna

- Pelajar dan mahasiswa Indonesia.
- Pencari kerja muda yang rentan terhadap lowongan palsu dan biaya rekrutmen.
- Pengguna layanan digital sehari-hari (bank, dompet digital, marketplace).
- Siapa pun yang ingin lebih teliti sebelum membalas pesan mencurigakan.

---

## Fitur utama

### Pemeriksaan terpadu (`/periksa`)

Satu halaman, tiga mode pemeriksaan:

| Mode | Cara kerja |
|---|---|
| **Periksa Pesan** | Mesin aturan heuristik menganalisis teks dan menampilkan sinyal, kategori, tingkat keparahan, kutipan bukti, serta langkah selanjutnya. Berjalan lokal di peramban. |
| **Periksa Nomor** | Menormalkan format nomor dan menilai perilaku pengirim berdasarkan konteks yang dipilih. Tidak memakai database reputasi nomor. |
| **Periksa Tautan** | Inspeksi struktur URL berjalan lokal (penyingkat, alamat IP mentah, HTTP tanpa enkripsi). Reputasi Google Safe Browsing hanya dipanggil setelah pengguna memberi persetujuan. |

Hasil dikelompokkan menjadi tiga tingkat sinyal dan tidak pernah berupa label
"aman".

### Latihan keputusan (`/latihan`)

Bank berisi **20 skenario** fiktif dengan tiga panjang sesi: 5, 10, atau seluruh
bank. Soal diambil acak tanpa duplikasi dalam satu sesi. Setiap pilihan bernilai
**100** (langkah terbaik), **50** (hati-hati tetapi masih ada celah), atau **0**
(berisiko); aturan penilaian ditampilkan sebelum sesi dimulai. Ringkasan akhir
memuat poin, persentase, skor per kategori, dan daftar soal yang perlu dipelajari
ulang.

### Langkah selanjutnya (`/langkah`)

Enam kondisi pascainsiden: baru menerima pesan, terlanjur membuka tautan, sudah
memasukkan kredensial, sudah mentransfer uang, akun mungkin diambil alih, dan
sudah membagikan dokumen pribadi. Setiap kondisi menghasilkan lima bagian:
lakukan sekarang, setelah itu, bukti yang perlu disimpan, yang perlu diperiksa,
dan sumber bantuan resmi. Halaman ini dapat dibuka langsung dari hasil
pemeriksaan lewat `/langkah?kondisi=...`.

### Pustaka (`/pustaka`)

**14 artikel** edukasi, masing-masing dengan halaman baca sendiri, daftar isi,
daftar periksa, sumber rujukan resmi, dan artikel terkait. Indeks menyediakan
pencarian dan filter kategori; estimasi waktu baca dihitung dari panjang teks
sebenarnya.

### Komunitas (`/komunitas`)

Tanya jawab publik dengan pencarian, filter kategori (termasuk `Lainnya`), dan
pagination. Pengguna terdaftar dapat membalas dan melaporkan konten.

### Kontribusi artikel (`/komunitas/artikel`)

Editor rich text (Tiptap) dengan format, pratinjau, dan penyisipan gambar atau
embed media. Artikel yang dikirim berstatus `pending` dan hanya terbit di Pustaka
setelah disetujui admin. Artikel yang sudah terbit dapat direvisi tanpa
menghilangkan versi yang sedang tayang.

### Akun (`/akun`)

Registrasi, login, dan pusat kendali pengguna: preferensi tampilan, draf otomatis,
daftar pertanyaan, pengajuan artikel beserta statusnya, arsip artikel, dan artikel
tersimpan.

### Admin (`/admin`)

Ringkasan angka dari database, antrean artikel, antrean revisi dengan perbandingan
versi publik versus usulan, laporan (termasuk konteks balasan yang dilaporkan),
diskusi, dan pengguna. Seluruh aksi melewati satu endpoint yang memeriksa role di
server dan mencatat riwayat moderasi.

### Fitur pendukung

- **Draf otomatis** — artikel dan pertanyaan disimpan sebagai draf di PostgreSQL
  dengan debounce, dapat dilanjutkan atau dihapus.
- **Bookmark** — artikel Pustaka dapat disimpan ke akun dan tetap ada lintas
  perangkat.
- **Notifikasi dalam aplikasi** — dibuat dari peristiwa nyata (balasan baru,
  keputusan artikel, keputusan revisi). Tanpa email, SMS, atau WebSocket.
- **Arsip artikel** — soft archive: artikel disembunyikan dari publik tanpa
  menghapus data atau riwayat revisi.
- **Tema tampilan** — Terang (default), Gelap, dan Ikuti sistem. Disimpan di
  `localStorage`, tidak di database.
- **CAPTCHA** — Cloudflare Turnstile, diverifikasi di server pada registrasi,
  login, diskusi, balasan, artikel, dan laporan.

---


## Tumpukan teknologi

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Lucide Icons |
| Bahasa | TypeScript 5 |
| Database | PostgreSQL (`pg`) |
| Autentikasi | `iron-session` (cookie terenkripsi), `bcryptjs` |
| Validasi | `zod` |
| Editor | Tiptap 3 |
| Pengujian | Vitest + Testing Library, Playwright |
| Runtime | Node.js 22.x |
| Hosting | Heroku (Node.js buildpack) + Heroku Postgres |
| Edge | Cloudflare (proxy, WAF, Turnstile) |

---

## Arsitektur sistem

![Diagram arsitektur Saring](docs/assets/diagrams/system-overview.svg)

Sistem terdiri atas empat lapisan:

1. **Peramban** — antarmuka App Router dan mesin aturan `lib/analysis` yang murni
   dan deterministik. Pesan serta struktur tautan tidak dikirim ke server.
2. **Server Next.js** — autentikasi, API komunitas, moderasi admin, dan endpoint
   reputasi URL. Semua otorisasi diperiksa ulang di server.
3. **PostgreSQL** — akun, artikel, revisi, draf, bookmark, notifikasi, laporan,
   log moderasi, dan penghitung rate limit.
4. **Layanan eksternal** — Google Safe Browsing (opsional, untuk reputasi URL)
   dan Cloudflare Turnstile (CAPTCHA).

### Mesin aturan heuristik

Mesin menilai pesan berdasarkan **sepuluh kategori sinyal**:

1. **Pencurian kredensial** — permintaan OTP, PIN, kata sandi, atau kode
   verifikasi.
2. **Desakan dan intimidasi** — ancaman pemblokiran akun atau tenggat sempit.
3. **Permintaan pembayaran di muka** — biaya rekrutmen, administrasi, atau klaim.
4. **Janji yang tidak realistis** — untung pasti, tanpa risiko, atau iming-iming
   hadiah.
5. **Tautan mencurigakan** — penyingkat URL, alamat IP mentah, atau `http://`.
6. **Peniruan pihak resmi** — klaim otoritas atau domain mirip institusi resmi.
7. **Instruksi percakapan berisiko** — pindah kanal atau melewati verifikasi.
8. **Penyamaran teman atau keluarga** — mengaku kenalan lama dengan nomor baru.
9. **Permintaan uang mendadak** — pinjaman atau transfer dengan alasan mendesak.
10. **Upaya menghalangi verifikasi** — melarang pengguna menghubungi pihak lain.

Setiap aturan memiliki bobot berdasarkan tingkat keparahan (tinggi/sedang/rendah =
40/25/15). Skor sinyal dijumlahkan dengan batas maksimum 100, lalu dipetakan ke
klasifikasi.

Aturan memperhatikan konteks: penyebutan kata "OTP" dalam kalimat edukasi
(mis. "jangan pernah bagikan OTP") tidak ditandai sebagai permintaan kredensial.
**Skor bukan peluang penipuan** — angka itu hanya total bobot indikator yang
dikenali aturan.

Penjelasan lebih rinci ada di [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Keamanan dan privasi

**Privasi data**

- Pemeriksaan pesan dan struktur tautan berjalan di peramban; isinya tidak dikirim
  ke server dan tidak disimpan.
- Reputasi URL hanya dipanggil setelah pengguna mencentang persetujuan.
- Tidak ada analitik pihak ketiga dan tidak ada layanan AI eksternal.
- Preferensi tema disimpan di `localStorage`, bukan di database.

**Keamanan aplikasi**

- Sesi memakai cookie terenkripsi `iron-session` (`httpOnly`, `secure` di
  production, `SameSite=Lax`). Kata sandi disimpan sebagai hash `bcryptjs`.
- Otorisasi diperiksa di server pada setiap route dan server component; role
  dibaca ulang dari database sehingga perubahan role langsung berlaku.
- Operasi mutasi memeriksa asal permintaan (perlindungan CSRF).
- Rate limit tersimpan di PostgreSQL sehingga berlaku lintas instance; bila
  penyimpanan gagal, permintaan ditolak.
- CAPTCHA Turnstile diverifikasi di server (Siteverify), bukan hanya di klien.
- Respons produksi mengirim Content Security Policy, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, dan `Permissions-Policy`.
  HSTS hanya dikirim bila `SARING_ENABLE_HSTS=1`.
- Halaman privat mengirim `Cache-Control: private, no-store`.

Rincian lengkap ada di
[docs/SECURITY-AND-PRIVACY.md](docs/SECURITY-AND-PRIVACY.md).

---


## Struktur proyek

```text
app/                        Rute App Router
  api/                      Route handler (auth, community, admin, health, url-reputation)
  admin/                    Dashboard moderasi
  akun/                     Akun pengguna dan artikel tersimpan
  komunitas/                Tanya jawab, form baru, detail, editor artikel
  periksa/ latihan/ langkah/ pustaka/
  layout.tsx                Root layout (tema, navigasi, footer)
components/                 Komponen UI (periksa, latihan, langkah, komunitas, auth, admin, ui)
lib/
  analysis/                 Mesin aturan heuristik (murni, tanpa jaringan)
  reputation/               Adapter Google Safe Browsing + decoder protobuf
  db/                       Abstraksi Store: postgres.ts, memory.ts, migrations/
  auth/                     Sesi, hash kata sandi, penjaga role
  security/                 Validasi zod, rate limit, Turnstile, pemeriksaan origin
data/                       Artikel, skenario latihan, panduan, contoh pesan
scripts/                    migrate.mjs, bootstrap-admin.mjs, contrast-audit.mjs
tests/                      unit/, components/, e2e/
docs/                       Dokumentasi teknis dan panduan presentasi
proxy.ts                    Pengalihan awal halaman privat (bukan otorisasi)
```

Logika domain di `lib/analysis` sepenuhnya murni: tidak ada pemanggilan jaringan,
sehingga dapat diuji tanpa peramban dan hasilnya deterministik.

---

## Persyaratan dan instalasi

**Persyaratan**

- Node.js **22.x** (lihat `engines` di `package.json`).
- npm (lockfile `package-lock.json` disertakan).
- PostgreSQL untuk fitur akun, komunitas, dan admin.

**Instalasi**

```bash
git clone https://github.com/hissyam90/saring-app.git
cd saring-app
npm ci

cp .env.example .env.local     # lalu isi nilainya
npm run db:migrate             # buat skema di database pengembangan
npm run dev                    # http://localhost:3000
```

Tanpa `DATABASE_URL`, aplikasi tetap dapat dijalankan pada mode pengembangan
dengan penyimpanan in-memory agar dapat diuji, tetapi data hilang saat server
restart. Pada production, `DATABASE_URL` wajib: tanpa itu aplikasi menolak
melayani data (fail closed).

Untuk menguji form yang dilindungi CAPTCHA tanpa widget sungguhan, set
`SARING_TURNSTILE_BYPASS=1` di `.env.local`. Nilai ini diabaikan di production.

> Pada `next dev`, header CSP tidak aktif karena runtime pengembangan memerlukan
> `eval`/inline script. CSP aktif pada build produksi (`next start`).

---

## Variabel lingkungan

Daftar lengkap dengan komentar tersedia di [`.env.example`](.env.example).
Ringkasannya:

**Wajib di production**

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL. Disetel otomatis oleh add-on Heroku Postgres. |
| `SESSION_SECRET` | Minimal 32 karakter acak untuk cookie sesi terenkripsi. |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | Secret Siteverify. **Hanya server.** Tanpa ini, form terlindungi menolak request. |
| `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` | Site key publik untuk widget Turnstile. Aman dibaca peramban. |

**Disarankan**

| Variabel | Keterangan |
|---|---|
| `DATABASE_SSL` | Kosongkan untuk Heroku Postgres; `disable` hanya untuk database tanpa TLS. |
| `DATABASE_POOL_MAX` | Jumlah koneksi per instance (default `5`). |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Opsional. Tanpa key, reputasi URL tidak berjalan. |
| `SARING_TRUST_PROXY` | `cloudflare` atau `heroku`; menentukan sumber IP untuk rate limit. |
| `SARING_ENABLE_HSTS` | `1` hanya setelah HTTPS stabil di domain produksi. |

**Jangan dipakai di production**

| Variabel | Alasan |
|---|---|
| `SARING_TURNSTILE_BYPASS` | Melewati CAPTCHA. Hanya berlaku di luar production, tetapi jangan diset di hosting. |
| `SARING_ALLOW_MEMORY_STORE` | Memaksa penyimpanan in-memory; data hilang saat restart dan tidak dibagi antar instance. |

Variabel berawalan `NEXT_PUBLIC_` dikirim ke peramban. Selain itu hanya dibaca di
server. Jangan pernah menaruh secret pada variabel `NEXT_PUBLIC_`.

---


## Migrasi database

Migration berada di `lib/db/migrations/`, diurutkan menurut nama berkas, dijalankan
dalam satu transaksi per berkas, dan dicatat pada tabel `schema_migrations`.

| Migration | Isi |
|---|---|
| `0001_init.sql` | `users`, `threads`, `replies`, `submissions`, `reports`, `moderation_log`, `rate_limits` |
| `0002_submission_rich_body.sql` | kolom `submissions.body_json` (JSONB) |
| `0003_revisions_drafts_bookmarks_notifications.sql` | kategori `lainnya`, `submission_revisions`, `drafts`, `article_bookmarks`, `notifications` |
| `0004_submission_archive.sql` | kolom `submissions.archived_at` (soft archive) |

Seluruh migration bersifat aditif: tidak ada operasi destruktif otomatis.

```bash
npm run db:migrate         # terapkan migration yang tertunda
npm run db:migrate:status  # lihat status tanpa mengubah apa pun
```

Pada Heroku, `release` phase di `Procfile` menjalankan migration sebelum instance
baru menerima trafik. Bila migration gagal, transaksi di-rollback dan deploy
dibatalkan.

---

## Pengujian dan pemeriksaan kualitas

```bash
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm run test              # Vitest: unit + komponen (jsdom)
npm run test:e2e          # Playwright: membangun lalu menguji server produksi
npm run build             # produksi build (next build)
npm run audit:contrast    # audit kontras token WCAG 2.2 AA (terang & gelap)
```

**Prasyarat E2E.** Seluruh berkas E2E memakai PostgreSQL sungguhan, bukan mock,
karena yang diuji adalah persistensi artikel, revisi, draf, bookmark, dan
notifikasi. `playwright.config.ts` memuat `.env.local` lalu berhenti dengan pesan
jelas bila `DATABASE_URL` tidak diset. Arahkan ke database uji **terpisah**, bukan
database produksi:

```bash
DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/saring_test" \
DATABASE_SSL=disable npm run db:migrate && npm run test:e2e
```

Playwright juga menyetel kunci uji resmi Cloudflare Turnstile pada proses web
server, sehingga alur pengiriman benar-benar melewati Siteverify tanpa mengubah
konfigurasi produksi. Autentikasi, CAPTCHA, dan validasi tidak dimatikan.

Rincian cakupan pengujian ada di [docs/TESTING.md](docs/TESTING.md).

---

## Deployment

Target deployment: **Heroku** (Node.js buildpack resmi, aplikasi `saring`) dengan
**Heroku Postgres**, diakses melalui **Cloudflare** pada domain `saring.app`.
Aplikasi berjalan sebagai server Node.js (`next start`), bukan static export.

Ringkasan alur:

1. `heroku create saring` dan tambahkan add-on Heroku Postgres.
2. Setel Config Vars wajib (lihat [variabel lingkungan](#variabel-lingkungan)).
3. `git push heroku main` — Heroku menjalankan `npm ci`, `next build`, lalu release
   phase migration, lalu `npm start`.
4. Tambahkan custom domain di Heroku, baca **DNS Target** dari `heroku domains`,
   lalu arahkan DNS di Cloudflare sesuai nilai tersebut.

### SSL/TLS

Konfigurasi produksi saat ini:

| Komponen | Keterangan |
|---|---|
| Registrar | **Name.com** — nameserver domain diarahkan ke Cloudflare |
| DNS & proxy | **Cloudflare** (record `Proxied`, mode SSL/TLS **Full (strict)**) |
| Hosting | **Heroku**, aplikasi `saring` |
| Sertifikat origin | **Cloudflare Origin CA (RSA)** |

Sertifikat origin dipasang manual ke Heroku, bukan lewat Automated Certificate
Management (ACM). ACM Heroku **tidak** dipakai, karena TLS diterminasi di
Cloudflare dan koneksi Cloudflare → Heroku divalidasi dengan Origin CA.

```bash
# Daftarkan kedua hostname sebagai custom domain pada aplikasi Heroku.
heroku domains:add saring.app -a saring
heroku domains:add www.saring.app -a saring

# Pasang sertifikat Cloudflare Origin CA (RSA) untuk kedua domain sekaligus.
# Berkas sertifikat dan private key dibuat di dashboard Cloudflare
# (SSL/TLS > Origin Server > Create Certificate) dan tidak pernah di-commit.
heroku certs:add <sertifikat-origin-ca.pem> <private-key.key> -a saring
```

Karena satu sertifikat mencakup `saring.app` dan `www.saring.app`, keduanya
memakai sertifikat yang sama. Setelah terpasang, Cloudflare diatur ke
**Full (strict)** agar koneksi ke origin tetap divalidasi.

> Origin CA hanya dipercaya oleh Cloudflare. Jangan mengarahkan DNS langsung ke
> Heroku tanpa proxy Cloudflare selama sertifikat ini yang dipakai.

Konfigurasi yang sudah ada di repositori:

| Berkas | Isi |
|---|---|
| `package.json` | `build: next build`, `start: next start`, `engines.node: 22.x` |
| `Procfile` | `release: node scripts/migrate.mjs`, `web: npm start` |
| `app.json` | metadata aplikasi + buildpack `heroku/nodejs` |
| `next.config.ts` | security header + CSP produksi |

Prosedur lengkap (termasuk batas koneksi pool, Cloudflare, dan domain) ada di
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Membuat administrator pertama

Aplikasi tidak menyertakan akun admin bawaan dan tidak menyimpan kredensial di
repositori. Administrator pertama dibuat dari akun yang sudah terdaftar:

1. **Daftar akun** lewat `/daftar` menggunakan email yang akan dijadikan admin.
2. **Naikkan role** dengan skrip yang membaca `DATABASE_URL`:

   ```bash
   # Lokal
   node scripts/bootstrap-admin.mjs email@contoh.test

   # Heroku
   heroku run node scripts/bootstrap-admin.mjs email@contoh.test -a saring
   ```

3. **Keluar lalu masuk kembali** agar sesi memuat role baru.
4. **Verifikasi** dengan membuka `/admin`. Pengguna biasa akan mendapat 404,
   sehingga tampilnya dashboard menandakan role sudah benar.

Skrip hanya mengubah role akun yang sudah ada; ia tidak membuat akun maupun kata
sandi. Bila email tidak ditemukan, skrip berhenti dan meminta akun didaftarkan
lebih dulu.

---

## Keterbatasan yang diketahui

- Mesin pesan berbasis **aturan heuristik**, bukan detektor penipuan menyeluruh.
  Ia dapat melewatkan pola baru atau menandai pesan sah.
- Pemeriksaan tautan memakai heuristik lokal; `no-match` dari Google Safe Browsing
  bukan bukti aman, dan kegagalan penyedia tidak menghapus hasil lokal.
- Nomor telepon **tidak** memiliki penyedia reputasi. Penilaian nomor disusun dari
  perilaku pengirim yang dilaporkan.
- Pelaporan konten saat ini hanya untuk **pertanyaan dan balasan**; pelaporan
  artikel belum tersedia.
- Notifikasi hanya di dalam aplikasi; belum ada email atau push.
- Artikel Pustaka bersifat edukatif dan tidak menggantikan penanganan resmi.
- Skor Latihan hanya menggambarkan sesi tersebut, bukan kemampuan dunia nyata.
- Seluruh hasil adalah **dukungan keputusan**, bukan bukti kesalahan atau jaminan
  aman.

---

## Lisensi dan tautan

- **Lisensi:** MIT (lihat `license` pada `package.json`).
- **Produksi:** <https://saring.app>
- **Repositori:** publik — <https://github.com/hissyam90/saring-app>
- **Panduan presentasi:** [docs/PANDUAN-PRESENTASI.md](docs/PANDUAN-PRESENTASI.md)
- **Dokumentasi teknis:** [docs/](docs/) — arsitektur, alur data, sumber data,
  keamanan, pengujian, dan deployment.

**Atribusi**

- Ikon oleh [Lucide](https://lucide.dev/) (ISC License).
- Konten edukasi dan contoh pesan bersifat fiktif; organisasi dan URL contoh tidak
  merujuk entitas nyata.
- Sumber pelaporan resmi: OJK (`iasc.ojk.go.id`, `kontak157.ojk.go.id`,
  `ojk.go.id`). Lihat [docs/THIRD-PARTY-NOTICES.md](docs/THIRD-PARTY-NOTICES.md).
