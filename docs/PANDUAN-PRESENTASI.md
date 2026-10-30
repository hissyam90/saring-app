# Panduan Presentasi Saring

Dokumen ini adalah naskah siap baca untuk demo langsung Saring. Urutannya
mengikuti alur penggunaan aplikasi yang sebenarnya, dari halaman pembuka sampai
penutup.

**Sebelum mulai**

- Buka `https://saring.app` di peramban desktop. Perbesar tampilan bila ruangan
  besar, dan tutup tab lain agar tidak ada notifikasi yang muncul.
- Siapkan satu akun uji yang sudah terdaftar. Jangan memakai akun pribadi untuk
  demo.
- Periksa koneksi internet: analisis pesan berjalan lokal, tetapi CAPTCHA dan
  reputasi tautan memerlukan jaringan.
- Durasi total naskah ini sekitar 12–15 menit. Bila waktu terbatas, lewati bagian
  9–12 (artikel, akun, admin, notifikasi) lalu langsung ke arsitektur.

**Istilah yang dipakai**

- **Sudah ada** berarti fitur benar-benar berjalan di aplikasi.
- **Rencana** berarti belum diimplementasikan dan tidak boleh diklaim sebagai
  fitur.

---

## 1. Pembukaan

### Menu: Beranda

**Teks yang dibaca:**

"Selamat pagi, saya [nama]. Saya akan memperkenalkan **Saring**, sebuah
pendamping kepercayaan digital yang membantu orang berhenti sejenak sebelum
bereaksi terhadap pesan, nomor, atau tautan yang mencurigakan.

Ide awalnya sederhana. Penipuan daring sekarang bekerja dengan tekanan: rasa
takut, batas waktu yang mendesak, janji keuntungan yang tidak masuk akal, dan
peniruan pihak resmi. Yang sering terjadi, korban bertindak dulu sebelum sempat
memeriksa. Saring masuk tepat di jeda itu.

Judul di layar, *Saring Sebelum Sharing*, dan kalimat di bawahnya, *Periksa
Sebelum Percaya*, merangkum posisi produk ini. Saring tidak memutuskan sebuah
pesan penipuan atau bukan. Saring menunjukkan sinyal yang terdeteksi, menjelaskan
alasannya, lalu memberi langkah lanjutan yang bisa langsung dilakukan.

Karena itu hasil Saring tidak pernah berupa label 'aman'. Yang ditampilkan adalah
tingkat sinyal bahaya dan hal-hal yang belum bisa dipastikan."

**Teks transisi:**

"Di halaman ini ada tiga bagian. Bagian **Coba langsung** memuat alat pemeriksaan
yang sama dengan halaman Periksa, supaya pengunjung bisa mencoba tanpa berpindah
halaman. Bagian **Prinsip kami** menjelaskan cara kami mengambil keputusan desain.
Dan bagian **Kalau sudah terlanjur** mengarahkan ke panduan bila pengguna baru
saja mengalami insiden. Saya mulai dari alat pemeriksaannya."

---

## 2. Demonstrasi Fitur — Periksa Pesan

### Menu: Periksa

**Tujuan:** Menunjukkan cara Saring menganalisis pesan dan menjelaskan setiap
sinyal yang ditemukan, sepenuhnya di peramban.

**Aksi demo:**

1. Klik menu **Periksa** di sidebar, atau tombol **Buka halaman penuh** dari
   beranda.
2. Pastikan tab **Periksa Pesan** aktif.
3. Klik **Muat contoh fiktif** untuk mengisi pesan contoh bawaan aplikasi.
4. Klik **Periksa pesan**.
5. Tunjuk bagian "Sinyal yang terdeteksi", lalu buka salah satu temuan.
6. Gulir ke "Langkah yang disarankan" dan "Yang belum dapat dipastikan".

**Teks yang dibaca:**

"Pada menu Periksa ada tiga jenis pemeriksaan dalam satu tempat: pesan, nomor
telepon, dan tautan. Saya mulai dari yang paling sering dipakai, yaitu pesan.

Saya tekan **Muat contoh fiktif** supaya tidak perlu mengetik. Contoh ini memang
disiapkan aplikasi, bukan data orang lain. Setelah **Periksa pesan** ditekan,
hasilnya muncul seketika tanpa memuat halaman.

