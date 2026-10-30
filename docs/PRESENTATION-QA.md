# Q&A Juri

Ringkasan jawaban singkat untuk sesi tanya jawab. Naskah presentasi lengkap ada di
[PANDUAN-PRESENTASI.md](PANDUAN-PRESENTASI.md).

## Apa masalah yang diselesaikan?

Saring membantu orang mengambil jeda saat menerima pesan, nomor, atau tautan
mencurigakan dengan menjelaskan sinyal dan tindakan aman yang bisa langsung
dilakukan.

## Apakah Saring mendeteksi penipuan secara pasti?

Tidak. Mesin aturan bersifat heuristik sehingga dapat menghasilkan false positive
dan false negative. Skor adalah bobot indikator, bukan probabilitas penipuan.

## Bagaimana privasi dijaga?

Pesan dan struktur tautan diproses lokal di peramban dan tidak dikirim ke server.
Reputasi URL hanya dikirim ke Google Safe Browsing setelah pengguna memberi
persetujuan eksplisit melalui route server. Nomor hanya dinormalisasi secara lokal.
Data yang memang dibuat pengguna (pertanyaan, artikel, draf, bookmark) disimpan di
PostgreSQL.

## Mengapa tidak ada lookup nomor otomatis?

Tidak ditemukan API publik resmi yang dapat diverifikasi dari kanal AduanNomor.
Saring tidak melakukan scraping dan tidak mengarang reputasi.

## Apakah URL dibuka atau di-fetch?

Tidak. Pemeriksaan URL hanya memakai parsing dan pola string. Tidak ada redirect,
unduhan, atau eksekusi script dari tautan yang diperiksa.

## Bagaimana false positive ditangani?

Aturan memakai konteks dan negasi pada pesan, lalu menampilkan bukti teks serta
alasan agar pengguna dapat memverifikasi secara terpisah.

## Mengapa tidak memakai AI?

Inti pemeriksaan dibuat deterministik dan dapat diuji tanpa mengirim konten
pengguna ke layanan eksternal. Untuk produk seperti ini, transparansi lebih
berharga daripada kecanggihan yang tidak bisa dijelaskan.

## Bagaimana akun dan hak akses bekerja?

Pemeriksaan dasar tidak memerlukan akun. Akun hanya dibutuhkan untuk menulis di
Komunitas dan mengajukan artikel. Ada dua role, `user` dan `admin`; role dibaca
ulang dari database pada setiap pemeriksaan otorisasi, sehingga perubahan role
langsung berlaku.

## Stack dan deployment?

Next.js App Router, React, TypeScript, Tailwind CSS, PostgreSQL, Vitest, Testing
Library, dan Playwright. Aplikasi berjalan di Heroku dengan Heroku Postgres, dan
domain produksinya `saring.app`.

## Apa yang belum tersedia?

Database reputasi nomor telepon, pelaporan artikel (saat ini laporan hanya untuk
pertanyaan dan balasan), serta notifikasi lewat email atau push. Semuanya adalah
rencana, bukan fitur yang sudah berjalan.
