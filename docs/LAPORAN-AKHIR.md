# Laporan Akhir — Saring

Laporan akhir kompetisi **Trust Trap**. Seluruh isi diturunkan dari implementasi
dan hasil pengujian yang **benar-benar dijalankan** di repositori ini pada
9–10 November 2026. Tidak ada hasil usability, dataset independen eksternal,
benchmark, atau status pengujian yang dikarang.

---

## A. Ringkasan Pekerjaan

Saring adalah pendamping kepercayaan digital berbahasa Indonesia yang membantu
orang **mengambil jeda** saat menerima pesan, nomor, atau tautan mencurigakan:
ia menjelaskan sinyal penipuan, mengutip bukti teks, dan memberi urutan tindakan
aman. Fitur utama:

- **Periksa** (pesan/nomor/tautan) — analisis heuristik deterministik, seluruhnya
  berjalan di peramban pengguna.
- **Latihan** — sesi skenario untuk membangun kebiasaan memutuskan.
- **Langkah** — panduan tindakan terurut setelah insiden (transfer, kredensial
  bocor, dll.), merujuk kanal resmi (OJK, IASC, AduanNomor Komdigi).
- **Pustaka** — artikel kontribusi yang dimoderasi, dengan catatan sumber.
- **Komunitas** — diskusi dan ruang tanya jawab.

Delapan fase yang diminta selesai dikerjakan: (1) mesin deteksi, (2) validitas uji
dark mode, (3) paket usability, (4) UX mobile, (5) performa & keamanan,
(6) presentasi, (7) pengujian final, dan (8) laporan final ini.

Prinsip yang menjiwai seluruh pengerjaan adalah **kejujuran metodologi**: angka
tidak dipoles agar test hijau. Yang tidak bisa dibuktikan dinyatakan sebagai
batasan (Bagian J), dan skor pemeriksaan bukan probabilitas (Bagian B). Karena
itu aplikasi **tidak pernah memberi label "aman"**.

---

## B. Peningkatan Mesin Deteksi

Mesin analisis (`lib/analysis/engine.ts` + `context.ts`, `link.ts`,
`socialEngineering.ts`) adalah aturan heuristik deterministik — bukan model
bahasa/AI. Hasilnya adalah daftar temuan berkategori dengan keparahan
(`high`/`medium`/`low`), sebuah skor, dan klasifikasi.

### Skor = jumlah bobot indikator, bukan probabilitas

`lib/analysis/types.ts` mendefinisikan `SEVERITY_WEIGHT = { high: 40, medium: 25,
low: 15 }`. Skor = jumlah bobot temuan yang sudah dideduplikasi, dibatasi 100
(`engine.ts: Math.min(100, …)`). Klasifikasi memakai ambang tetap: ≥70 =
"banyak sinyal", 35–69 = "perlu ditinjau", <35 = "sinyal terbatas". Satu angka
tidak pernah diklaim sebagai peluang penipuan; setiap temuan menampilkan kutipan
teks dan alasan agar pengguna dapat menilai sendiri.

### Log perubahan (14 aturan, Fase 1)