Yang penting di sini: analisisnya berjalan di peramban. Pesan yang saya tempel
tidak dikirim ke server dan tidak disimpan. Jadi pengguna tetap aman meskipun
menempelkan pesan yang isinya sensitif.

Hasilnya bukan satu angka saja. Ada daftar sinyal, misalnya permintaan kode
rahasia, ancaman pemblokiran akun, atau desakan waktu. Setiap temuan punya
kategori, tingkat keparahan, kutipan teks dari pesan saya sebagai bukti, dan
penjelasan mengapa itu dianggap sinyal.

Perhatikan bagian **Yang belum dapat dipastikan**. Ini bagian yang sengaja kami
tampilkan. Saring tidak tahu apakah pengirimnya benar-benar pihak resmi, jadi
aplikasi menyatakannya secara terbuka, bukan menutupinya dengan kesan yakin.

Skor yang muncul juga bukan peluang penipuan. Itu hanya total bobot indikator
yang dikenali aturan. Kami menuliskannya di layar supaya tidak disalahartikan
sebagai probabilitas statistik."

---

## 3. Periksa Nomor

### Menu: Periksa

**Tujuan:** Menunjukkan normalisasi nomor dan penilaian berbasis perilaku
pengirim, sekaligus menjelaskan batasannya secara jujur.

**Aksi demo:**

1. Klik tab **Periksa Nomor**.
2. Isi kolom nomor dengan format tidak rapi, misalnya `0812-3456-7890`.
3. Centang salah satu konteks perilaku, misalnya **Meminta uang atau pinjaman**.
4. Klik **Nilai nomor ini**.
5. Tunjuk baris "Nomor ternormalisasi" dan bagian "Langkah berikutnya".

**Teks yang dibaca:**

"Tab kedua adalah Periksa Nomor. Perhatikan bahwa saya menulis nomornya dengan
tanda hubung. Saring menormalkan formatnya lebih dulu, sehingga nomor yang sama
dengan penulisan berbeda tetap dikenali sebagai satu nomor.

Saya juga memilih konteks perilaku pengirim, dalam contoh ini meminta uang.
Konteks ini penting karena angka nomor saja tidak memberi tahu apa pun. Yang bisa
dinilai adalah perilaku yang dilaporkan bersama nomor itu.

Saya perlu jujur di bagian ini: Saring **tidak** punya akses ke database reputasi
nomor telepon. Tidak ada API gratis yang bisa kami pakai, dan kami tidak mau
menampilkan hasil karangan. Karena itu penilaian nomor disusun dari perilaku yang
dilaporkan, dan aplikasi mengarahkan pengguna ke kanal pelaporan resmi untuk
pemeriksaan lebih lanjut.

Justru ini salah satu prinsip kami: lebih baik menyatakan keterbatasan daripada
memberi rasa aman yang palsu."

---

## 4. Periksa Tautan

### Menu: Periksa

**Tujuan:** Menunjukkan dua lapis pemeriksaan tautan — inspeksi struktur secara
lokal dan reputasi eksternal yang hanya berjalan setelah pengguna menyetujui.

**Aksi demo:**

1. Klik tab **Periksa Tautan**.
2. Isi kolom tautan dengan alamat yang bentuknya mencurigakan, misalnya tautan
   pendek.
3. Klik **Periksa tautan** tanpa mencentang persetujuan, lalu tunjuk bahwa
   inspeksi lokal tetap berjalan.
4. Centang kotak persetujuan, lalu periksa ulang.
5. Tunjuk status reputasi beserta keterangan penyedianya.

**Teks yang dibaca:**

"Tab ketiga adalah Periksa Tautan, dan ini bagian yang paling jelas menunjukkan
pendekatan privasi kami.

Inspeksi pertama berjalan lokal. Saring membaca struktur tautannya: apakah
memakai penyingkat URL, apakah memakai alamat IP mentah, apakah memakai HTTP
tanpa enkripsi. Tautannya sendiri tidak pernah dibuka. Jadi kami bisa memberi
sinyal tanpa menyentuh situs tujuannya.

Pemeriksaan reputasi adalah lapisan kedua, dan lapisan ini opsional. Ada kotak
persetujuan yang harus dicentang pengguna. Kalau tidak dicentang, tautan tidak
dikirim ke mana pun. Ini penting karena mengirim URL ke layanan luar berarti
membocorkan informasi tentang apa yang sedang diperiksa pengguna.

