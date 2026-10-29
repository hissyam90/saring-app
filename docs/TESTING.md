# Pengujian

## Peta lapisan pengujian

```mermaid
flowchart LR
  Unit[Unit: engine, URL, nomor, Google Safe Browsing mock] --> Quality[Quality gate]
  Components[Komponen React] --> Quality
  E2E[Playwright desktop + mobile] --> Quality
  Quality --> Build[Production build]
  Build --> CI[GitHub Actions]
```

| Area | File | Status |
|---|---|---|
| Rule engine dan URL | `tests/unit/analysis.test.ts` | Lulus |
| Normalisasi nomor | `tests/unit/phone.test.ts` | Lulus |
| Google Safe Browsing adapter mock | `tests/unit/googleSafeBrowsing.test.ts` | Lulus; live diuji terpisah |
| Decoder protobuf | `tests/unit/gsbProtobuf.test.ts` | Lulus, memakai byte nyata |
| Data Pustaka (14 artikel) | `tests/unit/resources.test.ts` | Lulus |
| Bank skenario dan skor | `tests/unit/scenarios.test.ts` | Lulus |
| Grid Pustaka dan filter | `tests/components/library.test.tsx` | Lulus |
| Simulator dan ringkasan | `tests/components/simulator.test.tsx` | Lulus |
| Rencana tindakan | `tests/components/guide.test.tsx` | Lulus |
| Analyzer dan mode checker | `tests/components/analyzer.test.tsx`, `checker-modes.test.tsx` | Lulus |
| Rute, Pustaka, Latihan, Langkah, mobile | `tests/e2e/app.spec.ts` | Lulus |
| Turnstile (Siteverify) | `tests/unit/turnstile.test.ts` | Lulus |
| Rate limit dan identitas klien | `tests/unit/rate-limit.test.ts` | Lulus |
| Pemeriksaan origin/CSRF | `tests/unit/origin.test.ts` | Lulus |
| Penjaga autentikasi dan role | `tests/unit/guards.test.ts` | Lulus |
| Endpoint moderasi admin | `tests/unit/admin-route.test.ts` | Lulus |
| Endpoint komunitas + CAPTCHA + rate limit | `tests/unit/community-route.test.ts` | Lulus |
| Aturan publikasi artikel | `tests/unit/publication.test.ts` | Lulus |
| Kepemilikan data dan laporan | `tests/unit/ownership.test.ts` | Lulus |
| Validasi & sanitasi konten kaya | `tests/unit/rich-text.test.ts` | Lulus |
| Endpoint pengajuan artikel (konten, IDOR, status) | `tests/unit/submission-route.test.ts` | Lulus |
| Kontrak penyimpanan `body_json` | `tests/unit/article-persistence.test.ts` | Lulus |
| Renderer konten kaya & XSS | `tests/components/rich-content.test.tsx` | Lulus |
| Editor Tiptap: toolbar, format, tautan | `tests/components/rich-text-editor.test.tsx` | Lulus |
| Editor artikel end-to-end (PostgreSQL + Pustaka) | `tests/e2e/article-editor.spec.ts` | Lulus |

## Cakupan editor artikel yang diuji otomatis

- **Ukuran area menulis**: tinggi `#artikel-editor` ≥ 360 px di desktop dan ≥ 280
  px di mobile walaupun dokumen kosong; `max-height: none` dan `overflow-y:
  visible` (tidak ada kotak bergulir sendiri); tinggi bertambah saat tulisan
  memanjang; placeholder tetap tampil.
- Toolbar tampil lengkap dengan label aksesibel, dan `aria-pressed` mengikuti
  format pada posisi kursor.
- Perintah bold/italic/underline/heading/list/blockquote/link benar-benar
  mengubah dokumen editor; shortcut `Ctrl+I` berfungsi.
- Tautan berbahaya (`javascript:`) ditolak di dialog tanpa menyisipkan apa pun;
  URL tanpa protokol otomatis diberi `https://`.
- **Gambar langsung**: disisipkan lewat dialog, benar-benar termuat di browser
  (`naturalWidth > 0`), membawa `referrerpolicy="no-referrer"`, dan URL tidak
  aman (termasuk URL halaman album) ditolak.
- **Embed Imgur**: URL album `https://imgur.com/a/l4mKcOj` menjadi node
  `imgurEmbed` dengan iframe `…/embed?pub=true` yang benar-benar memuat dokumen
  Imgur berisi gambar (diverifikasi lewat frame Playwright). Kode embed resmi
  diurai tanpa menyimpan/menjalankan `<script>`. `data-id` tidak valid dan host
  palsu ditolak.
- **Tempel URL**: menempel satu URL gambar memunculkan tawaran "Jadikan gambar"
  vs "Biarkan sebagai tautan" (diuji dengan clipboard sungguhan).
- Artikel kosong ditolak dengan pesan jelas, dan tidak ada baris database dibuat.
- Media tersimpan di `submissions.body_json` (atribut hanya `src`/`alt` dan
  `id`/`kind`), tetap utuh setelah halaman dimuat ulang, dan tampil di Pustaka
  setelah disetujui — termasuk gambar yang benar-benar termuat dan tautan
  fallback Imgur yang aman.
- Embed yang gagal dimuat tetap menampilkan tautan fallback yang aman.
- `<script>` di dalam teks tetap menjadi teks pada halaman publik.
- Pengguna lain tidak dapat mengubah pengajuan (404), dan artikel final tidak
  dapat diubah (409).
- Editor tidak menimbulkan overflow horizontal pada viewport mobile.

