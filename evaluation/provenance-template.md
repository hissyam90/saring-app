# Laporan Provenance Dataset — Template

Isi berkas ini untuk setiap dataset yang dikumpulkan. Tujuannya agar sumber
setiap contoh dapat ditelusuri dan dataset tidak memuat data korban tanpa izin.

## 1. Ringkasan dataset

| Kolom | Isi |
|---|---|
| Nama/ID dataset | _(isi)_ |
| Jumlah contoh | _(isi)_ |
| Tanggal pengumpulan | _(isi)_ |
| Nama kurator | _(isi)_ |
| Nama anotator (≥2) | _(isi)_ |
| Nama adjudikator | _(isi)_ |

## 2. Klasifikasi sumber

| Jenis | Definisi | Jumlah |
|---|---|---|
| `synthetic` | Dikarang oleh kurator berdasarkan pola umum, bukan pesan orang nyata | _(isi)_ |
| `public-anonymized` | Diambil dari sumber publik lalu dianonimkan (tanpa identitas | _(isi)_ |
| `human-annotated` | Dihimpun dari partisipan yang menyetujui, lalu dianonimkan | _(isi)_ |

> Isi alasan bila ada `public-anonymized`/`human-annotated`: nomor/izin/dasar
> hukum penggunaan, dan langkah anonimisasi (hapus nama, nomor telepon, bank,
> tautan nyata, dsb.).

## 3. Referensi pola (opsional)

Bila memakai materi edukasi/peringatan resmi sebagai acuan pola (bukan salinan),
sebutkan: OJK, Komdigi, IASC, atau lembaga terkait + pranala halaman.

## 4. Pernyataan integritas

- [ ] Tidak ada data korban nyata tanpa izin.
- [ ] Label ditetapkan sebelum mesin dijalankan.
- [ ] Dataset dibekukan dengan `freeze.mjs` (ada `freeze.lock.json`).

Tanda tangan / inisial kurator: ______________