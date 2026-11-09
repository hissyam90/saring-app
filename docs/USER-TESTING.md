# Evaluasi Pengalaman Pengguna & Aksesibilitas

Dokumen ini mencatat **cara Saring menguji pengalaman penggunaan** (UX) dan
**aksesibilitas** antarmukanya, apa yang ditemukan, apa yang diubah, dan **naskah
pengujian manusia** yang bisa dijalankan untuk melengkapi pengujian otomatis.

> **Jujur soal metode.** Pemeriksaan yang dijelaskan di bagian 2–4 adalah
> **evaluasi heuristik dan penelusuran terpandu** (walkthrough) yang dilakukan
> sendiri bersama pemeriksaan otomatis, bukan studi usability dengan peserta
> yang direkrut. Hasilnya tidak boleh diklaim sebagai "sudah diuji N pengguna".
> Bagian 5 menyediakan **paket pelaksanaan** pengujian pengguna sungguhan (lembar
> tugas, persetujuan, kuesioner SUS, dan templat pencatatan) yang dapat
> dijalankan dengan biaya kecil; **belum ada hasil peserta** pada saat dokumen
> ini ditulis.

---

## 1. Cakupan

Sasaran evaluasi adalah tiga pertanyaan yang paling menentukan bagi pengguna
baru:

1. **Apakah halaman Beranda langsung menjelaskan** masalahnya, apa yang bisa
   dilakukan Saring, dan tindakan pertama yang jelas?
2. **Apakah alur utama (Periksa Pesan) bisa dipakai tanpa tersesat** — terutama
   di layar sempit dan untuk pengguna pembaca layar?
3. **Apakah seluruh situs tetap terbaca dan bisa dioperasikan** pada berbagai
   ukuran layar, preferensi gerak berkurang, dan navigasi papan ketik?

Hasil evaluasi dibagi menjadi dua bagian besar: **Periksa Pesan** (alur inti)
dan **seluruh situs** (lintas halaman).

---

## 2. Matriks perangkat dan mode

| Dimensi | Nilai yang diperiksa |
|---|---|
| Lebar viewport | 320, 360, 390, 430, 768 (tablet), ≥1280 (desktop) |
| Mode Playwright (E2E) | `chromium` (Desktop Chrome) dan `mobile` (Pixel 5, 393 px) |
| Tema | Terang, Gelap, Ikuti sistem |
| Preferensi gerak | `prefers-reduced-motion: reduce` dan `no-preference` |
| Input | Tetikus/ketuk dan **papan ketik saja** (Tanpa tetikus) |

Prioritasnya urut: **Periksa Pesan → Beranda → Periksa Nomor & Tautan →
Latihan, Langkah, Pustaka → Komunitas dan akun**.

---

## 3. Periksa Pesan — alur inti

### 3.1 Masalah yang ditemukan

Penelusuran awal menemukan beberapa gesekan pada alat pemeriksaan pesan:

- **Contoh fiktif membentang ke bawah** dan mendorong tombol serta hasil jauh
  dari jangkauan mata; pengguna baru di ponsel justru melihat daftar contoh
  sebelum memahami apa yang terjadi.
- **Urutan tidak mengikuti alur baca**: header, lalu langsung kolom contoh,
  baru textarea, tombol, dan hasil — sehingga arah perhatian melompat-lompat.
- **Memilih contoh hanya mengisi teks**, pengguna masih harus menekan tombol
  lagi. Di ponsel ini terasa sebagai dua langkah yang tidak perlu.
- **Hasil lama tetap tampil** setelah pengguna mengubah teks, tanpa tanda apa
  pun — berisiko ditafsirkan sebagai hasil teks yang baru.
- Ada kemungkinan **hasil pemeriksaan yang dibatalkan** (karena teks berubah
  saat pemeriksaan berjalan) muncul terlambat dan menimpa konteks baru.

### 3.2 Perubahan yang diterapkan

Urutan konten disusun ulang mengikuti alur baca:

1. Header + lencana privasi
2. Catatan privasi (pemeriksaan lokal)
3. Textarea berlabel
4. Penghitung karakter
5. Pesan validasi
6. Tombol aksi (Periksa / Bersihkan / Coba contoh lain)
7. Status pemeriksaan
8. Hasil pemeriksaan
9. Accordion contoh fiktif (tertutup secara default)