Sebagian besar perbaikan diturunkan **hanya** dari subset development +
validation, diikuti unit test baru, tanpa menala pada holdout. **Dua pengecualian**
menyentuh holdout, keduanya diungkapkan secara eksplisit di Bagian C dan
`docs/EVALUASI-ANALISIS.md` §4.3: (a) aturan `upfront-payment` yang menambah
kosakata `komisi undian`/`biaya kirim voucher` memakai frasa yang hanya muncul
pada kasus holdout `hold-prize-01` (#8), dan (b) perbaikan *false negative* biner
ancaman pemutusan layanan ber-tenggat dipicu oleh pengamatan pada `hold-threat-01`
(#13, aturan generik + kasus negatif). Rincian lengkap (alasan + berkas + efek)
ada di §4.1 dokumen tersebut. Ringkasannya:

| # | Perubahan |
|---|---|
| 1–2 | Pola kredensial `token` (variasi OTP/pemulihan) dan kata kerja `bagi(kan)` |
| 3 | Daftar peniruan kementerian/pemerintah untuk `impersonation` |
| 4 | Penanda `resmi|official|asli` pada penilaian domain tiruan |
| 5–6 | Pola desakan waktu tambahan + eskalasi (tekanan waktu + perintah bayar → `medium`) |
| 7–8 | Eskalasi iming-iming hadiah + aksi; pungutan pencairan hadiah (catatan: sebagian kosakata #8 berasal dari holdout, lihat Bagian C) |
| 9 | `rek`/`rek bank` sebagai penanda instruksi transfer di luar kanal resmi (dari `val-risky-01`) |
| 10 | Penjaga *reported speech* pada permintaan uang (edukasi tidak ditandai) |
| 11 | Perluasan konteks protektif ("petugas tidak pernah menelepon…") |
| 12 | `upfront-payment` dipersempit untuk menghilangkan *false positive* |
| 13 | Ancaman **pemutusan layanan** ("layanan dicabut/dihentikan", "layanan Anda kami cabut") dengan kasus negatif; pemicunya `hold-threat-01` (lihat Bagian C) |
| 14 | **Penjaga *false positive*** pada pemutusan layanan & desakan waktu: pemberitahuan sah (`LEGIT_SERVICE_NOTICE` — pemeliharaan/`sementara`/`sesuai ketentuan`/hari libur), kanal resmi (`OFFICIAL_CHANNEL` — "bayar lewat aplikasi resmi"), serta pelaporan/edukasi lintas-klausa (`isReportedContext`) |

Unit test untuk seluruh aturan ini ada di `tests/unit/engineImprovements.test.ts`
(30 test). Sebelumnya 4 *false negative* development dan 5 validation berhasil
dipulihkan tanpa menambah *false positive*; holdout yang semula memiliki 1 FN
biner kini bebas FN. Tinjauan ulang Fase 2 menemukan aturan #13 semula **terlalu
luas** (empat *false positive* nyata: pemberitahuan pemeliharaan, penonaktifan
sementara, penagihan sesuai ketentuan, dan kalimat edukasi/pelaporan yang
meneruskan ancaman sebagai kutipan) yang diperbaiki oleh #14, tanpa mengubah
angka biner dev/val/holdout.

---

## C. Pengujian Independen

Kualitas deteksi diukur oleh evaluasi yang **benar-benar dijalankan** oleh
`tests/unit/analysisEval.test.ts`, dengan tiga subset terpisah di
`tests/fixtures/analysis-dataset.ts` dan metrik di `tests/fixtures/eval-metrics.ts`.

> **Kejujuran terpenting:** ini adalah evaluasi terhadap dataset kurasi di dalam
> repositori, **bukan** dataset independen eksternal. Subset *development*
> dipakai untuk menemukan/memperbaiki aturan, sehingga hasilnya bukan
> generalisasi. Subset *validation* dipakai untuk memantau regresi (dan sebagian
> aturan memang diturunkan darinya, yang sah). Subset *holdout* dimaksudkan
> sebagai uji independen, tetapi **audit integritas menemukan dua hal yang
> membatalkan status *blind*-nya**: satu aturan menyerap kosakata khas holdout,
> dan satu *false negative* holdout sengaja diperbaiki berdasarkan pengamatan
> padanya — lihat "Status independensi holdout" di bawah.

| Subset | n (non-ambigu) | Presisi | Recall | F1 | Akurasi |
|---|---:|---:|---:|---:|---:|
| development (dipakai tuning) | 84 | 100% | 100% | 100% | 100% |
| validation (dipakai memantau/tuning lanjutan) | 20 | 100% | 100% | 100% | 100% |
| **holdout (dimaksudkan independen — tidak sepenuhnya blind)** | 23 | **100%** | **100%** | **100%** | **100%** |

### Status independensi holdout

Perbedaan "78,6% → 100%" adalah **dataset yang sama** di bawah aturan lama vs
aturan baru, bukan dua dataset berbeda. Tiga kasus yang berubah dari FN menjadi TP:

- `hold-risky-01` ("…transfer DP ke rek atas nama saya") — diperbaiki oleh pola
  `rek`/`rek bank` yang **dapat ditelusuri ke `val-risky-01`** ("rek Bank").
  Ini efek samping yang sah, diturunkan dari validation.
- `hold-prize-01` ("…komisi undian… bayar biaya kirim voucher…") — diperbaiki oleh
  pola `upfront-payment` yang menambah `komisi undian` / `biaya kirim/pengiriman
  voucher`. Frasa ini **tidak muncul pada development maupun validation sama
  sekali**, dan diuji eksplisit di `tests/unit/engineImprovements.test.ts`.
  Satu-satunya sumbernya adalah teks `hold-prize-01` itu sendiri.
- `hold-threat-01` ("…dalam 2 jam, layanan Anda kami cabut permanen") — diperbaiki
  oleh aturan **generik** pemutusan layanan (verba `cabut`/`dihentikan` pada objek
  `layanan`), disertai kasus negatif. Aturannya valid secara umum, tetapi
  pemicunya adalah pengamatan pada kasus holdout ini.

Karena itu **hasil holdout tidak boleh disebut evaluasi *blind***: kosakata satu
contoh telah tertanam ke dalam aturan, dan satu FN diperbaiki atas dasar kasus
tersebut. Recall 100% tetap berguna sebagai penangkap regresi, tetapi bukan bukti
generalisasi independen. Rincian penuh di `docs/EVALUASI-ANALISIS.md` §4.3,
beserta protokol pengumpulan dataset baru yang benar-benar belum tersentuh
(§7 dokumen tersebut).

### False negative biner diperbaiki; celah level kategori tetap ada

Sebelum perbaikan terakhir, `hold-threat-01` lolos sebagai *false negative* biner
(ancaman pemutusan layanan ber-tenggat). Setelah ditambah aturan pemutusan
layanan, **tidak ada lagi FN biner** pada holdout. Yang tersisa adalah celah
**level kategori** yang tidak mengubah keputusan biner (karena kategori lain
sudah menandai bahaya): *desakan & intimidasi* recall 1/3 (`hold-link-01`,
`hold-imp-02`), *pembayaran di muka* 3/4 (`hold-risky-01`), *peniruan pihak
resmi* 1/2 (`hold-imp-01`), serta satu kelebihan sinyal `money-request` pada
`hold-imp-01`. Rincian di `docs/EVALUASI-ANALISIS.md` §4.2.

Pintu regresi ditegakkan di dalam test: development mensyaratkan presisi/recall/
akurasi biner ≥ 0,90; validation & holdout mensyaratkan lantai biner recall
≥ 0,50 dan presisi ≥ 0,70 (ukuran sampel kecil, sehingga ambang per-kategori
tidak bermakna).

---

## D. Pengujian Usability

**Belum ada pengujian dengan peserta manusia.** Kami tidak mengklaim "sudah diuji
N pengguna" dan tidak memakai angka SUS atau kemudahan yang belum dikumpulkan.

Yang sudah dikerjakan adalah **paket pelaksanaan lengkap yang siap dijalankan**
(`docs/USER-TESTING.md` §5):

- Peran (fasilitator + pengamat), durasi, peralatan, dan butir persetujuan.
- Lima tugas terskenario (periksa pesan → pahami hasil → periksa tautan →
  latihan → penanganan insiden), dengan materi fiktif yang aman.
- Kuesioner pasca-sesi dengan **dua metrik terpisah**: kemudahan per tugas
  (1–7) dan **SUS 10 butir pada skala 1–5** dengan rumus penghitungan yang benar
  (butir ganjil = nilai − 1; genap = 5 − nilai; jumlah × 2,5).
- Template observasi, pencatatan, dan panduan interpretasi.

Catatan jujur: terjemahan Bahasa Indonesia SUS belum tervalidasi psikometrik
(belum ada *back-translation* atau uji reliabilitas); hal ini dinyatakan di dalam
dokumen agar tidak diklaim sebagai SUS tervalidasi.

Pemeriksaan UX yang memang selesai dikerjakan adalah evaluasi heuristik,
penelusuran terpandu, dan pengujian otomatis (Bagian E).

---

## E. UX dan Aksesibilitas

Seluruh pengujian di bawah adalah **otomatis dan terukur**, bukan klaim kosong.

- **Responsif mobile** — `tests/e2e/responsive.spec.ts` memastikan tidak ada
  *overflow horizontal* `body`/`html`/kontainer pada semua halaman publik, akun,
  dan admin di viewport sempit; drawer navigasi pekat + mengunci scroll + dapat
  dijangkau lewat keyboard; dropdown admin tanpa geser horizontal; halaman tetap
  di dalam frame pada 320px.
- **Aksesibilitas** — *skip-link* yang terlihat saat fokus; pengumuman hasil
  kepada pembaca layar (`aria-live`); dukungan `prefers-reduced-motion`; kontrol
  dan formulir diberi label.
- **Keterbacaan** — kontras teks dirender dan diukur terhadap WCAG 2.2 AA
  (4.5:1 normal, 3:1 teks besar) pada mode terang & gelap (Bagian F).

---

## F. Audit Dark Mode

Mode gelap diterapkan **sebelum first-paint** melalui skrip sebaris sinkron di
`app/layout.tsx` + `lib/theme.ts` (`THEME_INIT_SCRIPT`). Pengujian kilatan di
`tests/e2e/contrast.spec.ts` mengukur waktu pemasangan `data-theme` terhadap
`first-paint` (lihat `installThemeMarks`).

Poin metodologi yang diperbaiki agar **jujur**: waktu *paint* dicatat memakai
`entry.startTime` (timestamp paint yang sebenarnya), bukan `performance.now()`
pada callback observer. Waktu callback dicatat terpisah sebagai `paintCallbackAt`
— murni diagnostik dan **tidak** dipakai assertion — karena memakai waktu
callback akan mengesahkan kilatan (tema bisa terpasang setelah paint tetapi
tetap lolos).

Hasil:

- Test "pengunjung baru tidak melihat kilatan dark mode" dan "tema diterapkan
  sebelum first-paint (tanpa kilatan)" lulus pada Chromium dan mobile, diputar
  berulang (16× + 10×) tanpa flake.
- Preferensi tema (light/dark/system) diuji menang atas sistem, bertahan setelah
  *reload*, dan tidak dikirim ke server/tidak memakai cookie.
- `npm run audit:contrast` memeriksa palet token di kedua mode → PASS.

---

## G. Performa dan Keamanan

### Performa

Fakta yang terukur:

- Pemeriksaan pesan/nomor/tautan berjalan **lokal di peramban** tanpa *round-trip*
  jaringan untuk analisis, sehingga hasilnya seketika.
- `next build` membedakan rute statis dan dinamis; halaman publik `/periksa` dan
  `/latihan` dipra-render statis (○), sebagian lain *server-rendered on demand*
  (ƒ) karena bergantung pada data sesi.
- Satu test E2E kontras yang mengaudit hingga 19 halaman penuh memerlukan waktu
  mendekati batas 30 detik di bawah beban 6 worker; ini adalah biaya *pengujian*
  (audit DOM menyeluruh), bukan masalah performa produksi, dan telah diberi
  timeout per-test (Bagian I).

**Lighthouse lab (production build, `npx lighthouse` terhadap `next start`)** —
hasil aktual dan dapat direproduksi (JSON tersimpan di `.tmp-audit/lh-home.json`,
Δ sementara dan di-gitignore):

| Metrik | Nilai |
|---|---|
| Performance | **93** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |
| FCP / LCP / CLS / TBT | 0,9 s / 2,5 s / 0 / 250 ms |
| Total byte-weight | 233 KiB |

Nilai turun dari ambang internal 95 **hanya pada Performance (93)**, karena LCP
2,5 s (persis ambang "baik") dan `unused-javascript`/`legacy-javascript` dari
runtime Next.js (~40 KiB). Tidak dilakukan optimasi agresif demi estetika hero
neobrutalis dan fungsi; angka dilaporkan apa adanya, bukan diklaim ≥95.

### Keamanan

Rangkuman dari `docs/SECURITY-AND-PRIVACY.md` dan implementasi `lib/security/**`:

- **Privasi inti:** isi pesan diproses lokal, tidak dikirim ke server, tidak
  ditulis ke penyimpanan apa pun; reputasi URL hanya dikirim ke Google Safe
  Browsing setelah **consent eksplisit** pengguna; tidak ada pelacak/analitik.
- **Kata sandi:** bcrypt cost 12; login memakai perbandingan tiruan saat email
  tidak ditemukan (tidak membocorkan keberadaan akun); reset kata sandi memakai
  token sekali pakai + kedaluwarsa dan **mencabut sesi**.
- **Sesi:** `iron-session` (cookie terenkripsi & ditandatangani, `httpOnly`,
  `SameSite=Lax`, `Secure` di production); `SESSION_SECRET` minimal 32 karakter.
- **CSRF:** pemeriksaan asal permintaan (`isSameOrigin`) pada rute yang menulis.
- **Pembatasan laju** per operasi (`RATE_LIMITS`), plus Cloudflare Turnstile pada
  aksi publik (diskusi, artikel, laporan, lupa sandi).
- **Otorisasi:** role selalu dibaca ulang dari basis data pada tiap request
  (bukan dari klaim cookie); pemeriksaan kepemilikan dilakukan di kueri
  (`where id = $1 and author_id = $2`) untuk mencegah IDOR.
- **Header keamanan:** `X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy` ketat, `Permissions-Policy` mematikan fitur,
  `COOP: same-origin`; pada production ditambahkan `Content-Security-Policy`
  (dan `Strict-Transport-Security` bila `SARING_ENABLE_HSTS=1`). Halaman privat
  dan `/api/*` mengirim `Cache-Control: private, no-store`.

Keamanan sesi/reset kata sandi diuji unit
(`tests/unit/password-reset-route.test.ts`) dan E2E
(`tests/e2e/password-reset-security.spec.ts`), termasuk bahwa respons tidak
membocorkan token/kata sandi/kunci layanan.

---

## H. Dokumentasi dan Presentasi

Dokumentasi yang tersedia:

| Dokumen | Isi |
|---|---|
| `docs/ARCHITECTURE.md` | Arsitektur, submodul mesin, alur data, Latihan |
| `docs/SECURITY-AND-PRIVACY.md` | Ringkasan pemrosesan, header, autentikasi, otorisasi |
| `docs/TESTING.md` | Cakupan unit/komponen/E2E, cara menjalankan, CI |
| `docs/EVALUASI-ANALISIS.md` | Metodologi + angka tiga subset + log 14 aturan + batasan |
| `docs/USER-TESTING.md` | Paket pelaksanaan studi usability (siap dijalankan) |
| `docs/DATA-SOURCES.md` | Kanal resmi yang dirujuk aplikasi |
| `docs/PANDUAN-PRESENTASI.md` | Naskah demo (16 bagian) + 2 Lampiran Q&A |
| `docs/PRESENTATION-QA.md` | Ringkasan jawaban juri cepat |

Presentasi (`PANDUAN-PRESENTASI.md`) mencakup naskah siap baca per menu,
pengakuan batasan secara eksplisit (Bagian 15), serta **Lampiran 2: sepuluh
pertanyaan juri** yang jawabannya diturunkan dari kode nyata — termasuk cara
mengukur kualitas deteksi, skor indikator vs probabilitas, mengapa tidak ada
label aman, bagaimana memastikan isi Pustaka benar, dan apa pembedanya.

---

## I. Hasil Quality Gate

Semua pintu di bawah dijalankan lokal; tidak ada perubahan database produksi.

| Pintu | Perintah | Hasil |
|---|---|---|
| TypeScript | `npm run typecheck` | ✅ exit 0 |
| Lint | `npm run lint` | ✅ exit 0 |
| Audit kontras | `npm run audit:contrast` | ✅ PASS |
| Build | `npm run build` | ✅ exit 0 |
| Whitespace git | `git diff --check` | ✅ bersih |
| **Unit & komponen** | `npm run test` | ✅ **534 lulus / 1 dilewati** (49 file + 1 generator blind yang env-gated), dijalankan berulang tanpa flake |
| **E2E (chromium + mobile)** | `npm run test:e2e:local` | ✅ **272 lulus / 14 dilewati / 0 gagal** (286 test, dijalankan ulang pada sesi ini, exit 0) |

### Catatan pengujian E2E

Jalur lengkap menjalankan **286 test** (project Chromium + mobile, server
produksi terhadap PostgreSQL uji lokal). **Hasil akhir putaran penuh setelah
semua perbaikan: 272 lulus, 14 dilewati (skipped), 0 gagal.**

Selama iterasi, satu test sempat gagal karena **batas waktu 30 detik** —
`contrast.spec.ts` "semua halaman lolos ambang kontras (system-terang)", yang
mengaudit kontras seluruh DOM pada 19 halaman secara serial di bawah beban
6 worker (waktu terukur ≈ 25–28 detik, persis di bawah batas lama). Penyebabnya
jam penguji, bukan pelanggaran kontras. Perbaikan = menaikkan timeout per-test
menjadi 120 detik (`test.setTimeout(120_000)`) tanpa mengubah assertion
`failures === []`; test kemudian lulus stabil di putaran penuh berikutnya.

---

## J. Keterbatasan

1. **Deteksi heuristik, bukan kepastian.** Mesin membaca isi teks saja: tidak
   melihat nomor pengirim, riwayat, atau niat. Tidak ada *false negative* biner
   tersisa, tetapi tetap ada celah level kategori (desakan, pembayaran di muka,
   peniruan) dan satu kelebihan sinyal `money-request` yang didokumentasikan
   (`docs/EVALUASI-ANALISIS.md` §4.2).
2. **Holdout tidak sepenuhnya blind.** Satu aturan menyerap kosakata khas contoh
   holdout (`hold-prize-01`) dan satu FN (`hold-threat-01`) diperbaiki atas dasar
   kasus holdout itu, sehingga recall holdout 100% **bukan** bukti generalisasi
   independen (Bagian C; `docs/EVALUASI-ANALISIS.md` §4.3). Protokol pengumpulan
   dataset baru disiapkan dan belum dijalankan.
3. **Ukuran sampel evaluasi kecil.** Validation (20) dan holdout (23) terlalu
   kecil untuk estimasi per-kategori yang stabil.
4. **Terbatas Bahasa Indonesia.** Variasi frasa/slang/ejaan yang diuji adalah
   bahasa Indonesia; efektivitas bahasa lain tidak diukur.
5. **Dataset sintetis.** Contoh dikurasi dari pola penipuan yang dilaporkan,
   bukan dikumpulkan dari korban nyata.
6. **Belum ada pengujian pengguna nyata.** Paket usability siap, tetapi tanpa
   peserta; tidak ada SUS/kemudahan yang diklaim.
7. **Fitur yang masih rencana** (bukan fitur): database reputasi nomor telepon,
   pelaporan artikel (laporan kini hanya untuk pertanyaan/balasan), notifikasi
   email/push. Semua dinyatakan sebagai rencana di presentasi.
8. **Performa di-benchmark parsial.** Lighthouse lab diukur pada production build
   (Performance 93, Accessibility/Best Practices/SEO 100); belum ada profil INP
   atau CrUX (data lapangan), sehingga tidak diklaim.

---

## K. Penilaian Kompetisi

Penilaian diri (*self-assessment*) memakai **lima kriteria dan bobot asli**
kompetisi. Skor dihitung ulang secara independen dari bukti yang **benar-benar
diperiksa** pada audit ini; tidak ada satupun angka historis (92,5 / 93 / 86 /
83) yang "dikejar".

### K.1 Rekonsiliasi riwayat nilai 92,5 → 93 → 86 → 83

Keempat angka tersebut adalah estimasi internal yang **bukan nilai resmi**, dan
perbedaan di antaranya dapat dijelaskan sebagai berikut (rekonstruksi jujur —
justifikasi internal masa lalu tidak tersimpan di repositori):

| Estimasi | Penyebab perbedaan yang paling mungkin |
|---|---|
| **92,5** (awal) | Memakai rubrik internal yang lebih longgar atau tidak memakai bobot lima kriteria; menghitung 520 unit + 286 E2E dan presisi/recall penuh sebagai "hampir sempurna"; menganggap holdout sepenuhnya *blind*; belum mengurangkan fitur yang belum ada dan pengujian manusia yang belum dilakukan. |
| **93** (setelah UX & dokumentasi) | Menambah kredit untuk UX/a11y dan kelengkapan dokumen, tetapi masih menganggap recall holdout 92,9% sebagai bukti generalisasi independen, dan tetap belum memisahkan kelemahan evaluasi dari nilai produk. |
| **86** (laporan teknis) | Pertama kali memakai bobot lima kriteria (85/88/82/86/92); lebih jujur, tetapi masih (a) menyebut holdout "tidak disentuh" padahal satu aturan menyerap kosakatanya, dan (b) menahan "Kesesuaian" di 88 atas dasar angka holdout yang kini diketahui tidak *blind*. |
| **83** (audit lebih ketat) | Audit yang lebih ketat, tetapi cenderung **mengurangkan berlebihan**: memperlakukan satu kelemahan evaluasi sebagai memukul beberapa kriteria sekaligus tanpa pembedaan dampak, dan/atau mencampur lagi rubrik internal. |

Tidak ada dari keempat angka itu yang otomatis benar. Penilaian pada K.2 di
bawah dihitung dari nol berdasarkan bukti implementasi, dan kini didukung bukti
baru yang sebelumnya belum diukur (Lighthouse lab, `npm audit`, 23 skenario).

### K.2 Penilaian ulang (lima kriteria resmi)

| Kriteria | Bobot | Nilai mentah | Kontribusi | Keyakinan |
|---|---:|---:|---:|---|
| Fungsionalitas | 35% | 87 | 30,45 | Tinggi |
| Kesesuaian Studi Kasus | 25% | 88 | 22,00 | Sedang |
| UI/UX | 20% | 83 | 16,60 | Sedang |
| Kualitas Kode & Pemeliharaan | 10% | 85 | 8,50 | Tinggi |
| Dokumentasi | 10% | 87 | 8,70 | Sedang |
| **TOTAL** | **100%** | | **86,25 ≈ 86/100** | |

Nilai di atas adalah penilaian ulang **setelah** audit sesi ini menambahkan bukti
yang sebelumnya belum diukur: Lighthouse lab nyata (Performance 93,
Accessibility/Best Practices/SEO 100), `npm audit` 0 kerentanan, dan 3 skenario
Latihan tambahan (23 total). Kenaikan terbatas dan hanya pada bagian yang memang
terbukti, bukan inflasi.

#### Fungsionalitas — 87/100 (keyakinan tinggi)

- **Bukti:** seluruh alur inti berjalan dan teruji — Periksa (pesan/nomor/tautan),
  Latihan, Langkah, Pustaka, Komunitas, Akun, Admin. Quality gate: `npm run test`
  (534 lulus), `npm run test:e2e:local` (272 lulus / 14 skipped / 0 gagal,
  dijalankan ulang pada sesi ini, exit 0), `typecheck`/`lint`/`build` bersih,
  `npm audit` 0 kerentanan. Lighthouse lab: Performance 93, Best Practices/SEO 100.
- **Identitas visual & kasus terverifikasi:** 23 skenario Latihan (termasuk 3
  modus Indonesia yang baru ditambahkan: bansos palsu, kenalan online darurat,
  tagihan listrik mengancam pemutusan), 6 panduan Langkah, 14 artikel Pustaka,
  9 contoh fiktif, 6 kanal resmi — jumlahnya divalidasi terhadap `data/*.ts`.
- **Kekurangan:** fitur yang dinyatakan sebagai *rencana* belum ada — database
  reputasi nomor telepon (tidak ada penyedia resmi yang boleh dipaksakan),
  notifikasi email/push, pelaporan artikel (kini hanya untuk pertanyaan/balasan).
  Bukan cacat fungsional, tetapi membatasi kelengkapan.
- **Alasan pengurangan:** dari 90+ karena roadmap yang belum tuntas, bukan bug.
- **Untuk naik:** mengimplementasikan fitur-fitur rencana di atas.

#### Kesesuaian Studi Kasus — 88/100 (keyakinan sedang)

- **Bukti:** sangat selaras dengan "Trust Trap": mengenali sinyal, mengutip bukti
  teks, menjelaskan alasan, merujuk kanal resmi (OJK/IASC/AduanNomor), menciptakan
  "jeda keputusan", dan **tidak pernah** memberi label "aman". Deteksi biner kini
  **100% presisi / 100% recall / 100% akurasi** di ketiga subset (FN biner
  terakhir — ancaman pemutusan layanan ber-tenggat — diperbaiki lewat aturan
  generik + kasus negatif, Bagian C).
- **Kekurangan:** bukti generalisasi masih lemah karena holdout **tidak *blind***
  (Bagian C), dan masih ada celah *level kategori* (desakan 1/3, pembayaran 3/4,
  peniruan 1/2) plus satu kelebihan sinyal `money-request`.
- **Alasan pengurangan:** bukan pada *kesesuaian konsep* (yang kuat) maupun
  *kualitas deteksi biner* (kini bebas FN), melainkan pada *keyakinan
  generalisasi* yang tidak dapat berdiri di atas angka holdout non-independen.
- **Untuk naik:** kumpulkan dataset independen baru (§7 EVALUASI-ANALISIS.md) dan
  perbaiki celah kategori desakan/peniruan.

#### UI/UX — 83/100 (keyakinan sedang)

- **Bukti:** audit kontras WCAG 2.2 AA (teks & kontrol) pada 19 rute × 4 mode
  terang/gelap; **Lighthouse Accessibility 100 / Best Practices 100** pada
  production build; dark mode **sebelum first-paint** (diuji deterministik lewat
  `entry.startTime`, tanpa toleransi arbitrer); responsif 320–430px + tablet +
  desktop tanpa overflow horizontal; skip-link, `aria-live` hasil, label form,
  fokus `:focus-visible`, `prefers-reduced-motion`; alur Periksa Pesan disusun
  ulang mengikuti alur baca (accordion contoh tertutup, auto-analisis, invalidasi
  hasil lama, penjaga balapan `runRef`).
- **Kekurangan:** **belum** divalidasi peserta manusia — tidak ada SUS/kemudahan
  yang diukur (paket usability siap, belum dijalankan). Ini satu-satunya alasan
  nilai tidak lebih tinggi dari teknis a11y yang sudah 100.
- **Alasan pengurangan:** aksesibilitas/quality teknis teruji otomatis (kontras +
  Lighthouse), tetapi kegunaan manusiawi belum terbukti.
- **Untuk naik:** jalankan studi usability 5–10 peserta (`docs/USER-TESTING.md` §5).

#### Kualitas Kode & Pemeliharaan — 85/100 (keyakinan tinggi)

- **Bukti:** TypeScript 5 + ESLint bersih; 534 unit/komponen (49 berkas, plus 1
  generator prediksi blind yang env-gated); evaluasi deteksi ber-*gate*
  (`analysisEval.test.ts`); 14 aturan terdokumentasi dengan unit test
  masing-masing; pemisahan subset; metrik dihitung skrip sungguhan; `npm audit`
  0 kerentanan.
- **Kekurangan:** proses engineering **melanggar independensi holdout** — satu
  aturan (`upfront-payment`) dan satu unit test menyerap kosakata khas
  `hold-prize-01` sambil didokumentasikan "hanya dari dev+validation". Ini cacat
  *proses/ketelitian*, bukan cacat kode fungsional.
- **Alasan pengurangan:** dari 87 ke 85 untuk mencatat kerapian proses evaluasi;
  kode itu sendiri tetap bersih dan test tetap hijau.
- **Untuk naik:** terapkan protokol dataset independen (§7) dan disiplin bahwa
  hanya development/validation yang boleh menala aturan.

#### Dokumentasi — 87/100 (keyakinan sedang)

- **Bukti:** arsitektur, keamanan, pengujian, evaluasi, usability, presentasi
  (16 bagian + 10 tanya jawab juri), dan laporan ini tersedia dan saling
  konsisten dengan source (jumlah skenario 23, artikel 14, kanal 6, migrasi,
  14 aturan, 534 test, dan hasil Lighthouse lab sudah disinkronkan).
- **Kekurangan:** dokumen evaluasi sebelumnya memuat **klaim keliru** ("holdout
  tidak pernah disentuh") yang sekarang sudah dikoreksi; belum ada dokumentasi
  hasil pengujian pengguna nyata (belum dijalankan).
- **Alasan pengurangan:** kelengkapan tinggi, tetapi akurasi sempat melemah oleh
  klaim metodologis yang salah.
- **Untuk naik:** catat hasil usability nyata begitu dijalankan; jaga agar klaim
  metodologis selalu sinkron dengan isi aturan.

### K.3 Catatan agar tidak terjadi penalti ganda

Kelemahan "holdout tidak *blind*" menyinggung **tiga** kriteria dengan alasan yang
**berbeda** (bukan denda berulang atas satu hal yang sama):

- **Kesesuaian Studi Kasus** terdampak karena *bukti kualitas deteksi* melemah.
- **Kualitas Kode & Pemeliharaan** terdampak karena *proses* menala melanggar
  disiplin independensi.
- **Dokumentasi** terdampak karena *klaim metodologisnya* sempat tidak akurat.

Memisahkan ketiganya mencegah angka turun dua kali untuk sebab yang sama, dan
membuat pengurangan dapat diperiksa ulang secara terpisah.

Total tertimbang = 0,35·87 + 0,25·88 + 0,20·83 + 0,10·85 + 0,10·87 = **86,25 ≈
86/100**. Angka ini adalah penilaian diri yang dapat dipertanggungjawabkan per
kriteria, bukan hasil penilaian juri.

---

## L. Git Status

Tidak ada `push`, `deploy`, atau `reset` yang dilakukan pada sesi audit ini.
Seluruh pekerjaan sesi ini bersifat lokal pada working tree.

- Branch: `main`
- HEAD: `64eed6f` — "docs: document password reset migration and evaluation links"
- Working tree (sesi audit ini): **11 berkas termodifikasi (unstaged)**, **3 berkas
  baru (untracked)**, `0` berkas ter-staged (`git diff --cached` kosong).

Berkas termodifikasi (` M`) — hasil perbaikan sesi ini:

```
 .gitignore                        (kecualikan dataset/prediksi/lockfile blind-eval)
 data/scenarios.ts                 (3 skenario baru: bansos palsu, kenalan online, tagihan listrik)
 docs/ARCHITECTURE.md              (jumlah skenario 20 → 23)
 docs/EVALUASI-ANALISIS.md         (sinkron angka + log 14 aturan + §7 material blind-eval)
 docs/LAPORAN-AKHIR.md             (laporan ini; skor 86, Kesesuaian 88, Lighthouse lab)
 docs/PANDUAN-PRESENTASI.md        (Q1: holdout non-blind; sinkron jumlah test)
 docs/TESTING.md                   (tabel test yang dilewati + jumlah skenario 23)
 lib/analysis/context.ts           (isReportedContext: pelaporan/edukasi lintas-klausa)
 lib/analysis/engine.ts            (aturan #13/#14: pemutusan layanan + penjaga FP)
 lib/security/origin.ts            (hapus blok komentar doc yang terduplikasi)
 tests/unit/engineImprovements.test.ts (30 test; +8 regresi Fase 2 aturan #13)
```

Berkas baru (untracked, `??`) — infrastruktur evaluasi independen:

```
 evaluation/                       (PROTOKOL.md, LABEL-SCHEMA.md, template anotasi & provenance)
 scripts/evaluation/               (blind-eval.mjs, dedupe.mjs, freeze.mjs — murni Node)
 tests/unit/blind-predict.test.ts  (generator prediksi mesin beku, env-gated)
```

> Catatan: kumpulan pekerjaan audit sebelumnya (23 berkas: 16 termodifikasi +
> 7 baru — dataset evaluasi, metrik, skrip evaluasi, dokumen evaluasi & laporan,
> serta perbaikan mesin/UI) sudah berada di dalam commit `64eed6f` yang menjadi
> HEAD saat ini. Sesi ini **tidak membuat commit baru**.

Tidak ada perubahan ke database produksi atau migration. Semua pekerjaan tetap
di dalam working tree lokal.