# Q&A Juri

## Apa masalah yang diselesaikan?
Saring membantu orang mengambil jeda saat menerima pesan, nomor, atau tautan mencurigakan dengan menjelaskan sinyal dan tindakan aman.

## Apakah Saring mendeteksi penipuan secara pasti?
Tidak. Rule engine heuristik dapat menghasilkan false positive dan false negative. Skor adalah bobot indikator, bukan probabilitas.

## Bagaimana privasi dijaga?
Pesan dan heuristik URL diproses lokal dan tidak disimpan. URL reputasi dapat dikirim ke Google Safe Browsing hanya setelah consent eksplisit melalui route server. Nomor hanya dinormalisasi lokal; portal AduanNomor dibuka manual.

## Mengapa tidak ada lookup nomor otomatis?
Tidak ditemukan API publik resmi yang dapat diverifikasi dari AduanNomor. Saring tidak melakukan scraping atau mengarang reputasi.

## Apakah URL dibuka atau di-fetch?
Tidak. Pemeriksaan URL hanya memakai parsing dan pola string. Tidak ada redirect, unduhan, atau eksekusi script.

## Bagaimana false positive ditangani?
Aturan memakai konteks/negasi pada pesan, lalu menampilkan bukti dan alasan agar pengguna dapat memverifikasi secara terpisah.

## Mengapa tidak memakai AI?
Untuk demo yang transparan dan privacy-first, inti pemeriksaan dibuat deterministik dan dapat diuji tanpa mengirim konten pengguna ke layanan eksternal.

## Stack dan deployment?
Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, React Testing Library, dan Playwright. Target deployment adalah Heroku Node.js; deployment aktual belum dilakukan.

## Apa yang belum tersedia?
Belum ada database reputasi, provider lookup nomor terintegrasi, akun pengguna, analytics, dan URL live yang terverifikasi.
