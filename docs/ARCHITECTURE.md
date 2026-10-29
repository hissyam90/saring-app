# Arsitektur

> **Status:** seluruh isi dokumen ini menggambarkan implementasi yang ada di repositori. **Google Safe Browsing v5** adalah provider reputasi URL melalui route server. Tidak ada provider reputasi nomor yang aktif.

![Diagram arsitektur Saring: lapisan browser, server Next.js, dan layanan eksternal](assets/diagrams/system-overview.svg)

Sumber diagram: [`assets/diagrams/system-overview.svg`](assets/diagrams/system-overview.svg).

Ringkasnya: **Checker** dan **`lib/analysis`** dieksekusi di peramban tanpa jaringan. Server Next.js hanya menangani `POST /api/url-reputation` (consent + validasi) yang memanggil adapter **Google Safe Browsing v5**. Sumber lain (AduanNomor, OJK) adalah *handoff* manual: pengguna menyalin data dan membuka situsnya sendiri.

## Gambaran umum

Saring menggunakan **Next.js 16 App Router** dengan pemisahan yang jelas antara
UI, logika domain, konten, validasi, dan pengujian.

Fitur pemeriksaan (Periksa) tetap berjalan di peramban tanpa database. Sejak
fitur akun, Komunitas, dan Pustaka kontribusi ditambahkan, aplikasi juga memiliki:

- **PostgreSQL** sebagai database utama (driver `pg`, tanpa ORM), diakses melalui
  abstraksi `Store` di `lib/db/` dengan dua implementasi: `postgres.ts` (produksi)
  dan `memory.ts` (development/pengujian).
- **Autentikasi** berbasis cookie terenkripsi `iron-session` + hash bcrypt, dengan
  role `user`/`admin` yang selalu diverifikasi ulang di server.
- **Migration terlacak** di `lib/db/migrations/` yang dijalankan release phase
  Heroku. `0002_submission_rich_body.sql` menambahkan kolom `body_json` (JSONB)
  untuk dokumen artikel kaya; kolom `body` tetap menyimpan proyeksi teks biasa
  sehingga artikel lama tidak berubah.
- **Cloudflare Turnstile** untuk form berisiko, diverifikasi server-side.
- **Tiptap** untuk editor artikel; kontennya divalidasi terhadap allowlist lalu
  dirender menjadi elemen React (tanpa HTML mentah).

Tidak ada backend terpisah, layanan AI eksternal, atau database kedua.

```
app/               rute & titik masuk
  layout.tsx       kerangka global (Nav + Footer), metadata, lang="id"
  page.tsx         beranda (hero + analyzer + fitur + prinsip)
  periksa/page.tsx   fitur Periksa
  latihan/page.tsx   fitur Latihan
  langkah/page.tsx   fitur Langkah
  pustaka/page.tsx   fitur Pustaka
  not-found.tsx      halaman 404

components/
  nav.tsx           sidebar desktop + drawer mobile (client)
  footer.tsx        footer (server)
  periksa/checker.tsx      segmented control 3 mode (client)
  periksa/analyzer.tsx     mode pesan: input + status (client)
  periksa/result-view.tsx  laporan hasil pesan (presentational)
  periksa/phone-check.tsx  mode nomor: input + normalisasi (client)
  periksa/phone-result.tsx tampilan hasil nomor (presentational)
  periksa/link-check.tsx   mode tautan: heuristik + consent (client)
  latihan/simulator.tsx    simulator keputusan (client)
  langkah/guide.tsx        panduan tindakan (client)
  pustaka/library.tsx      pustaka + pencarian (client)

app/api/url-reputation/route.ts   route server: consent + validasi + adapter

lib/analysis/       logika domain MURNI (tanpa React, tanpa jaringan)
  types.ts          tipe & label (Severity, Finding, AnalysisResult, …)
  url.ts            ekstraksi & inspeksi URL sebagai string
  link.ts           inspeksi tautan mendalam (userinfo, TLD, subdomain)
  phone.ts          normalisasi nomor Indonesia → domestik & E.164
  phoneReputation.ts status hasil nomor + jalur tanpa provider
  engine.ts         mesin aturan heuristik + klasifikasi
  index.ts          barrel export

lib/reputation/
  googleSafeBrowsing.ts  adapter server GSB v5: status, cache, atribusi
  protobuf.ts            decoder wire format untuk respons x-protobuf
  phishtank.ts           LEGACY, tidak dipakai runtime

data/               konten fiktif & edukasi yang ditinjau
  examples.ts       6 contoh pesan fiktif
  scenarios.ts      8 skenario latihan
  guides.ts         6 panduan tindakan + sumber OJK
  resources.ts      7 artikel pustaka

tests/              unit (tests/unit), komponen (tests/components), e2e (tests/e2e)
docs/               dokumentasi
```

## Mesin aturan (`lib/analysis`)

Inti produk adalah fungsi murni dan deterministik:

- `analyzeText(text): AnalysisResult`. validasi input, jalankan 7 kategori
  aturan, kumpulkan temuan, hitung skor, dan pilih klasifikasi.