Kalau disetujui, server Saring yang menghubungi penyedia reputasi. Kunci API
disimpan di server dan tidak pernah sampai ke peramban.

Perhatikan status yang ditampilkan. Ada status 'tidak ada kecocokan', ada 'belum
dikonfigurasi', ada juga status saat layanan tidak bisa dihubungi. Semua status
selain ancaman yang terkonfirmasi tetap bukan bukti bahwa tautan itu aman. Kalau
layanan gagal, hasil inspeksi lokal tetap ditampilkan, tidak dihapus."

**Teks transisi:**

"Sampai sini pengguna sudah tahu cara memeriksa. Tapi tahu saja tidak cukup.
Bagian berikutnya melatih kebiasaan memutuskan."

---


## 5. Latihan

### Menu: Latihan

**Tujuan:** Menunjukkan latihan berbasis skenario dengan penilaian yang
dijelaskan, bukan sekadar benar-salah.

**Aksi demo:**

1. Klik menu **Latihan**.
2. Tunjuk kotak **Cara penilaian** yang menjelaskan nilai 100, 50, dan 0.
3. Pilih **Latihan cepat** (5 soal).
4. Jawab satu soal, lalu tunjuk umpan balik yang muncul setelah memilih.
5. Lanjutkan sampai ringkasan **Hasil sesi**.

**Teks yang dibaca:**

"Menu Latihan berisi bank skenario fiktif yang saya susun dari modus yang paling
sering terjadi: permintaan OTP, ancaman pemblokiran akun, lowongan kerja
berbiaya, tugas online, transaksi di luar aplikasi, sampai percakapan yang
sebenarnya normal.

Sebelum mulai, saya tunjukkan dulu **Cara penilaian**. Nilai 100 untuk langkah
terbaik yang menutup risiko utama, 50 untuk langkah yang sudah hati-hati tapi
masih menyisakan celah, dan 0 untuk langkah berisiko. Saya sengaja menjelaskan
ini di awal supaya skor di akhir tidak terasa seperti kotak hitam.

Saya pilih **Latihan cepat**, lima soal. Soal diambil acak dari bank skenario,
tanpa pengulangan dalam satu sesi.

Umpan balik baru muncul setelah saya memilih, bukan sebelumnya. Jadi ini bukan
soal pilihan ganda biasa yang bisa ditebak. Setelah memilih, saya melihat risiko
dari pilihan saya, langkah yang seharusnya diambil, dan alasan mengapa langkah
itu lebih baik.

Di akhir sesi ada ringkasan: poin, persentase, jumlah keputusan terbaik, skor per
kategori, dan daftar soal yang perlu dipelajari ulang. Yang perlu dicatat, skor
ini hanya menggambarkan sesi tadi, bukan ukuran kemampuan keamanan digital
seseorang di dunia nyata. Kami menuliskannya di layar."

---

## 6. Langkah

### Menu: Langkah

**Tujuan:** Menunjukkan panduan tindakan setelah insiden, yang juga bisa dibuka
langsung dari hasil pemeriksaan.

**Aksi demo:**

1. Klik menu **Langkah**.
2. Pilih kondisi **Sudah mentransfer uang**.
3. Tunjuk urutan lima bagian: lakukan sekarang, setelah itu, bukti yang perlu
   disimpan, yang perlu diperiksa, dan sumber bantuan resmi.
4. Tunjuk tautan sumber resmi OJK.

**Teks yang dibaca:**

"Menu Langkah menjawab pertanyaan yang muncul setelah panik mereda: 'lalu apa?'

Ada enam kondisi yang bisa dipilih: baru menerima pesan, terlanjur membuka
tautan, sudah memasukkan kata sandi atau OTP, sudah mentransfer uang, akun
mungkin diambil alih, dan sudah membagikan dokumen pribadi.

Saya pilih yang paling berat, **sudah mentransfer uang**. Panduannya disusun
berurutan karena urutan memang penting. Yang pertama adalah menghubungi bank atau
penyedia dompet digital lewat kanal resmi, bukan lewat nomor yang mungkin dikirim
penipu. Setelah itu menyimpan bukti, lalu melapor.

Bagian **bukti yang perlu disimpan** saya anggap krusial. Banyak orang kehilangan
kesempatan memblokir transaksi karena buktinya sudah terhapus. Saring mengingatkan
apa saja yang perlu diamankan sebelum hilang.