Detil perilaku:

- **Accordion contoh** memakai `<details>/<summary>` (asli peramban, tanpa
  JavaScript untuk membuka/menutup), **tertutup secara default**, dengan tanda
  chevron yang berputar saat terbuka. Daftar tetap dapat dibaca pembaca layar
  sebagai tombol yang dapat diperluas.
- **Memilih contoh** mengisi textarea, **menutup accordion**, lalu **langsung
  menganalisis** tanpa klik kedua, dan menggulir layar ke hasil.
- **Hasil kedaluwarsa**: begitu teks diubah setelah hasil tampil, hasil lama
  dihapus dan muncul "Pesan berubah. Periksa ulang untuk mendapatkan hasil
  terbaru." sehingga hasil baru tidak keliru dibaca sebagai konteks lama.
- **Keamanan balapan (race)**: token `runRef` memastikan hasil pemeriksaan yang
  dibatalkan tidak pernah muncul terlambat.
- **Pengumuman pembaca layar**: status `aria-live="polite"` mengumumkan
  "Analisis selesai — hasil pemeriksaan tersedia." ketika hasil selesai.
- **Gulir ke hasil** memakai `behavior: "auto"` saat `prefers-reduced-motion:
  reduce`, agar tidak beranimasi.

### 3.3 Cara divalidasi

- **Komponen**: `tests/components/analyzer.test.tsx` (9 pengujian) — accordion
  tertutup/terbuka, analisis otomatis + penutupan accordion, tanda kedaluwarsa,
  hasil yang dibatalkan tidak muncul, "Coba contoh lain", "Bersihkan", dan
  pengumuman pembaca layar.
- **End-to-end**: blok "Periksa Pesan UX" (14 pengujian) di
  `tests/e2e/app.spec.ts` — menjalankan seluruh alur di peramban sungguhan,
  termasuk urutan hasil relatif terhadap area contoh, penghitung karakter,
  batas `maxlength` 2500, dan lencana privasi.

---

## 4. Seluruh situs — lintas halaman

### 4.1 Beranda menyampaikan tiga hal dengan cepat

Pada lipatan pertama Beranda, pengunjung baru harus langsung mendapat:

- **Masalahnya** — penipuan digital bekerja lewat tekanan, desakan, dan
  peniruan; orang bertindak sebelum memeriksa.
- **Yang dilakukan Saring** — "Saring Sebelum Sharing. Periksa Sebelum
  Percaya." ditambah alat pemeriksaan terpadu.
- **Tindakan pertama** — alat pemeriksaan (tab Periksa Pesan) tersedia langsung
  di Beranda, bukan baru di halaman `/periksa`.

Bagian duplikatif yang semula mengulang daftar fitur diganti dengan bagian
"Kalau sudah terlanjur" yang mengarahkan ke panduan pascainsiden, sehingga
Beranda tetap ringkas dan berorientasi tindakan.

### 4.2 Gerak berkurang (`prefers-reduced-motion`)

- `Reveal` (scroll-reveal) tidak menyembunyikan atau menganimasikan konten
  saat gerak berkurang; konten tetap terlihat.
- `HeroScanner` (komposisi 3D beranda) menonaktifkan tilt dan parallax saat
  gerak berkurang.
- Aturan global di `app/globals.css` menekan durasi animasi/transisi ke
  `0.01ms` dan menghentikan transisi warna antar-status, sekaligus menjaga agar
  perubahan warna berlaku seketika (penting untuk audit kontras).

### 4.3 Kontras dan fokus

- Cincin fokus memakai token `--color-focus` dengan nilai terpisah untuk tema
  terang/gelap agar tetap ≥ 3:1 terhadap permukaan (WCAG 1.4.11), diterapkan
  lewat `:focus-visible`.
- Audit kontras dijalankan dua lapis: `npm run audit:contrast` (pasangan token)
  dan `tests/e2e/contrast.spec.ts` (warna terhitung di browser pada 19 rute ×
  4 mode).
