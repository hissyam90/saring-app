# Naskah Video Demo 5 Menit — Saring

Dokumen ini adalah naskah video demonstrasi berdurasi **maksimal 5 menit** untuk
dikirim kepada juri kompetisi. Fokus pada demonstrasi produk dan alur pengguna,
bukan pembahasan kode atau algoritma.

- **Target durasi narasi:** 4 menit 50 detik (±10 detik cadangan sebelum batas).
- **Jumlah kata narasi:** ±645 kata (laju bicara ±135 kata/menit).
- **Sumber demo:** aplikasi produksi <https://saring.app> atau build lokal
  (`npm run build && npm run start`).
- **Sumber kebenaran:** seluruh menu, tombol, dan label di sini diverifikasi dari
  source code (`app/`, `components/`, `data/`). Bila ada yang berubah saat
  perekaman, ikuti tampilan aplikasi, bukan naskah ini.

Naskah lengkap per menu (termasuk alur demo yang lebih panjang dan materi tanya
jawab juri) ada di [PANDUAN-PRESENTASI.md](PANDUAN-PRESENTASI.md).

---

## Persiapan sebelum merekam

1. **Peramban desktop** dalam mode layar penuh, zoom nyaman (100–125%), font
   jelas untuk rekaman.
2. **Tutup tab lain** dan nonaktifkan notifikasi OS agar tidak muncul saat rekam.
3. **Periksa koneksi:** analisis pesan berjalan lokal, tetapi CAPTCHA dan reputasi
   tautan memerlukan jaringan.
4. **Mode terang (default)** disarankan agar teks terbaca jelas di video; mode
   gelap opsional sebagai penutup singkat bila waktu cukup.
5. **Siapkan akun uji** (bukan akun pribadi/inproduksi) jika ingin menayangkan
   bagian Akun/Admin secara singkat. Tanpa akun demo yang aman, bagian itu cukup
   dijelaskan lisan (lihat catatan potong di bawah).
6. Latih satu kali urutan klik agar perpindahan halaman mulus dan tidak melebihi
   5 menit.

## Data demo fiktif (sudah tersedia di aplikasi)

Gunakan hanya data contoh bawaan aplikasi, bukan data orang sungguhan.

| Bagian | Data yang dipakai |
|---|---|
| Periksa Pesan | Contoh bawaan **"Minta kode OTP"** (menu *Coba pesan contoh*) |
| Periksa Nomor | Nomor fiktif tidak rapi, misal `0812-3456-7890`, konteks **Meminta uang atau pinjaman** |
| Periksa Tautan | Contoh tautan mencurigakan fiktif (mis. penyingkat URL) |
| Latihan | Mode **Latihan cepat** (5 soal) |
| Langkah | Kondisi **Sudah mentransfer uang** |
| Pustaka | Pencarian kata kunci `QRIS` |

## Urutan klik dan navigasi

1. Beranda (`/`) → jelaskan identitas, prinsip, dan bagian *Coba langsung*.
2. **Periksa** (`/periksa`) → tab *Periksa Pesan* → *Coba pesan contoh* → "Minta kode OTP".
3. Tab *Periksa Nomor* → isi nomor → pilih konteks → *Nilai nomor ini*.
4. Tab *Periksa Tautan* → isi tautan → *Periksa tautan* (tanpa centang, lalu dengan centang persetujuan).
5. **Latihan** (`/latihan`) → tunjuk *Cara penilaian* → *Latihan cepat*.
6. **Langkah** (`/langkah`) → pilih *Sudah mentransfer uang*.
7. **Pustaka** (`/pustaka`) → pencarian `QRIS` → buka satu artikel.
8. **Komunitas** (`/komunitas`) → pencarian/filter → buka satu pertanyaan.
9. **Akun** (`/akun`) dan **Admin** (`/admin`) → jelaskan singkat (opsional tayangkan bila sudah masuk).
10. Kembali ke beranda → penutup.

## Bagian yang boleh dipercepat atau dipotong jika mendekati 5 menit

- **Tabel potong (prioritas):** Akun & Admin (00:03:55–00:04:25) → jelaskan lisan
  tanpa berpindah layar, hemat ±30 detik.
- **Potong kedua:** demonstrasi ketiga mode Periksa → cukup tunjukkan **Pesan**
  secara penuh, sebut Nomor dan Tautan dalam 1–2 kalimat.
- **Potong ketiga:** Pustaka dan Komunitas → pertahankan, cukup jangan buka
  halaman detail artikel.

---

## Naskah per segmen

### 00:00–00:20 | Pembukaan

**Layar:** Beranda, judul *Saring Sebelum Sharing. Periksa Sebelum Percaya.*

**Aksi:** Berdiri/berbicara ke kamera, layar menampilkan beranda.

**Narasi:**

"Selamat pagi, saya [nama]. Saya perkenalkan **Saring** — pendamping kepercayaan
digital yang membantu orang berhenti sejenak sebelum merespons pesan, nomor, atau
tautan yang mencurigakan. Tagline-nya: *Saring Sebelum Sharing, Periksa Sebelum
Percaya*."