Terakhir ada tautan sumber bantuan resmi, termasuk kanal OJK. Perlu saya tegaskan:
Saring tidak menjanjikan dana kembali. Yang kami lakukan adalah memastikan
pengguna tahu urutan tindakan dan ke mana harus melapor.

Halaman ini juga bisa dibuka langsung dari hasil pemeriksaan. Jadi kalau pengguna
baru memeriksa pesan dan ternyata sudah terlanjur, mereka tidak perlu mencari
menu ini secara manual."

**Teks transisi:**

"Setelah pengguna tahu harus berbuat apa, pertanyaan berikutnya biasanya: 'kenapa
saya tidak tahu sebelumnya?' Di situlah Pustaka berperan."

---

## 7. Pustaka

### Menu: Pustaka

**Tujuan:** Menunjukkan materi edukasi yang bisa dicari, dibaca, dan disimpan.

**Aksi demo:**

1. Klik menu **Pustaka**.
2. Ketik kata kunci di kolom **Cari topik pustaka**, misalnya `qris`.
3. Tunjukkan hasil menyempit dan penghitung artikel.
4. Buka satu artikel.
5. Tunjuk daftar isi, daftar periksa, sumber rujukan, dan artikel terkait.
6. Klik tombol simpan pada artikel.

**Teks yang dibaca:**

"Pustaka berisi 14 artikel edukasi. Setiap artikel punya halaman sendiri, bukan
isinya dibentangkan di daftar, supaya nyaman dibaca sampai selesai.

Saya coba cari 'qris'. Hasilnya langsung menyempit, dan penghitung artikel di
atas ikut berubah. Pencariannya sederhana, tapi cukup untuk menemukan topik saat
presentasi atau saat pengguna butuh jawaban cepat.

Saya buka satu artikel. Strukturnya konsisten: ada daftar isi, isi yang dibagi
per bagian, contoh kasus, langkah praktis, daftar periksa, dan yang paling penting,
sumber rujukan resmi.

Estimasi waktu baca di setiap kartu dihitung dari panjang teks artikel yang
sebenarnya, bukan angka tetap. Jadi tidak ada klaim 'baca 3 menit' untuk artikel
yang jauh lebih panjang.

Kalau pengguna masuk, artikel bisa disimpan. Tombol simpan tadi menyimpannya ke
akun, dan daftarnya bisa dibuka lagi kapan saja dari menu akun."

**Teks transisi:**

"Materi edukasi bersifat satu arah. Karena itu kami menambahkan ruang diskusi
tempat pengguna bisa bertanya tentang kasus yang mereka alami sendiri."

---


## 8. Komunitas

### Menu: Komunitas

**Tujuan:** Menunjukkan ruang tanya jawab publik, termasuk pelaporan konten yang
bermasalah.

**Aksi demo:**

1. Klik menu **Komunitas**.
2. Ketik kata kunci di kolom pencarian, lalu tunjuk filter kategori.
3. Buka salah satu pertanyaan.
4. Tunjuk form balasan.
5. Tunjuk tombol laporan pada sebuah balasan.

**Teks yang dibaca:**

"Komunitas adalah ruang tanya jawab publik. Bagian ini saya buat karena banyak
kasus penipuan itu mirip tapi tidak identik. Pengguna sering butuh bertanya
tentang situasi spesifiknya, bukan membaca panduan umum.

Ada pencarian, filter kategori, dan pagination supaya daftar tetap enak dibaca
saat jumlah pertanyaannya bertambah. Kategori defaultnya **Lainnya**, karena
banyak pertanyaan memang tidak pas masuk satu kategori tertentu.

Saya buka salah satu pertanyaan. Balasan hanya bisa dikirim oleh pengguna yang
sudah masuk, dan setiap pengiriman melewati verifikasi CAPTCHA di server. Jadi
form ini tidak bisa dibanjiri bot.

Ada juga tombol laporan. Kalau ada balasan yang melanggar pedoman, pengguna bisa
melaporkannya, dan laporan itu masuk ke antrean moderasi admin. Kami sengaja tidak
membuat pelaporan otomatis menghapus konten, karena laporan pengguna belum tentu
benar. Moderator yang memutuskan.

Satu hal yang perlu saya sebut: identitas pelapor tidak pernah ditampilkan ke
publik. Moderator melihat laporan dan isi kontennya, bukan menyebarkan identitas
pelapor."

**Teks transisi:**