- Tautan dalam teks panjang memakai `overflow-wrap` dan elemen flex/grid diberi
  `min-width: 0` agar label pendek tidak terpotong di layar sempit.

### 4.4 Navigasi papan ketik

- **Skip link** "Lompat ke konten utama" terlihat saat fokus dan memindahkan
  fokus ke `#konten-utama` (diuji di `tests/e2e/app.spec.ts`).
- Fokus terlihat (`:focus-visible`) tersedia di seluruh kontrol interaktif.
- Menu seluler dapat dibuka dan link-nya berfungsi (diuji di proyek `mobile`).

### 4.5 Tidak ada luapan horizontal

Seluruh rute utama diperiksa tidak menghasilkan luapan horizontal
(`scrollWidth − clientWidth ≤ 1`) pada viewport seluler.

---

## 5. Paket pelaksanaan pengujian pengguna (studi usability)

Bagian ini adalah **paket eksekusi yang lengkap dan siap dipakai** — bukan hasil
pengujian. Belum ada peserta yang dijalankan saat dokumen ini ditulis; seluruh
tabel hasil di bawah adalah **templat kosong** untuk diisi setelah sesi nyata.
**Jangan mengisi angka apa pun di sini sampai pengujian benar-benar dilakukan.**

### 5.1 Peran, durasi, dan peralatan

| Hal | Rincian |
|---|---|
| Peran | 1 **fasilitator** (memandu) + 1 **pengamat** (mencatat); boleh orang yang sama bila tim kecil |
| Durasi | ± 20–25 menit per peserta (5 tugas + kuesioner) |
| Perangkat | Laptop atau ponsel peserta (atau disediakan peneliti), peramban Chrome/Safari/Firefox |
| Perekaman | Opsional, hanya dengan izin tertulis; bila menolak, cukup catatan tertulis |
| Lainnya | Stopwatch/layanan pembuat waktu, formulir observasi (±1 lembar per tugas) |

### 5.2 Rekrutmen dan kriteria peserta

Target **5–10 peserta** yang belum pernah memakai Saring. Profil diutamakan:
mahasiswa/pelajar, pengguna internet aktif, dan orang awam yang tidak memahami
keamanan siber.

| Profil | Contoh sumber | Saran jumlah |
|---|---|---|
| Mahasiswa/pelajar | kakak-adik kelas, teman kampus | 2–4 |
| Orang awam / non-teknis | rekan kerja, tetangga, komunitas | 2–4 |
| Usia 45+ / belum fasih digital | orang tua atau kerabat | 1–2 |

**Privasi:** jangan mengumpulkan nama lengkap, NIK, alamat, nomor telepon, atau
data pribadi lain yang tidak relevan. Cukup catat **inisial** dan **profil**.
Semua materi yang diberikan ke peserta adalah **karangan fiktif** (pesan/tautan
contoh), bukan percakapan asli yang sensitif.

### 5.3 Persetujuan partisipasi (dibacakan & ditandatangani)

Sampaikan poin berikut sebelum mulai dan minta persetujuan lisan/tertulis:

> - Saya ikut serta secara sukarela dan boleh berhenti kapan saja.
> - Saya paham bahwa tujuannya adalah **menguji aplikasi**, bukan menguji/ menilai kemampuan saya.
> - Rekaman layar/suara dibuat **hanya bila saya setuju**, dan akan dihapus setelah laporan selesai. Bila menolak, cukup dicatat tertulis.
> - Catatan memakai **inisial**, tanpa nama lengkap atau data pribadi.
> - Tidak ada pesan/akun/tautan asli milik saya yang diminta.

Tandai: ☐ setuju rekaman  ☐ menolak rekaman (catatan tertulis). Inisial: ______

### 5.4 Lembar skenario — Tugas 1–5 (bacakan kata per kata)

Beri peserta materi fiktif di bawah pada saat yang tepat. **Peserta belum pernah
memakai Saring**, jadi jangan beri petunjuk cara menggunakannya.