- `extractUrls(text): DetectedUrl[]`. menemukan URL tanpa pernah mengaksesnya.

Setiap aturan mengembalikan satu atau beberapa `Finding` berisi: `category`,
`severity`, `title`, `explanation`, `evidence`, dan `nextStep`.

### Kategori aturan

| Kategori | Contoh sinyal | Bobot tertinggi |
| --- | --- | --- |
| credential-theft | permintaan OTP/PIN/kata sandi | tinggi |
| urgency-intimidation | ancaman blokir akun, tenggat sempit | tinggi |
| upfront-payment | biaya rekrutmen/administrasi/klaim | tinggi |
| unrealistic-promise | untung pasti, tanpa risiko, klaim hadiah | tinggi |
| suspicious-link | penyingkat URL, alamat IP, `http://` | sedang |
| impersonation | klaim otoritas, domain mirip resmi | sedang |
| risky-instruction | pindah kanal, lewati escrow/verifikasi | tinggi |

### Konteks & pengurangan positif palsu

Beberapa aturan dilengkapi penjaga konteks (`jangan`, `jangan pernah`,
`hindari`, …) agar pernyataan edukatif yang menyebut kata kunci tidak ditandai
sebagai permintaan. Aturan kredensial juga mensyaratkan **kata kerja
permintaan** di dekat kata kunci.

### Skor & klasifikasi

Bobot per keparahan: tinggi = 40, sedang = 25, rendah = 15. Skor = jumlah bobot
temuan (dibatasi 100), lalu dipetakan:

- ≥ 60 → `many-signals` ("Banyak sinyal bahaya")
- ≥ 25 → `needs-review` ("Perlu diperiksa lebih lanjut")
- < 25 → `limited-signals` ("Sinyal yang ditemukan masih terbatas")

Skor bukan probabilitas penipuan. hanya total bobot indikator.

## Komponen UI

Komponen feature adalah *client components* (`"use client"`) dengan state lokal
sederhana. `lib/analysis` adalah modul murni yang di-bundle ke klien.

Satu-satunya pemanggilan jaringan dari klien adalah `POST /api/url-reputation`
di `link-check.tsx`, dan hanya ketika pengguna mencentang consent. Mode pesan
dan mode nomor tidak pernah memanggil jaringan.

## Pustaka: indeks dan halaman artikel

- `app/pustaka/page.tsx` memuat header lalu `<Library />`.
- `components/pustaka/library.tsx` adalah client component: pencarian teks,
  filter kategori, dan grid responsif (1 kolom mobile, 2 tablet, 3 desktop).
  Kartu pertama ditampilkan lebih besar saat filter berada di keadaan awal.
- `app/pustaka/[slug]/page.tsx` adalah server component dengan
  `generateStaticParams` (14 halaman diprerender saat build),
  `generateMetadata`, dan `notFound()` untuk slug tidak dikenal.
  `params` dibaca sebagai Promise sesuai Next.js 16.
- Konten berada di `data/resources.ts`. Tipe `ResourceArticle` memisahkan data
  dari tampilan. `readingMinutes` menghitung estimasi dari jumlah kata nyata.

## Latihan: bank skenario dan penilaian

- `data/scenarios.ts` memuat `SCENARIOS` (18 objek), `SESSION_MODES`
  (5/10/semua), `createRandom` (mulberry32), `pickSessionScenarios`, dan
  `scoreSession`.
- `components/latihan/simulator.tsx` mengelola fase `intro`, `question`, dan
  `summary` dengan state lokal. Tidak ada persistensi.
- Seed diturunkan dari mode sesi sehingga E2E dapat diandalkan.

## Rencana tindakan

- `data/guides.ts` memuat enam kondisi. Setiap kondisi punya `steps`
  (prioritas), `evidenceChecklist`, `checks`, dan `resources`.
- `app/langkah/page.tsx` membaca `searchParams` (Promise di Next.js 16) dan
  meneruskan `initialSituation` ke `<Guide />`.
- `components/langkah/guide.tsx` menampilkan lima bagian berurutan.
- `components/periksa/result-view.tsx` menautkan ke
  `/langkah?kondisi=received-message`.

## Pemeriksaan URL yang aman

Tiga tingkat yang dipisahkan dengan jelas:

1. `extractUrls` / `inspectUrl` (`lib/analysis/url.ts`). ekstraksi sederhana
   untuk menemukan tautan di dalam pesan.
2. `inspectLink` (`lib/analysis/link.ts`). inspeksi struktural: skema,
   userinfo, alamat IP, penyingkat, TLD tidak lazim, subdomain meniru merek.
3. `lookupGoogleSafeBrowsing` (`lib/reputation/googleSafeBrowsing.ts`). reputasi eksternal,
   hanya lewat route server dan hanya setelah consent. Respons dibaca sebagai
   protobuf oleh `lib/reputation/protobuf.ts`.

Ketiganya **tidak pernah** membuka, mengikuti redirect, mengunduh, atau
menjalankan isi URL. Status eksternal dibedakan menjadi `match`, `no-match`,
`rate-limited` (HTTP 509), dan `unavailable`; `no-match` bukan bukti aman.