"Diskusi membantu menjawab pertanyaan singkat. Tapi kalau pengguna ingin menulis
penjelasan yang lebih panjang dan rapi, mereka bisa mengajukan artikel."

---

## 9. Komunitas Artikel dan Editor

### Menu: Komunitas → Ajukan artikel

**Tujuan:** Menunjukkan alur kontribusi artikel: menulis, menyimpan draf, dan
proses tinjauan sebelum terbit.

**Aksi demo:**

1. Klik menu **Komunitas**, lalu tombol menuju halaman **Ajukan artikel Pustaka**.
2. Tulis beberapa kalimat di area editor.
3. Gunakan tombol format: tebal, judul, daftar.
4. Tunjuk tombol **Sisipkan gambar atau media**.
5. Tunggu sebentar, lalu tunjuk indikator draf tersimpan otomatis.
6. Muat ulang halaman untuk menunjukkan draf pulih.

**Teks yang dibaca:**

"Editor artikel ini memakai rich text, jadi penulis bisa memakai judul, daftar,
kutipan, tautan, gambar, dan embed media. Semua format itu disimpan sebagai
struktur data, bukan HTML mentah. Ini keputusan keamanan yang penting: kalau yang
disimpan adalah HTML, penulis bisa menyelipkan skrip. Dengan struktur data,
hanya format yang kami izinkan yang bisa masuk.

Gambar bisa berasal dari hosting HTTPS mana pun, dan untuk galeri Imgur kami
mendukung embed resminya. Kalau embed gagal dimuat, pembaca tetap mendapat tautan
pengganti yang aman, jadi tidak pernah ada kotak kosong tanpa jalan keluar.

Bagian yang paling saya sukai: draf tersimpan otomatis. Perhatikan indikatornya
setelah saya berhenti mengetik. Saya coba muat ulang halaman. Isi tulisan saya
kembali. Ini penting karena menulis artikel panjang di ponsel rawan terputus.

Setelah dikirim, artikel tidak langsung terbit. Statusnya menunggu tinjauan.
Admin bisa menyetujui, meminta revisi dengan catatan, atau menolak dengan alasan.
Hanya artikel yang disetujui yang muncul di Pustaka publik.

Kalau artikel sudah terbit dan penulis ingin memperbaiki, ada alur revisi. Yang
penting di sini: versi publik yang sedang tayang tidak hilang saat revisi masih
menunggu. Revisi baru menggantikan versi publik setelah disetujui admin."

**Teks transisi:**

"Semua yang tadi saya tunjukkan tadi mengarah ke satu hal: pengelolaan. Saya
tunjukkan sisi admin sebentar."

---

## 10. Akun Saya

### Menu: Akun

**Tujuan:** Menunjukkan pusat kendali pengguna: preferensi tampilan, draf,
pertanyaan, pengajuan artikel, dan artikel tersimpan.

**Aksi demo:**

1. Klik **Akun saya** di bagian bawah sidebar.
2. Tunjuk panel **Preferensi tampilan** dan ganti tema.
3. Tunjuk **Draf saya**, **Pertanyaan saya**, dan **Pengajuan artikel**.
4. Buka **Artikel tersimpan**.
5. Kembali, lalu tunjukkan tombol arsip pada artikel yang sudah terbit.

**Teks yang dibaca:**

"Halaman Akun adalah pusat kendali pengguna. Semua yang mereka buat ada di sini,
dalam satu tempat.

Yang pertama, **Preferensi tampilan**. Ada tiga pilihan: Terang, Gelap, dan Ikuti
sistem. Default untuk pengunjung baru adalah Terang. Pilihan ini disimpan di
peramban, bukan di database, karena ini preferensi perangkat, bukan data akun.

Berikutnya **Draf saya**. Draf dari editor artikel dan form pertanyaan muncul di
sini, dan bisa dilanjutkan atau dihapus.

Lalu **Pertanyaan saya** dan **Pengajuan artikel**. Untuk artikel, statusnya
terlihat jelas: menunggu tinjauan, perlu revisi, disetujui, atau ditolak, lengkap
dengan catatan dari admin.

Untuk artikel yang sudah terbit, ada tombol arsip. Ini bukan hapus. Artikelnya
tetap ada, riwayat revisinya tetap utuh, tapi disembunyikan dari Pustaka publik
dan tidak bisa diakses lewat URL langsung. Penulis bisa memulihkannya kapan saja.
Saya sengaja memilih arsip, bukan hapus, supaya tidak ada karya yang hilang
karena salah tekan.