**Tugas 1 — Periksa pesan.** Berikan teks fiktif berikut lalu bacakan:
> "Anda baru menerima pesan ini. Menurut Anda mencurigakan. Coba periksa di aplikasi
> ini apakah ada tanda-tanda penipuannya."

  - Pesan fiktif (tempel/tulis):
    > Selamat! Nomor Anda terpilih pemenang undian THR Rp25.000.000 dari Program
    > Berhadiah Bank Amanah. Untuk mencairkan hadiah, kirimkan kode OTP yang baru
    > masuk ke SMS Anda lewat tautan: https://bit.ly/klaim-thr — batas klaim hari
    > ini pukul 17.00.

  - Amati: apakah peserta menemukan textarea dan tombol pemeriksaan; apakah ia
    membuka/memilih contoh fiktif atau langsung memakai pesan yang diberikan.

**Tugas 2 — Memahami hasil.** Setelah hasil muncul, bacakan:
> "Jelaskan dengan kata-kata Anda sendiri: (1) apa yang ditemukan aplikasi ini,
> (2) mengapa hal itu mencurigakan, (3) apa yang belum bisa dipastikan, dan
> (4) apa tindakan pertama yang sebaiknya Anda lakukan."

  - Amati: pemahaman sinyal yang ditampilkan, kutipan bukti, dan langkah yang
    disarankan; bukan hafalan istilah.

**Tugas 3 — Periksa tautan.** Berikan URL fiktif **sebagai teks** lalu bacakan:
> "Tautan berikut terlihat aneh. Periksa **sebagai teks** di aplikasi ini — jangan
> membukanya. Lalu jelaskan apa bedanya *melihat struktur tautannya di sini*
> (inspeksi lokal) dengan *memeriksa reputasinya di layanan luar*."

  - URL fiktif: `https://bit.ly/cek-paket-anda`
  - Amati: apakah peserta paham bahwa inspeksi lokal mengenali penyingkat/struktur,
    sedangkan reputasi eksternal bersifat opsional dan bukan jaminan mutlak.

**Tugas 4 — Latihan.** Bacakan:
> "Buka sesi latihan dan selesaikan satu putaran sampai selesai."

  - Amati: apakah peserta memahami aturan skor (benar/tebak/salah) dan pembahasan
    yang muncul setelah menjawab.

**Tugas 5 — Penanganan insiden.** Bacakan:
> "Anda sudah telanjur memasukkan kata sandi/OTP di situs yang mencurigakan.
> Cari tahu di aplikasi ini apa langkah yang harus Anda lakukan."

  - Target jalur: halaman Langkah (`/langkah`) → kondisi "sudah memasukkan
    kata sandi atau OTP". Amati apakah peserta menemukan panduan yang sesuai.

### 5.5 Instruksi fasilitator

- **Pembuka netral:** "Kita sedang mengevaluasi aplikasi ini agar lebih mudah
  dipakai. Tidak ada jawaban benar atau salah; kerjakan sebisanya sambil berpikir
  keras (think-aloud)."
- **Aturan bantuan:** jangan membantu kecuali peserta berhenti total > 20 detik.
  Setiap bantuan dicatat (lihat §5.6 kolom "bantuan").
- **Jangan menuntun** dengan menyebut nama menu/tombol ("cari di kiri atas"
  dilarang; "apa yang Anda lihat di halaman ini?" diperbolehkan).
- **Jaga netralitas** saat mencatat; tunda diskusi hingga kuesioner selesai.

### 5.6 Template observasi (1 lembar per tugas)

| Indikator | Cara mencatat |
|---|---|
| Penyelesaian tugas | Berhasil ✓ / Sebagian △ / Gagal ✗ (sebagian = selesai dengan bantuan) |
| Waktu penyelesaian | detik, dari selesai instruksi sampai peserta menyatakan selesai/menyerah |
| Kesalahan kritis | langkah yang menggagalkan/menyesatkan sampai harus dibantu |
| Kesalahan navigasi | klik/ketuk ke halaman/bagian yang tidak relevan |
| Permintaan bantuan | jumlah bantuan yang diberikan (0 / 1 / ≥2) |
| Pemahaman hasil | 0–2 (2 = tepat, 1 = sebagian, 0 = salah tafsir) |
| Kemudahan (1–7) | *single ease question* terpisah: "Seberapa mudah langkah tadi?" (1 = sangat sulit, 7 = sangat mudah) |
| Saran peserta | kutipan singkat (verbatim) |