## Cakupan keamanan yang diuji otomatis

- **CAPTCHA**: token kosong/bukan string/terlalu panjang ditolak tanpa memanggil
  jaringan; `success` non-boolean ditolak; action berbeda ditolak; provider error,
  non-200, JSON rusak, dan koneksi gagal menghasilkan penolakan; secret kosong
  fail closed; bypass tidak berlaku di production.
- **Rate limit**: batas tercapai → HTTP 429 dengan `Retry-After`; bucket terpisah
  per klien dan per scope; backend gagal → request ditolak; header IP hanya
  dipercaya pada mode proxy yang dikonfigurasi (nilai aneh jatuh ke `unknown`).
- **Otorisasi**: tanpa sesi → 401; pengguna biasa → 403; role dibaca ulang dari
  database sehingga penurunan role langsung berlaku; admin tidak dapat mengubah
  role akunnya sendiri (409).
- **Publikasi**: pengajuan `pending` tidak tampil; `approved` terbit dengan slug
  unik; `rejected`/`needs_revision` tidak terbit; artikel final tidak dapat
  diubah penulis; penulis lain tidak dapat mengubah pengajuan orang lain.
- **CSRF**: Origin lintas situs, `Sec-Fetch-Site: cross-site`, dan Origin tak
  terurai ditolak.



## Cakupan penting

- **Pustaka**: 14 artikel dengan slug unik, isi substantif, estimasi waktu baca
  yang mengikuti panjang teks, tautan terkait valid, dan seluruh sumber https.
- **Latihan**: 18 skenario, tepat satu opsi bernilai 100 per skenario, mode sesi
  memilih jumlah soal tanpa duplikasi, pengacak deterministik, dan `scoreSession`
  mencakup poin penuh, poin parsial, 0 poin, ringkasan kategori, serta sesi kosong.
- **Rencana tindakan**: lima bagian tampil untuk setiap kondisi, kondisi awal
  dari `?kondisi=`, dan tidak ada janji pengembalian dana.
- **Homepage**: section daftar fitur yang duplikat sudah dihapus dan diganti
  bagian "Kalau sudah terlanjur". Footer memuat batasan, bukan mengulang
  prinsip privasi.
- **Mobile**: tidak ada overflow horizontal pada seluruh rute utama.

## Perintah

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # Vitest: unit + komponen (jsdom)
npm run test:e2e    # Playwright: membangun lalu mengetes server produksi
npm run build       # produksi build
```

## Prasyarat pengujian end-to-end

`tests/e2e/article-editor.spec.ts` memakai **PostgreSQL sungguhan** (dari
`.env.local` / `DATABASE_URL`) dan membuat datanya sendiri dengan awalan unik
(`editor-e2e-…`), lalu menghapusnya kembali di `afterAll`.

- Jalankan `npm run db:migrate` lebih dulu agar kolom `body_json` tersedia.
- `playwright.config.ts` menyetel **kunci uji resmi Cloudflare Turnstile**
  (`1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`) pada
  proses `webServer`, sehingga alur pengajuan benar-benar melewati verifikasi
  Siteverify tanpa mengubah konfigurasi produksi.
- Data uji tidak menyentuh artikel pengguna yang sudah ada; jumlah artikel di
  Pustaka dapat bertambah sementara selama pengujian berlangsung.

## Cakupan

### Unit (`tests/unit/analysis.test.ts`)

Menguji mesin aturan tanpa peramban:

1. Pesan permintaan OTP → temuan `credential-theft`.
2. Biaya rekrutmen → temuan `upfront-payment` beserta penjelasan.
3. Janji untung pasti → temuan `unrealistic-promise`.
4. Pesan netral → klasifikasi `limited-signals`.
5. Input kosong → `isValid: false` + pesan error.
6. Penyebutan "OTP" dalam konteks edukasi → **tidak** ditandai kredensial.
7. URL penyingkat/IP diperiksa **tanpa** memanggil `fetch` (spyon global `fetch`).
8. Instruksi transaksi di luar platform → temuan `risky-instruction`.
9. Klasifikasi multi-sinyal → `many-signals`.
10. Input melebihi batas karakter → error.

### Komponen (`tests/components/`)

- `simulator.test.tsx`. umpan balik bergantung pilihan; urutan lengkap ke ringkasan.
- `guide.test.tsx`. setiap situasi menampilkan panduan yang sesuai; sumber OJK tampil.
- `analyzer.test.tsx`. validasi input kosong; hasil tanpa menulis ke storage.

### End-to-end (`tests/e2e/`)

- `app.spec.ts`. kelima rute dimuat langsung tanpa 404; alur analisis nyata;
  kontrol & pemberitahuan tetap berfungsi di viewport seluler; menu seluler terbuka.

Playwright menjalankan server produksi (`npm run build && npm run start`),
bukan server dev, agar menguji artefak yang benar-benar digunakan saat rilis.

## CI (GitHub Actions)

`.github/workflows/ci.yml` menjalankan pada push/PR:

1. Job `quality`: `npm ci` → lint → typecheck → test → build.
2. Job `e2e` (setelah `quality`): `npm ci` → `playwright install chromium` → `test:e2e`.

## Catatan pemetaan ke daftar QA

- "Pesan dianalisis tidak ditulis ke browser storage" → spy `Storage.setItem` di
  `analyzer.test.tsx` dan menegaskan tidak dipanggil.
- "Tautan diperiksa tanpa difetch" → spy global `fetch` di unit test.
- "Kontrol penting di viewport seluler" → proyek `mobile` Playwright (Pixel 5).