Terakhir, **Artikel tersimpan**. Artikel Pustaka yang saya simpan tadi muncul di
sini, dan tetap ada setelah saya keluar lalu masuk lagi."

---


## 11. Admin Dashboard

### Menu: Admin

**Tujuan:** Menunjukkan alur moderasi: tinjauan artikel, perbandingan revisi,
penanganan laporan, dan pengelolaan pengguna.

**Aksi demo:**

1. Masuk dengan akun admin, lalu klik **Admin** di sidebar.
2. Tunjuk ringkasan angka, lalu panel **Antrean artikel**.
3. Buka satu artikel, tunjuk isi lengkap beserta formatnya.
4. Pindah ke **Revisi**, tunjuk perbandingan versi publik dan usulan.
5. Pindah ke **Laporan**, tunjuk konteks balasan yang dilaporkan.
6. Tunjuk aksi status yang tersedia pada laporan itu.
7. Pindah ke **Pengguna**, tunjuk kolom role.

**Teks yang dibaca:**

"Halaman admin adalah sisi yang jarang dilihat pengguna, tapi menentukan kualitas
konten yang terbit.

Di ringkasan ada angka nyata dari database: berapa artikel menunggu, berapa
laporan terbuka, berapa pengguna. Tidak ada angka contoh di sini.

Di **Antrean artikel**, saya bisa membaca isi lengkap dengan format aslinya,
bukan hanya ringkasan. Itu penting karena banyak masalah kualitas konten baru
terlihat saat membaca keseluruhan. Saya punya tiga pilihan: setujui, minta revisi
dengan catatan, atau tolak dengan alasan. Permintaan revisi dan penolakan wajib
disertai catatan, supaya penulis tahu apa yang harus diperbaiki.

Di **Revisi**, saya melihat perbandingan antara versi publik yang sedang tayang
dan versi usulan. Jadi saya bisa menilai perubahannya secara spesifik, bukan
menerima atau menolak berdasarkan judul saja.

Di **Laporan**, ini bagian yang baru kami rapikan. Untuk laporan yang menargetkan
sebuah balasan, saya tidak hanya melihat ID. Saya melihat judul diskusi induknya,
isi balasan yang dilaporkan, dan penulis balasan itu, lalu ada tautan langsung ke
diskusi aslinya. Tanpa konteks itu, moderator harus menebak, dan itu rawan salah
tindakan.

Perhatikan juga tombol aksinya. Tombol yang muncul menyesuaikan status laporan
saat ini, jadi saya tidak ditawari aksi yang tidak relevan atau transisi ke status
yang sama. Laporan yang sudah selesai tetap ada di riwayat, tidak dihapus.

Di **Pengguna**, admin bisa menaikkan role. Ada satu pengaman: admin tidak bisa
menurunkan role akunnya sendiri, supaya tidak terkunci di luar dashboard.

Semua aksi di halaman ini melewati satu endpoint yang memeriksa ulang role saya
di server, dan setiap aksi tercatat di riwayat moderasi."

---

## 12. Notifikasi

### Menu: Notifikasi

**Tujuan:** Menunjukkan notifikasi dalam aplikasi yang terhubung ke peristiwa
nyata di database.

**Aksi demo:**

1. Klik ikon lonceng di sidebar atau header.
2. Tunjuk daftar notifikasi dan jumlah yang belum dibaca.
3. Klik **Tandai semua**, lalu tunjuk badge berubah.

**Teks yang dibaca:**

"Notifikasi di Saring bukan pengingat buatan. Isinya hanya peristiwa nyata:
balasan baru pada pertanyaan saya, keputusan admin atas artikel saya, atau
keputusan atas revisi saya.

Saya sengaja tidak memakai email, SMS, atau WebSocket. Alasannya sederhana:
untuk kebutuhan sebesar ini, notifikasi di dalam aplikasi sudah cukup, dan
menambah kanal lain berarti menambah data pribadi yang harus kami simpan. Panel
ini memperbarui dirinya setiap satu menit saat tab sedang aktif, dan langsung
menyegarkan ketika pengguna kembali ke tab.

Kalau penandaan 'sudah dibaca' gagal karena jaringan, panel memberi tahu dan
mengembalikan status sebelumnya. Jadi tampilan tidak berbohong tentang apa yang
sudah tersimpan di server."