### 5.7 Kuesioner pasca-sesi

Ada **dua metrik terpisah** — jangan digabung:

1. **Kemudahan per tugas (1–7)** — ditanyakan setelah **setiap** tugas (lihat
   §5.6). Skala 1–7, **bukan** bagian dari SUS.
2. **SUS (System Usability Scale)** — 10 butir, skala respons **1–5**
   (1 = Sangat tidak setuju … 5 = Sangat setuju), ditanyakan **sekali** di akhir
   sesi:

   1. Saya akan sering menggunakan aplikasi ini.
   2. Aplikasi ini terasa lebih rumit dari yang seharusnya.
   3. Aplikasi ini terasa mudah digunakan.
   4. Saya perlu bantuan teknisi untuk memakai aplikasi ini.
   5. Berbagai fitur di aplikasi ini terintegrasi dengan baik.
   6. Terlalu banyak hal yang tidak konsisten di aplikasi ini.
   7. Saya rasa kebanyakan orang akan cepat belajar memakai aplikasi ini.
   8. Aplikasi ini terasa merepotkan untuk dipakai.
   9. Saya merasa percaya diri saat memakai aplikasi ini.
   10. Saya perlu belajar banyak hal dulu sebelum bisa memakai aplikasi ini.

   **Catatan:** terjemahan Bahasa Indonesia ini **belum divalidasi** secara
   psikometrik (belum ada *back-translation* atau uji reliabilitas). Laporkan
   hasilnya dengan catatan ini, jangan klaim sebagai SUS yang tervalidasi.

### 5.8 Pencatatan & pengolahan hasil

**Tabel induk per peserta:**

| Peserta | Profil | T1 ✓/△/✗ (dt) | T2 | T3 | T4 | T5 | Total dt | Rata² mudah (1–7) | SUS (0–100) |
|---|---:|---|---:|---|---:|---|---:|---:|
| … | … | … | … | … | … | … | … | … | … |

**Penghitungan SUS (0–100):**

- Butir bernomor **ganjil** (1, 3, 5, 7, 9): skor = nilai − 1.
- Butir bernomor **genap** (2, 4, 6, 8, 10): skor = 5 − nilai.
- Jumlahkan sepuluh skor, lalu kalikan **2,5**.

Contoh: skala 1–5, butir ganjil 5 → 4; butir genap 1 → 4.

**Ringkasan temuan:**

| Tugas | Berhasil? | Kesalahan paling sering | Titik ragu | Usulan perbaikan |
|---|---|---|---|---|
| 1. Periksa pesan | …/N | … | … | … |
| 2. Memahami hasil | …/N | … | … | … |
| 3. Periksa tautan | …/N | … | … | … |
| 4. Latihan | …/N | … | … | … |
| 5. Penanganan insiden | …/N | … | … | … |

### 5.9 Panduan interpretasi

- **Prioritas perbaikan** jatuh pada tugas dengan tingkat gagal/sebagian tinggi,
  kesalahan kritis berulang, atau waktu jauh melampaui target (> 60 detik untuk
  T1/T2).
- **Pemahaman hasil (T2)** adalah indikator inti: jika ≥ 3 dari 10 peserta
  memperoleh nilai 0, perbaiki **penyajian hasil** (bukan sekadar menambah teks).
- **SUS** di bawah 68 menunjukkan masalah kegunaan yang perlu ditelusuri lebih
  dalam (ambang umum, bukan hasil pengujian Saring); kombinasi SUS rendah +
  kemudahan per tugas rendah menunjukkan tugas yang paling menyakitkan.
- Semua saran verbatim peserta dikumpulkan di kolom terakhir untuk prinsip
  perbaikan, bukan untuk dibuang.

---

## 6. Rujukan

- **Pemeriksaan pesan** — `tests/components/analyzer.test.tsx` dan blok
  "Periksa Pesan UX" di `tests/e2e/app.spec.ts`.
- **Kontras** — `scripts/contrast-audit.mjs` dan `tests/e2e/contrast.spec.ts`.
- **Kualitas deteksi** — `docs/EVALUASI-ANALISIS.md`.
- **Cakupan pengujian lengkap** — `docs/TESTING.md`.