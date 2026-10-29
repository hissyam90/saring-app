# Saring. Pendamping Kepercayaan Digital

> **Berhenti sebentar. Periksa sinyalnya.**
> Belum tentu penipuan. Belum tentu aman. Kenali tandanya sebelum bertindak.

Saring adalah aplikasi web yang membantu anak muda Indonesia mengenali pesan
penipuan daring, memeriksa sinyal URL dengan opsi reputasi Google Safe Browsing setelah
consent, menormalisasi nomor, berlatih mengambil keputusan yang lebih aman, dan
memahami langkah selanjutnya. tanpa akun dan tanpa layanan AI eksternal.

![Homepage Saring](docs/assets/screenshots/homepage-desktop.png)

![Unified checker Saring](docs/assets/screenshots/checker-desktop.png)

![Arsitektur Saring](docs/assets/diagrams/system-overview.svg)

---

## Daftar isi

1. [Masalah dan tujuan](#masalah-dan-tujuan)
2. [Target pengguna](#target-pengguna)
3. [Fitur](#fitur)
4. [Tumpukan teknologi](#tumpukan-teknologi)
5. [Arsitektur](#arsitektur)
6. [Sistem deteksi heuristik](#sistem-deteksi-heuristik)
7. [Privasi dan penanganan data](#privasi-dan-penanganan-data)
8. [Menjalankan secara lokal](#menjalankan-secara-lokal)
9. [Perintah kualitas](#perintah-kualitas)
10. [Deployment](#deployment)
11. [Keterbatasan yang diketahui](#keterbatasan-yang-diketahui)
12. [Atribusi dan lisensi](#atribusi-dan-lisensi)
13. [Tautan](#tautan)

---

## Masalah dan tujuan

Penipuan digital semakin mahir memanfaatkan rasa takut, desakan, janji
berlebihan, dan peniruan pihak resmi. Korban sering kali bertindak sebelum
sempat memeriksa. Saring lahir dari premis sederhana: **keputusan menjadi lebih
aman ketika orang berhenti sejenak dan memeriksa sinyalnya.**

Aplikasi ini adalah **alat bantu pengambilan keputusan**, bukan hakim yang
memutuskan bersalah-tidaknya sebuah pesan. Hasilnya transparan, dapat
dijelaskan, dan disertai langkah lanjutan yang praktis.

## Target pengguna

- Pelajar dan mahasiswa Indonesia.
- Pencari kerja muda (lowongan palsu, biaya rekrutmen).
- Pengguna layanan digital sehari-hari (bank, e-wallet, marketplace).
- Siapa pun yang ingin lebih teliti sebelum membalas pesan mencurigakan.

## Fitur

### 1. Periksa. triase ancaman digital yang dapat dijelaskan

Fitur utama. Pengguna menempelkan pesan, lalu mesin aturan heuristik
menjelaskan sinyal bahaya yang ditemukan, lengkap dengan kategori, tingkat
keparahan, bukti teks, dan langkah selanjutnya.

Hasil dikelompokkan menjadi tiga (tidak pernah "aman"):

- **Banyak sinyal bahaya**
- **Perlu diperiksa lebih lanjut**
- **Sinyal yang ditemukan masih terbatas**

### 2. Latihan: simulasi keputusan dengan skor yang jelas

Bank berisi **18 skenario** yang mencakup permintaan pinjaman dari nomor baru,
permintaan OTP, ancaman pemblokiran akun, lowongan berbiaya, tugas online,
transaksi di luar aplikasi, paket kurir, investasi, giveaway, tautan login,
pemulihan akun, permintaan data pribadi, invoice, QRIS, layanan pelanggan, dan
percakapan normal yang memang tidak mencurigakan.

Tiga mode sesi: **5 soal**, **10 soal**, dan **seluruh bank**. Soal dipilih acak
tanpa duplikasi dalam satu sesi, dengan pengacak deterministik agar pengujian
dapat direproduksi.

Setiap pilihan bernilai **100** (langkah terbaik), **50** (cukup hati-hati tetapi
masih ada celah), atau **0** (berisiko). Nilai ini dijelaskan sebelum sesi
dimulai. Setelah setiap jawaban, pengguna melihat risiko dari pilihannya,
langkah yang seharusnya, dan alasan mengapa langkah itu lebih baik. Ringkasan
akhir menampilkan poin, persentase, jumlah keputusan terbaik, skor per kategori,
soal yang perlu dipelajari ulang, dan tautan ke artikel Pustaka yang relevan.

Skor hanya menggambarkan sesi latihan tersebut, bukan ukuran kemampuan keamanan
digital di dunia nyata.

### 3. Langkah: rencana tindakan kontekstual

Enam kondisi yang bisa dipilih: baru menerima pesan, terlanjur membuka tautan,
sudah memasukkan kata sandi atau OTP, sudah mentransfer uang, akun mungkin
diambil alih, dan sudah membagikan dokumen pribadi.

Setiap kondisi menghasilkan rencana lima bagian: **lakukan sekarang**, **setelah
itu**, **bukti yang perlu disimpan**, **yang perlu diperiksa**, dan **sumber
bantuan resmi**. Halaman ini juga bisa dibuka langsung dari hasil pemeriksaan
lewat `/langkah?kondisi=...`, sehingga pengguna tidak perlu mencari panduan
secara manual.

### 4. Pustaka: 14 artikel dengan halaman baca sendiri

Indeks `/pustaka` menampilkan grid tiga kolom di desktop, dua di tablet, satu di
mobile, lengkap dengan pencarian dan filter kategori. Setiap kartu menampilkan
kategori, judul, ringkasan, dan estimasi waktu baca yang dihitung dari panjang
teks sebenarnya.

Klik kartu membuka halaman artikel tersendiri di `/pustaka/[slug]`, bukan
memperluas isi di tempat. Setiap artikel memuat breadcrumb, dek, waktu baca,
daftar isi, isi berjudul, contoh kasus, langkah praktis, daftar periksa, sumber
rujukan resmi, dan artikel terkait.

### 5. Akun, Komunitas, dan Pustaka kontribusi

Pemeriksaan pesan, nomor, dan tautan tetap bisa dipakai **tanpa akun**. Akun
hanya diperlukan untuk menulis.

- **Akun** (`/daftar`, `/masuk`, `/akun`): registrasi, login, logout, dan daftar
  pertanyaan serta pengajuan artikel milik sendiri beserta status tinjauannya.
- **Komunitas** (`/komunitas`): tanya jawab publik dengan pencarian, filter
  kategori, dan pagination. Pengguna terdaftar dapat membalas dan melaporkan
  konten; admin dapat menyembunyikan konten yang dilaporkan.
- **Pengajuan artikel** (`/komunitas/artikel`): editor rich text (Tiptap) dengan
  format lengkap, pratinjau, dan penghitung karakter. Status: `pending`,
  `needs_revision`, `approved`, `rejected`, lengkap dengan catatan admin. Hanya
  artikel `approved` yang terbit di Pustaka. Artikel yang sudah terbit dapat
  **direvisi** tanpa menghilangkan versi yang sedang tayang.
- **Admin** (`/admin`): ringkasan angka nyata dari database, antrean artikel
  (isi artikel ditinjau dengan formatnya), antrean **revisi** dengan perbandingan
  versi publik vs usulan, laporan, diskusi, dan pengguna. Semua aksi melewati satu
  endpoint yang memeriksa role di server dan mencatat riwayat moderasi.
- **Draf otomatis** (`/akun`): artikel dan pertanyaan disimpan sebagai draf di
  PostgreSQL (debounce 1,2 detik) dan dapat dilanjutkan atau dihapus.
- **Bookmark** (`/akun/tersimpan`): simpan artikel Pustaka (bawaan maupun
  kontribusi) ke akun; tersimpan lintas perangkat dan sesi.
- **Notifikasi** dalam aplikasi: balasan baru, artikel disetujui/perlu
  perbaikan/ditolak, dan keputusan revisi. Tanpa email, SMS, atau WebSocket.
- **Tema tampilan**: Ikuti sistem / Terang / Gelap, dengan kontrol di bagian
  Preferensi tampilan pada halaman akun. Pilihan manual disimpan hanya di
  `localStorage` peramban dan tetap berlaku setelah reload.
- **CAPTCHA**: registrasi, login, diskusi, balasan, artikel, dan laporan memakai
  Cloudflare Turnstile yang diverifikasi di server (Siteverify).

Role minimal `user` dan `admin`. Pengguna baru tidak dapat menaikkan role
sendiri; akun admin pertama dibuat lewat `scripts/bootstrap-admin.mjs` setelah
akun terdaftar. Data disimpan di PostgreSQL dengan migration terlacak.

### 6. Editor artikel (rich text)

Halaman pengajuan artikel memakai editor Tiptap dengan toolbar: paragraf, H2,
H3, tebal, miring, garis bawah, coret, kode sebaris, daftar butir/bernomor,
kutipan, garis pemisah, tautan (sisip/ubah/hapus), **gambar**, **embed Imgur**,
undo, dan redo. Mendukung shortcut `Ctrl+B`/`Ctrl+I`/`Ctrl+U`/`Ctrl+Z`, paste
dari aplikasi lain dengan format yang didukung, placeholder, penghitung karakter,
pratinjau, dan status fokus yang jelas.

Area menulis minimal 380 px di desktop dan 300 px di ponsel, tumbuh mengikuti
panjang tulisan (tanpa kotak bergulir sendiri), sehingga terasa seperti editor
posting forum, bukan textarea.

**Menyisipkan gambar langsung:** klik tombol **Sisipkan gambar**, masukkan URL
berkas gambar HTTPS (mis. `https://i.imgur.com/L0pP68gl.jpg`) beserta teks
alternatif. URL halaman (bukan berkas gambar) ditolak.

**Menyematkan Imgur:** klik **Sematkan Imgur**, lalu masukkan URL album
(`https://imgur.com/a/l4mKcOj`), URL postingan, atau tempel kode embed resmi
Imgur. Album tampil sebagai embed resmi; postingan tunggal tampil sebagai gambar
karena Imgur memblokir iframe halaman postingan. Script di dalam kode embed
diabaikan.

Menempel satu URL gambar/album ke dalam editor memunculkan pilihan: jadikan
media, atau biarkan sebagai tautan biasa.

Konten disimpan sebagai **dokumen JSON tervalidasi** di kolom
`submissions.body_json` (JSONB), dengan kolom `body` tetap berisi proyeksi teks
biasa. Format di luar allowlist dibuang di server; lihat
[docs/SECURITY-AND-PRIVACY.md](docs/SECURITY-AND-PRIVACY.md#media-gambar-langsung-dan-embed-imgur).


## Tumpukan teknologi

- **Next.js 16** (App Router, dijalankan sebagai server Node.js)
- **React 19** dan **TypeScript** (mode `strict`)
- **Tailwind CSS 4**
- **Lucide React** untuk ikon
- **PostgreSQL** dengan driver `pg` (tanpa ORM), migration terlacak
- **Tiptap 3** (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`,
  `@tiptap/extensions`, `@tiptap/extension-image`) untuk editor artikel
- **iron-session** untuk sesi cookie terenkripsi, **bcryptjs** untuk hash kata sandi
- **zod** untuk validasi skema di server
- **Cloudflare Turnstile** untuk CAPTCHA (Siteverify di server)
- **Vitest** + **React Testing Library** untuk pengujian unit/komponen
- **Playwright** untuk pengujian end-to-end
- **ESLint** dan `tsc --noEmit` untuk kualitas kode
- **GitHub Actions** untuk CI
- **Heroku** (Node.js buildpack) + **Cloudflare** untuk deployment dan proteksi

## Arsitektur

```mermaid
flowchart LR
  User[Pengguna] --> App[Next.js App Router]
  App --> Shell[Shell: Nav + Footer]
  App --> Checker[Unified Checker]
  Checker --> Message[Rule engine lokal]
  Checker --> Phone[Penilaian perilaku nomor]
  Checker --> URL[Heuristik URL]
  URL --> Consent[Consent]
  Consent --> Route[Server route]
  Route --> GSB[Google Safe Browsing v5]
  App --> Training[Latihan: 18 skenario]
  App --> Guide[Rencana tindakan]
  App --> Library[Pustaka: indeks + artikel]
  CI[GitHub Actions] --> App
```

Pesan, nomor, dan struktur URL dianalisis lokal. Hanya URL yang dikirim ke
Google Safe Browsing, dan hanya setelah persetujuan eksplisit.

```text
app/                     rute dan titik masuk aplikasi (App Router)
  pustaka/page.tsx       indeks Pustaka (grid + pencarian + filter)
  pustaka/[slug]/page.tsx  halaman artikel (bawaan + kontribusi disetujui)
  langkah/page.tsx       rencana tindakan, menerima ?kondisi=
  masuk/ daftar/ akun/   autentikasi dan halaman akun
  komunitas/             indeks, detail diskusi, form pertanyaan, pengajuan artikel
  admin/                 dashboard: artikel, laporan, diskusi, pengguna
  api/                   auth, community, admin, url-reputation, health
components/              komponen UI bersama dan khusus fitur
  periksa/               checker, hasil pesan, nomor, tautan
  pustaka/library.tsx    grid artikel (bawaan + kontribusi)
  latihan/simulator.tsx  sesi latihan + ringkasan skor
  langkah/guide.tsx      rencana tindakan lima bagian
  auth/ admin/ komunitas/ security/ ui/
lib/analysis/            mesin aturan, tipe, nomor, tautan (logika murni)
lib/reputation/          adapter Google Safe Browsing + decoder protobuf
lib/db/                  abstraksi Store: postgres.ts, memory.ts, migrations/
lib/auth/                sesi (iron-session), hash kata sandi, penjaga role
lib/security/            validasi zod, rate limit, Turnstile, pemeriksaan origin
data/                    artikel, skenario, panduan, contoh pesan
scripts/                 migrate.mjs, bootstrap-admin.mjs
proxy.ts                 pengalihan awal halaman privat (bukan otorisasi)
tests/                   unit, komponen, dan e2e
docs/                    dokumentasi teknis
```

Logika domain (`lib/analysis`) sepenuhnya **murni dan deterministik**. tidak
ada pemanggilan jaringan. sehingga dapat diuji tanpa peramban. Komponen UI
hanya memanggil fungsi tersebut dan menampilkan hasilnya.

Lihat [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) untuk penjelasan lebih rinci.

## Sistem deteksi heuristik

Mesin aturan menilai pesan berdasarkan tujuh kategori sinyal:

1. **Pencurian kredensial**. permintaan OTP, PIN, kata sandi, atau kode verifikasi.
2. **Desakan & intimidasi**. ancaman pemblokiran akun atau tenggat sempit.
3. **Permintaan pembayaran di muka**. biaya rekrutmen/administrasi/klaim.
4. **Janji tidak realistis**. untung pasti, tanpa risiko, iming-iming hadiah.
5. **Tautan mencurigakan**. penyingkat URL, alamat IP mentah, atau `http://`.
6. **Indikasi peniruan pihak resmi**. klaim otoritas atau domain mirip resmi.
7. **Instruksi percakapan berisiko**. pindah kanal atau melewati verifikasi.

Setiap aturan memiliki bobot (tinggi/sedang/rendah = 40/25/15). Skor sinyal
dijumlahkan (maksimum 100) dan dipetakan ke klasifikasi.

Ketentuan penting:

- Aturan **memperhatikan konteks**. Menyebut kata "OTP" dalam konteks edukasi
  (mis. *"jangan pernah bagikan OTP"*) tidak ditandai sebagai permintaan
  kredensial; dibutuhkan kata kerja permintaan di dekatnya.
- Tidak semua domain asing, ejaan tidak lazim, URL `http`, atau pesan asing
  otomatis dicap penipuan.
- **Skor bukan peluang penipuan.** Angka ini hanyalah total bobot indikator
  yang dikenali oleh aturan heuristik. bukan probabilitas statistik.

Setiap temuan menampilkan judul, penjelasan, kategori, tingkat keparahan, bukti
teks (bila ada), dan langkah praktis berikutnya. Hasil selalu menyertakan
pengingat:

> Tidak ditemukannya sinyal bahaya bukan berarti pesan ini aman. Analisis ini
> menggunakan aturan heuristik dan dapat melewatkan pola penipuan maupun
> menandai pesan yang sebenarnya sah.

## Pustaka, Latihan, dan Rencana Tindakan

- **Pustaka**: 14 artikel di `data/resources.ts`, masing-masing dengan kategori,
  ringkasan, 4 sampai 6 bagian berjudul, daftar periksa, sumber resmi, dan
  tautan artikel terkait. Waktu baca dihitung dari jumlah kata sebenarnya
  (`readingMinutes`), bukan angka tetap.
- **Latihan**: 18 skenario di `data/scenarios.ts`. Setiap pilihan punya nilai
  poin eksplisit (100/50/0), risiko, langkah yang seharusnya, dan alasannya.
  `pickSessionScenarios` memilih soal tanpa duplikasi memakai pengacak
  deterministik (`createRandom`), sehingga urutan dapat direproduksi pada
  pengujian. `scoreSession` menghitung poin, persentase, jumlah keputusan
  terbaik, skor per kategori, dan daftar soal yang perlu dipelajari ulang.
- **Rencana tindakan**: `data/guides.ts` menyimpan enam kondisi, masing-masing
  dengan langkah berprioritas (`segera`, `penting`, `lanjutan`), daftar bukti,
  daftar hal yang perlu diperiksa (`checks`), dan sumber bantuan resmi.
  Halaman `/langkah` menerima `?kondisi=` sehingga hasil pemeriksaan bisa
  menautkan langsung ke kondisi yang relevan.

Semua state latihan dan pilihan kondisi hanya berada di memori peramban. Tidak
ada yang dikirim ke server.

## Privasi dan penanganan data

| Input | Pemrosesan | Dikirim keluar | Penyimpanan |
|---|---|---|---|
| Pesan | Browser | Tidak | Memori sementara |
| URL heuristik | Browser | Tidak | Memori sementara |
| URL reputasi | Route server setelah consent | Google Safe Browsing | Tidak disimpan aplikasi |
| Nomor | Browser | Tidak pada mode default | Memori sementara |
| Akun (email, nama tampilan, hash kata sandi) | Server | Tidak | PostgreSQL |
| Konten komunitas, artikel, laporan | Server | Tidak | PostgreSQL |
| Token CAPTCHA | Server | Cloudflare Siteverify | Tidak disimpan |

Fitur pemeriksaan tidak memerlukan akun. Data akun hanya dibuat bila pengguna
mendaftar untuk menulis di Komunitas atau mengajukan artikel. Isi halaman
Periksa tidak pernah dikirim ke server maupun disimpan.


Privasi adalah persyaratan produk, bukan fitur tambahan:

- Analisis pesan berjalan **sepenuhnya di peramban** melalui aturan deterministik lokal.
- Pesan yang ditempelkan **tidak pernah** dikirim ke server, penyedia AI, layanan
  analitik, log, atau pihak ketiga.
- Isi pesan **tidak disimpan** di `localStorage`, `sessionStorage`, cookie, database,
  atau log.
- Tidak ada pelacakan/analitik secara bawaan.
- Fitur pemeriksaan tidak memerlukan akun, email, nomor telepon, atau data pribadi.

Lihat [docs/SECURITY-AND-PRIVACY.md](docs/SECURITY-AND-PRIVACY.md) untuk detail,
termasuk kebijakan header keamanan dan variabel lingkungan.

## Menjalankan secara lokal

Prasyarat: **Node.js 22** dan **npm**.

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

Fitur pemeriksaan berjalan tanpa konfigurasi apa pun. Untuk fitur akun,
Komunitas, dan admin, siapkan PostgreSQL:

```bash
# salin contoh lalu isi nilainya (jangan commit .env.local)
cp .env.example .env.local

npm run db:migrate          # terapkan migration terlacak
npm run db:migrate:status   # lihat migration yang sudah/belum jalan
npm run dev
```

Tanpa `DATABASE_URL`, aplikasi memakai penyimpanan **in-memory** pada
development (data hilang saat server restart) agar tetap dapat dijalankan dan
diuji. Pada production, `DATABASE_URL` wajib: tanpa itu aplikasi menolak
melayani data (fail closed).

Untuk menguji form berisiko tanpa Cloudflare Turnstile, set
`SARING_TURNSTILE_BYPASS=1` di `.env.local` (hanya berlaku di luar production).

> Catatan: pada mode pengembangan (`next dev`), header CSP tidak aktif karena
> runtime pengembangan membutuhkan `eval`/inline script. CSP aktif pada build
> produksi (`next start`).

## Perintah kualitas

```bash
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm run test              # Vitest (unit + komponen)
npm run test:e2e          # Playwright (membangun & mengetes server produksi)
npm run build             # produksi build (next build)
npm run db:migrate        # terapkan migration PostgreSQL yang tertunda
npm run db:migrate:status # lihat status migration
```

## Deployment

Target deployment adalah **Heroku** (Node.js buildpack resmi), bukan static
export. Aplikasi dijalankan sebagai server Node.js.

Ringkasan langkah (lihat selengkapnya di [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)):

1. Pastikan akun Heroku memiliki CLI (`heroku login`).
2. `heroku create saring-app` (nama disesuaikan) dan tambahkan add-on
   `heroku-postgresql`.
3. `git push heroku main`. Heroku mendeteksi `heroku/nodejs`, menjalankan
   `npm ci` (lockfile `package-lock.json`) lalu `npm run build`.
4. `release: node scripts/migrate.mjs` (dari `Procfile`) menerapkan migration
   database sebelum dyno baru menerima trafik.
5. `web: npm start` (dari `Procfile`) menyajikan `next start` yang menyesuaikan
   `PORT` dari Heroku.

- `engines.node` sudah dipatok ke `22.x`.
- Paket dikunci dengan `package-lock.json` (npm).
- Aplikasi memerlukan **PostgreSQL** (`DATABASE_URL`) pada production; tanpa itu
  aplikasi menolak melayani data (fail closed). Lihat
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) untuk migration, variabel lingkungan,
  Cloudflare, dan domain Name.com.

Hubungkan domain kustom (jika tersedia): tambahkan domain di Heroku lalu
arahkan DNS mengikuti **target yang diberikan Heroku** untuk aplikasi tersebut
(jangan menebak nilai DNS. lihat `heroku domains` / `heroku domains:add`).

## Keterbatasan yang diketahui

- Mesin pesan berbasis **aturan heuristik**, bukan detektor penipuan
  menyeluruh. Ia dapat melewatkan pola baru atau menandai pesan sah.
- Pemeriksaan tautan memakai heuristik lokal dan dapat mengirim URL ke Google
  Safe Browsing hanya setelah consent. `no-match` bukan bukti aman, dan
  kegagalan provider tidak menghapus hasil lokal.
- Nomor telepon **tidak** memiliki provider reputasi. Penilaian nomor disusun
  dari perilaku pengirim yang dilaporkan pengguna.
- Artikel Pustaka bersifat edukatif dan tidak menggantikan penanganan resmi.
- Skor Latihan hanya menggambarkan sesi tersebut, bukan kemampuan dunia nyata.
- Hasil adalah **dukungan keputusan**, bukan bukti kesalahan atau jaminan aman.

## Atribusi dan lisensi

- Ikon oleh [Lucide](https://lucide.dev/) (ISC License).
- Konten edukasi dan contoh pesan bersifat **fiktif**; organisasi dan URL contoh
  tidak merujuk entitas nyata.
- Sumber pelaporan resmi: OJK (`iasc.ojk.go.id`, `kontak157.ojk.go.id`,
  `ojk.go.id`).

## Tautan

- **Demo langsung:** `<!--LIVE_URL-->`
- **Video demonstrasi:** `<!--DEMO_VIDEO_URL-->`
- **Repositori publik:** `<!--REPO_URL-->`

> Penanda di atas sengaja dikosongkan dan akan diisi setelah deployment serta
> video demonstrasi benar-benar tersedia.