**Teks transisi:**

"Secara tampilan sudah cukup. Saya masuk sebentar ke sisi teknis, karena beberapa
keputusan arsitektur menjelaskan mengapa produk ini berperilaku seperti tadi."

---


## 13. Arsitektur Secara Singkat

### Menu: (tidak ada — tampilkan diagram arsitektur)

**Tujuan:** Menjelaskan struktur sistem tanpa masuk ke detail implementasi.

**Aksi demo:** Tampilkan `docs/assets/diagrams/system-overview.svg` di layar, atau
buka bagian arsitektur di README.

**Teks yang dibaca:**

"Saring dibangun dengan Next.js dan React, TypeScript di seluruh kode, Tailwind
untuk tampilan, dan PostgreSQL untuk data.

Ada empat lapisan. Yang pertama, peramban. Di sini dua hal berjalan: antarmuka,
dan mesin aturan yang murni. Mesin aturan itu tidak memanggil jaringan sama sekali.
Fungsinya menerima teks, lalu mengembalikan daftar sinyal. Karena murni dan
deterministik, mesin ini bisa diuji tanpa peramban dan hasilnya selalu sama untuk
masukan yang sama.

Lapisan kedua, server Next.js. Ini menangani autentikasi, API komunitas, moderasi,
dan satu endpoint reputasi URL.

Lapisan ketiga, PostgreSQL. Semua yang perlu bertahan disimpan di sini: akun,
artikel, revisi, draf, bookmark, notifikasi, laporan, dan penghitung rate limit.
Tidak ada data penting yang hanya ada di memori atau di berkas lokal, karena
server bisa restart kapan saja.

Lapisan keempat, layanan eksternal. Hanya dua yang benar-benar dipakai: Google
Safe Browsing untuk reputasi URL, dan Cloudflare Turnstile untuk CAPTCHA.

Kenapa saya memisahkan mesin aturan dari server? Karena analisis pesan adalah
bagian yang paling sensitif secara privasi. Dengan menjalankannya di peramban,
tidak ada pesan pengguna yang perlu dikirim atau disimpan. Itu bukan tambahan
fitur, itu keputusan desain yang membentuk seluruh produk."

---

## 14. Keamanan dan Privasi

### Menu: (tidak ada — kembali ke Beranda)

**Tujuan:** Menjelaskan keputusan keamanan yang benar-benar diterapkan.

**Aksi demo:** Kembali ke beranda, tunjuk bagian **Prinsip kami**.

**Teks yang dibaca:**

"Ada beberapa hal yang saya pegang soal keamanan dan privasi.

Pertama, data yang tidak perlu tidak kami kumpulkan. Pesan yang diperiksa tidak
dikirim ke server. Tidak ada analitik pihak ketiga, dan tidak ada layanan AI
eksternal yang membaca isi pesan pengguna.

Kedua, otorisasi selalu diperiksa di server. Cookie sesi hanya menentukan siapa
yang sedang masuk, bukan apa yang boleh dilakukan. Setiap aksi admin membaca ulang
role dari database. Jadi kalau role seseorang diturunkan, efeknya langsung berlaku,
tidak menunggu sesi kedaluwarsa.

Ketiga, setiap operasi yang mengubah data melewati pemeriksaan asal permintaan.
Ini mencegah situs lain mengirim permintaan atas nama pengguna yang sedang masuk.

Keempat, operasi sensitif dilindungi berlapis: rate limit yang tersimpan di
database, CAPTCHA yang diverifikasi di server, dan validasi skema pada setiap
masukan. Kalau penyimpanan rate limit gagal, permintaan ditolak, bukan dibiarkan
lewat.

Kelima, halaman privat mengirim header yang mencegah penyimpanan cache bersama,
dan respons produksi membawa Content Security Policy. Kata sandi disimpan sebagai
hash, dan sesi memakai cookie terenkripsi yang tidak bisa dibaca peramban.

Satu hal yang perlu saya akui: CAPTCHA dan reputasi URL berarti ada data yang
keluar dari sistem kami. Karena itu reputasi URL hanya berjalan setelah pengguna
menyetujui, dan tautan tidak pernah dibuka oleh server kami."

---


## 15. Keterbatasan dan Rencana

### Menu: (tidak ada — tetap di halaman yang sedang dibuka)

**Tujuan:** Menyampaikan batasan produk secara jujur dan membedakannya dari
rencana pengembangan.