---

### 00:20–00:45 | Beranda dan gambaran produk

**Layar:** Beranda — bagian *Coba langsung*, *Prinsip kami*, *Kalau sudah terlanjur*.

**Aksi:** Gulir pelan ke bawah beranda sambil menjelaskan.

**Narasi:**

"Penipuan daring bekerja lewat tekanan: rasa takut, tenggat mendesak, janji
keuntungan, dan peniruan pihak resmi. Korban biasanya bertindak sebelum sempat
memeriksa. Saring masuk tepat di jeda itu. Di beranda ada tiga bagian: *Coba
langsung* untuk memeriksa tanpa berpindah halaman, *Prinsip kami* soal cara kami
mengambil keputusan, dan *Kalau sudah terlanjur* yang mengarah ke langkah
pemulihan. Kita lanjut ke alat pemeriksaannya."

---

### 00:45–01:20 | Periksa Pesan

**Layar:** Menu Periksa, tab *Periksa Pesan*. Pilih contoh, hasil analisis tampil.

**Aksi:**

1. Klik menu **Periksa**.
2. Buka **Coba pesan contoh**, pilih **"Minta kode OTP"**.
3. Tunjuk daftar sinyal, kutipan bukti, dan *Yang belum dapat dipastikan*.

**Narasi:**

"Menu Periksa punya tiga pemeriksaan dalam satu tempat. Saya mulai dari pesan.
Saya buka *Coba pesan contoh* dan pilih 'Minta kode OTP' — contoh fiktif bawaan
aplikasi. Analisis langsung berjalan di peramban; isi pesannya tidak dikirim dan
tidak disimpan ke server.

Hasilnya bukan satu angka. Ada daftar sinyal, misalnya permintaan kode rahasia
dan peniruan layanan pelanggan, masing-masing dengan kutipan teks dan alasannya.
Ada juga bagian *Yang belum dapat dipastikan* — karena Saring tidak tahu siapa
pengirim sebenarnya, dan kami nyatakan itu secara terbuka. Saring tidak pernah
memberi label aman."

---

### 01:20–01:40 | Periksa Nomor

**Layar:** Tab *Periksa Nomor*. Nomor ternormalisasi + hasil penilaian perilaku.

**Aksi:**

1. Klik tab **Periksa Nomor**.
2. Isi nomor tidak rapi `0812-3456-7890`, centang konteks **Meminta uang atau pinjaman**.
3. Klik **Nilai nomor ini**, tunjuk baris nomor ternormalisasi.

**Narasi:**

"Tab kedua, Periksa Nomor. Perhatikan nomornya saya tulis tidak rapi. Saring
menormalkannya dulu, jadi penulisan berbeda tetap dikenali sebagai satu nomor.
Saya pilih konteks perilaku pengirim — di sini meminta uang. Saring **tidak**
punya database reputasi nomor, dan saya jujur soal itu: penilaiannya berasal dari
perilaku yang dilaporkan, lalu diarahkan ke kanal pelaporan resmi."

---

### 01:40–02:00 | Periksa Tautan

**Layar:** Tab *Periksa Tautan*. Inspeksi lokal + status reputasi (opsional).

**Aksi:**

1. Klik tab **Periksa Tautan**, isi tautan mencurigakan fiktif.
2. Klik **Periksa tautan** tanpa centang persetujuan → tunjuk hasil lokal.
3. Centang persetujuan, periksa ulang → tunjuk status reputasi.

**Narasi:**

"Tab ketiga, Periksa Tautan. Inspeksi struktur berjalan lokal: penyingkat URL,
alamat IP mentah, atau HTTP tanpa enkripsi — tanpa pernah membuka tautannya.
Reputasi Google Safe Browsing adalah lapisan kedua yang opsional: baru dipanggil
setelah pengguna mencentang persetujuan. Jadi privasi terjaga, dan kalau layanan
gagal, hasil lokal tetap tampil, tidak dihapus."

---

### 02:00–02:35 | Latihan

**Layar:** Menu Latihan. *Cara penilaian*, lalu *Latihan cepat*.

**Aksi:**

1. Klik menu **Latihan**, tunjuk kotak **Cara penilaian**.
2. Pilih **Latihan cepat**, jawab satu soal, tunjuk umpan balik.

**Narasi:**

"Setelah tahu cara memeriksa, langkah berikutnya melatih kebiasaan memutuskan.
Menu Latihan berisi bank skenario fiktif. Sebelum mulai saya tunjukkan *Cara
penilaian*: nilai 100 untuk langkah terbaik, 50 untuk yang hati-hati tapi masih
ada celah, dan 0 untuk yang berisiko. Saya pilih *Latihan cepat*, lima soal acak.
Umpan balik muncul setelah memilih, menjelaskan risiko dan langkah yang lebih
baik. Di akhir ada ringkasan — dan skor ini hanya menggambarkan sesi tadi, bukan
kemampuan keamanan digital seseorang di dunia nyata."