**Aksi demo:** Tidak perlu navigasi. Sampaikan bagian ini dengan tenang, tanpa
tergesa-gesa.

**Teks yang dibaca:**

"Saya ingin menutup dengan batasan, karena saya lebih nyaman menyebutkannya
daripada dibiarkan ditemukan sendiri.

**Yang sudah berjalan tapi punya batas.** Analisis pesan memakai aturan heuristik.
Artinya ia bisa melewatkan pola penipuan baru, dan bisa menandai pesan sah.
Pemeriksaan tautan juga heuristik; status 'tidak ada kecocokan' bukan bukti aman.
Nomor telepon tidak punya database reputasi, jadi penilaiannya berasal dari
perilaku yang dilaporkan. Skor Latihan hanya menggambarkan sesi latihan, bukan
kemampuan di dunia nyata. Dan seluruh hasil Saring adalah dukungan keputusan,
bukan bukti atau jaminan.

**Yang masih berupa rencana.** Pelaporan artikel belum didukung; saat ini laporan
hanya untuk pertanyaan dan balasan. Integrasi database reputasi nomor telepon juga
belum ada, karena belum ada penyedia gratis yang bisa kami verifikasi. Notifikasi
belum dikirim lewat email atau push. Semua ini saya sebut rencana, bukan fitur,
karena memang belum berjalan di aplikasi.

Saya memilih menyatakan batasan ini di depan karena dalam produk seperti ini,
kejujuran soal ketidakpastian justru bagian dari desainnya."

---

## 16. Penutupan

### Menu: Beranda

**Tujuan:** Menutup presentasi dengan ringkasan singkat dan satu pesan yang mudah
diingat.

**Aksi demo:** Kembali ke beranda. Biarkan halaman diam sejenak.

**Teks yang dibaca:**

"Saring berangkat dari satu pengamatan sederhana: banyak kerugian terjadi bukan
karena orang kurang pintar, tapi karena mereka terburu-buru.

Karena itu seluruh produk ini dirancang untuk menciptakan jeda. Periksa membantu
membaca sinyal. Latihan membangun kebiasaan memutuskan. Langkah memberi urutan
tindakan saat sudah terlanjur. Pustaka menjelaskan alasannya. Dan Komunitas
membuka ruang untuk kasus yang tidak persis sama dengan panduan mana pun.

Yang membedakan Saring, menurut saya, bukan jumlah fiturnya. Yang membedakan
adalah apa yang sengaja tidak kami lakukan: tidak memberi label aman, tidak
mengarang hasil saat data tidak tersedia, dan tidak mengirim data pengguna ke mana
pun tanpa izin.

Terima kasih. Saya siap menerima pertanyaan."

---

## Lampiran: Pertanyaan yang Sering Muncul

Bagian ini bukan naskah, hanya pengingat jawaban agar konsisten.

**"Apakah ini memakai AI?"**
Tidak. Analisis pesan memakai aturan heuristik yang deterministik. Tidak ada model
bahasa atau layanan AI eksternal yang membaca isi pesan.

**"Kenapa tidak langsung bilang pesan itu penipuan?"**
Karena kami tidak punya dasar untuk memastikan. Yang bisa dilakukan adalah
menunjukkan sinyal dan menjelaskan alasannya, lalu menyerahkan keputusan pada
pengguna.

**"Datanya disimpan di mana?"**
Pesan yang diperiksa tidak disimpan. Yang tersimpan di PostgreSQL hanya data akun
dan konten yang memang dibuat pengguna: pertanyaan, artikel, revisi, draf,
bookmark, dan notifikasi.

**"Kalau layanan reputasi mati?"**
Hasil inspeksi lokal tetap tampil, dan status reputasi ditandai tidak tersedia.
Aplikasi tidak mengubah kegagalan menjadi kesan aman.

**"Bagaimana kalau ada konten yang melanggar?"**
Pengguna bisa melaporkan. Laporan masuk antrean admin, dan moderator memutuskan
setelah membaca konteks kontennya. Laporan tidak otomatis menghapus konten.

**"Apakah sudah dipakai orang banyak?"**
Jangan mengarang angka. Jawab apa adanya: aplikasi berjalan di `https://saring.app`
dan sedang dalam tahap evaluasi. Sebutkan metrik hanya bila benar-benar tersedia
dan bisa ditunjukkan.