---

### 02:35–03:00 | Langkah

**Layar:** Menu Langkah. Kondisi *Sudah mentransfer uang*, lima bagian panduan.

**Aksi:**

1. Klik menu **Langkah**.
2. Pilih kondisi **Sudah mentransfer uang**.
3. Tunjuk urutan bagian dan rujukan kanal resmi OJK.

**Narasi:**

"Menu Langkah menjawab pertanyaan yang muncul setelah panik mereda: 'lalu apa?'
Ada enam kondisi. Saya pilih yang paling berat, *sudah mentransfer uang*.
Panduannya disusun berurutan: hubungi bank lewat kanal resmi, simpan bukti, lalu
lapor — termasuk rujukan kanal resmi OJK. Halaman ini juga bisa dibuka langsung
dari hasil pemeriksaan, jadi pengguna tidak perlu mencari menu ini secara manual."

---

### 03:00–03:25 | Pustaka

**Layar:** Menu Pustaka. Pencarian `QRIS`, buka satu artikel.

**Aksi:**

1. Klik menu **Pustaka**, ketik `QRIS` di kolom **Cari topik**.
2. Tunjuk hasil menyempit, lalu buka satu artikel.

**Narasi:**

"Pustaka berisi empat belas artikel edukasi untuk membangun literasi digital.
Ada pencarian — saya coba 'QRIS', dan hasilnya langsung menyempit. Setiap artikel
punya daftar isi, daftar periksa, dan sumber rujukan resmi. Pengguna yang sudah
masuk bisa menyimpan artikel untuk dibaca ulang."

---

### 03:25–03:55 | Komunitas

**Layar:** Menu Komunitas. Pencarian/filter, satu pertanyaan, tombol laporan.

**Aksi:**

1. Klik menu **Komunitas**, tunjuk pencarian dan filter kategori.
2. Buka satu pertanyaan, tunjuk form balasan dan tombol laporan.

**Narasi:**

"Komunitas adalah ruang tanya jawab publik, karena banyak kasus penipuan mirip
tapi tidak identik. Pengguna terdaftar bisa membalas, memakai pencarian dan
filter kategori, serta melaporkan konten yang melanggar — laporan masuk antrean
moderasi, tidak otomatis menghapus. Ada juga pengajuan artikel lewat editor rich
text dengan draf otomatis, yang terbit setelah ditinjau admin."

---

### 03:55–04:25 | Akun dan Administrasi

**Layar:** Akun (tema, draf, tersimpan) dan/atau admin (antrean, revisi, laporan).
Bila tidak ada akun demo, jelaskan lisan tanpa berpindah halaman.

**Aksi (opsional, jika sudah masuk sebagai akun uji):**

1. Buka **Akun** → tunjuk *Preferensi tampilan*, *Draf saya*, *Artikel tersimpan*.
2. Buka **Admin** → tunjuk *Antrean artikel* dan *Laporan*.

**Narasi:**

"Bagian akun memusatkan tema tampilan, draf, pertanyaan, dan artikel tersimpan
dalam satu tempat. Di sisi admin ada antrean artikel, perbandingan revisi,
laporan lengkap dengan konteksnya, dan pengelolaan pengguna — seluruh aksi
diperiksa ulang di server. Karena waktu, saya tidak membedah detailnya."

---

### 04:25–04:50 | Kesimpulan

**Layar:** Kembali ke beranda, diam sejenak.

**Aksi:** Kembali ke beranda, bicara ke kamera.

**Narasi:**

"Saring berangkat dari satu pengamatan: banyak kerugian terjadi bukan karena
orang kurang pintar, tetapi karena mereka terburu-buru. Seluruh produk ini
dirancang untuk menciptakan jeda — memeriksa, melatih, memandu, dan menjelaskan.

Yang membedakan Saring menurut saya bukan jumlah fiturnya, melainkan yang sengaja
tidak kami lakukan: tidak memberi label aman, tidak mengarang hasil saat data
tidak tersedia, dan tidak mengirim data pengguna tanpa izin. Terima kasih."

---

## Ringkasan durasi

| Segmen | Waktu | Durasi |
|---|---|---|
| Pembukaan | 00:00–00:20 | 20 dtk |
| Beranda | 00:20–00:45 | 25 dtk |
| Periksa Pesan | 00:45–01:20 | 35 dtk |
| Periksa Nomor | 01:20–01:40 | 20 dtk |
| Periksa Tautan | 01:40–02:00 | 20 dtk |
| Latihan | 02:00–02:35 | 35 dtk |
| Langkah | 02:35–03:00 | 25 dtk |
| Pustaka | 03:00–03:25 | 25 dtk |
| Komunitas | 03:25–03:55 | 30 dtk |
| Akun & Admin | 03:55–04:25 | 30 dtk |
| Kesimpulan | 04:25–04:50 | 25 dtk |
| **Total** | | **4 menit 50 detik** |

Jumlah kata narasi: ±645 kata.