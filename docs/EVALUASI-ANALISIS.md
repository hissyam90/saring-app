# Evaluasi Mesin Analisis

Dokumen ini menjelaskan **cara hasil pemeriksaan pesan diukur**, bukan klaim
akurasi di dunia nyata. Angka di bawah dihasilkan oleh skrip evaluasi yang
**benar-benar dijalankan** (`tests/unit/analysisEval.test.ts`), tanggal referensi
9 November 2026.

> **Poin jujur terpenting.** Subset *development* pernah dipakai untuk
> **menemukan dan memperbaiki aturan mesin**, jadi evaluasi terhadapnya **bukan**
> bukti generalisasi — hanya penangkap regresi. Subset *validation* dipakai untuk
> **memantau regresi** saat tuning berlanjut. Subset *holdout* dimaksudkan sebagai
> uji independen yang **tidak disentuh aturan**.
>
> **Namun, audit integritas pada laporan ini menemukan bahwa holdout tidak
> sepenuhnya *blind*.** Salah satu perbaikan yang menaikkan recall holdout dari
> 78,6% ke 92,9% — pola `upfront-payment` yang menambah kosakata `komisi undian`
> dan `biaya kirim/pengiriman voucher` — memakai frasa yang **hanya muncul pada
> kasus holdout `hold-prize-01`**, tidak pada development maupun validation (§4.1,
> baris #8). Dengan kata lain, kosakata khas contoh holdout tersebut ikut tertanam
> ke dalam aturan dan uji regresinya. Karena itu hasil 92,9% **tidak boleh disebut
> sebagai evaluasi holdout *blind***; klasifikasi status independensinya dibahas di
> §4.3. Sebagian perbaikan yang lain *memang* berupa efek samping yang
> dapat ditelusuri ke validation (mis. `rek` dari `val-risky-01`, §4.1 baris #9).
> Seluruh angka sebelum/sesudah **tetap dipertahankan**; yang diperbaiki adalah
> klaim metodologisnya.

## 1. Struktur data

Tiga subset, terpisah di `tests/fixtures/analysis-dataset.ts`:

| Subset | Jumlah | Peran |
|---|---|---|
| `development` | 88 (54 scam, 23 non-scam, 7 edukasi, 4 ambigu) | Dipakai untuk tuning aturan. **Bukan validasi independen.** |
| `validation` | 21 (13 scam, 5 non-scam, 2 edukasi, 1 ambigu) | Contoh baru, untuk memantau regresi saat tuning berlanjut. |
| `holdout` | 24 (14 scam, 7 non-scam, 2 edukasi, 1 ambigu) | Dimaksudkan sebagai uji independen, tetapi **tidak sepenuhnya blind** (lihat §4.3). |

Label risiko: `scam`, `non-scam`, `educational`, `ambiguous`. `non-scam` berarti
"pesan wajar / belum menunjukkan indikasi penipuan", **bukan** jaminan bahwa
pesan aman untuk ditindaklanjuti. Contoh `ambiguous` dikeluarkan dari metrik
biner dan per-kategori karena kebenaran dasarnya memang tidak pasti.

Dataset dipisahkan dari data runtime (`data/examples.ts`): contoh evaluasi tidak
pernah dirender ke pengguna, dan seluruh teks adalah karangan fiktif.

## 2. Metodologi

### 2.1 Deteksi risiko biner (metrik utama)

Kelas positif = `scam`; kelas negatif = `non-scam` + `educational`.

Prediksi positif disatukan menjadi: **adanya setidaknya satu temuan
ber-keparahan sedang/tinggi** (`hasSeriousFinding`), persis ambang yang dipakai
antarmuka untuk menampilkan peringatan. Konsekuensinya:

- Pesan scam dengan sinyal yang **hanya berkeparahan rendah** (mis. pengumuman
  hadiah tanpa tautan/biaya, atau desakan waktu tunggal) dianggap **belum
  ditandai bahaya** dan tercatat sebagai *false negative*. Ini batasan nyata,
  bukan angka yang dipoles.
- Pesan wajar yang memicu temuan **rendah** tidak dihitung *false positive*,
  karena memang dirancang sebagai pengingat waspada, bukan tuduhan.

### 2.2 Deteksi per kategori (multi-label)

Untuk tiap dari 10 kategori, kebenaran dasar = kategori ada pada
`expectedCategories`; prediksi = mesin memunculkan temuan kategori itu (apa pun
keparahannya). `expectedCategories` memuat **semua kategori yang benar-benar
hadir** (anotasi multi-label penuh), sehingga sinyal tambahan yang sah tidak lagi
tercatat keliru sebagai *false positive*.

### 2.3 Definisi kategori (acuan anotasi)

| Kategori | Muncul bila pesan… |
|---|---|
| Pencurian kredensial | meminta OTP/PIN/kata sandi/kode verifikasi/nomor kartu/CVV |
| Desakan & intimidasi | mengancam (blokir/sanksi/denda) atau menekan waktu (segera, hari ini, tenggat) |
| Pembayaran di muka | meminta biaya/deposit/uang muka sebelum proses |
| Janji tidak realistis | menjanjikan keuntungan pasti atau hadiah yang tidak diikuti |
| Tautan mencurigakan | memuat penyingkat, alamat IP, http, atau domain mirip layanan |
| Peniruan pihak resmi | mengaku institusi resmi atau memakai domain menyerupai merek |
| Instruksi percakapan berisiko | mengarahkan transaksi/komunikasi ke luar kanal resmi |
| Penyamaran teman/keluarga | mengaku kenalan dengan nomor baru + permintaan uang |
| Permintaan uang mendadak | meminta pinjam/transfer dana |
| Menghalangi verifikasi | memberi alasan tidak bisa dihubungi/dilarang menelepon |

## 3. Hasil

Perintah: `npx vitest run tests/unit/analysisEval.test.ts --reporter=verbose`

### 3.1 Development — 88 contoh (84 non-ambigu)

| Ukuran | Sebelum | Sesudah |
|---|---:|---:|
| True Positive | 50 | **54** |
| False Positive | 0 | 0 |
| False Negative | 4 | **0** |
| True Negative | 30 | 30 |
| Presisi | 100,0% | **100,0%** |
| Recall | 92,6% | **100,0%** |
| F1 | 96,2% | **100,0%** |

Per kategori sesudah (TP/FP/FN → P/R/F1):

| Kategori | TP | FP | FN | Presisi | Recall | F1 |
|---|---|---|---|---|---|---|
| Pencurian kredensial | 12 | 0 | 0 | 100% | 100% | 100% |
| Desakan & intimidasi | 14 | 0 | 0 | 100% | 100% | 100% |
| Pembayaran di muka | 10 | 0 | 0 | 100% | 100% | 100% |
| Janji tidak realistis | 12 | 0 | 0 | 100% | 100% | 100% |
| Tautan mencurigakan | 4 | 0 | 0 | 100% | 100% | 100% |
| Peniruan pihak resmi | 7 | 0 | 0 | 100% | 100% | 100% |
| Instruksi percakapan berisiko | 6 | 0 | 0 | 100% | 100% | 100% |
| Penyamaran teman/keluarga | 7 | 0 | 0 | 100% | 100% | 100% |
| Permintaan uang mendadak | 7 | 0 | 0 | 100% | 100% | 100% |
| Menghalangi verifikasi | 1 | 0 | 0 | 100% | 100% | 100% |

### 3.2 Validation — 21 contoh (20 non-ambigu)

| Ukuran | Sebelum | Sesudah |
|---|---:|---:|
| True Positive | 8 | **13** |
| False Positive | 1 | **0** |
| False Negative | 5 | **0** |
| True Negative | 6 | **7** |
| Presisi | 88,9% | **100,0%** |
| Recall | 61,5% | **100,0%** |
| F1 | 72,7% | **100,0%** |

Per kategori sesudah (TP/FP/FN → P/R/F1):

| Kategori | TP | FP | FN | Presisi | Recall | F1 |
|---|---|---|---|---|---|---|
| Pencurian kredensial | 2 | 0 | 0 | 100% | 100% | 100% |
| Desakan & intimidasi | 5 | 0 | 0 | 100% | 100% | 100% |
| Pembayaran di muka | 3 | 0 | 0 | 100% | 100% | 100% |
| Janji tidak realistis | 3 | 0 | 0 | 100% | 100% | 100% |
| Tautan mencurigakan | 1 | 0 | 0 | 100% | 100% | 100% |
| Peniruan pihak resmi | 1 | 0 | 0 | 100% | 100% | 100% |
| Instruksi percakapan berisiko | 1 | 0 | 0 | 100% | 100% | 100% |
| Penyamaran teman/keluarga | 1 | 0 | 0 | 100% | 100% | 100% |
| Permintaan uang mendadak | 2 | 0 | 0 | 100% | 100% | 100% |
| Menghalangi verifikasi | 1 | 0 | 0 | 100% | 100% | 100% |

### 3.3 Holdout — 24 contoh (23 non-ambigu)

**Dimaksudkan sebagai uji independen, tetapi tidak sepenuhnya *blind*** (lihat
§4.3 untuk klasifikasi statusnya). Peningkatan recall di bawah membaik sebagian
sebagai efek samping yang dapat ditelusuri ke validation, dan sebagian karena
kosakata khas holdout ikut tertanam ke dalam satu aturan.

| Ukuran | Sebelum | Sesudah |
|---|---:|---:|
| True Positive | 11 | **13** |
| False Positive | 0 | 0 |
| False Negative | 3 | **1** |
| True Negative | 9 | 9 |
| Presisi | 100,0% | **100,0%** |
| Recall | 78,6% | **92,9%** |
| F1 | 88,0% | **96,3%** |
| Akurasi | 87,0% | **95,7%** |

Per kategori sesudah (TP/FP/FN → P/R/F1):

| Kategori | TP | FP | FN | Presisi | Recall | F1 |
|---|---|---|---|---|---|---|
| Pencurian kredensial | 2 | 0 | 0 | 100% | 100% | 100% |
| Desakan & intimidasi | 0 | 0 | 3 | — | 0,0% | 0,0% |
| Pembayaran di muka | 3 | 0 | 1 | 100% | 75,0% | 85,7% |
| Janji tidak realistis | 2 | 0 | 1 | 100% | 66,7% | 80,0% |
| Tautan mencurigakan | 2 | 0 | 0 | 100% | 100% | 100% |
| Peniruan pihak resmi | 1 | 0 | 1 | 100% | 50,0% | 66,7% |
| Instruksi percakapan berisiko | 1 | 0 | 0 | 100% | 100% | 100% |
| Penyamaran teman/keluarga | 2 | 0 | 0 | 100% | 100% | 100% |
| Permintaan uang mendadak | 1 | 1 | 1 | 50,0% | 50,0% | 50,0% |
| Menghalangi verifikasi | 1 | 0 | 0 | 100% | 100% | 100% |

## 4. Perubahan aturan & temuan tersisa

### 4.1 Log perubahan aturan (Fase 1)

Sebagian besar perbaikan diturunkan **hanya** dari contoh development + validation,
diikuti unit test di `tests/unit/engineImprovements.test.ts`, dan tidak menggeser
kategori lain (dibuktikan oleh angka per-kategori di §3). **Satu pengecualian** —
baris #8 — dianotasi eksplisit di bawah karena memakai kosakata yang hanya muncul
pada holdout (§4.3).

| # | Perubahan | Berkas | Alasan & efek |
|---|---|---|---|
| 1 | Pola kredensial `token` (token + angka/digit, "kode token", "token yang masuk/dikirim") | `engine.ts` | Variasi OTP/pemulihan "token" tidak dikenal; dijaga agar "beli token listrik" tidak ikut. Memperbaiki FN kredensial di validation. |
| 2 | Kata kerja `bagi(kan)` masuk `DEMAND_VERBS` | `context.ts` | "Bagi PIN/rekening" (singkatan percakapan) tidak dikenali sebagai permintaan. |
| 3 | Daftar peniruan ditambah kementerian/pemerintah (keuangan/sosial/kesehatan/agama/perhubungan, kemenkeu, ditjen pajak, bea cukai, imigrasi) | `engine.ts` | "staf kementerian keuangan" lolos dari `impersonation`. |
| 4 | Penanda `resmi\|official\|asli` pada penilaian domain tiruan | `engine.ts`, `link.ts` | `gojek-resmi.top` sebelumnya hanya "Tautan mencurigakan", kini juga "Peniruan pihak resmi". |
| 5 | Pola desakan waktu tambahan ("harus segera dibayar/dilunasi", "kalau tidak besok naik") | `engine.ts` | Variasi ancaman tenggat tidak menekan mesin. |
| 6 | **Eskalasi** desakan waktu + perintah bayar/transfer → keparahan `medium` (dinilai pada seluruh teks) | `engine.ts` | "Kesempatan terakhir! Transfer sekarang" semula hanya `low` sehingga lolos ambang biner (FN). Perintah bayar sering terpisah klausa dari tekanan waktu. |
| 7 | **Eskalasi** iming-iming hadiah + aksi (klik/isi data/verifikasi/bayar/segera) → `medium` | `engine.ts` | Pengumuman hadiah + ajakan bertindak semula hanya `low` (FN biner). |
| 8 | Pungutan pencairan hadiah ("PPN hadiah", "pajak hadiah") | `engine.ts` | Hubungan "hadiah → biaya" tidak dipahami mesin. **Catatan integritas:** pola `pajak/PPN hadiah` dapat ditelusuri ke dev (`pajak hadiah`) dan validation (`PPN hadiah`), tetapi pola `komisi undian` / `biaya kirim/pengiriman voucher` / `biaya pencairan` yang turut ditambahkan pada aturan yang sama **hanya muncul pada kasus holdout `hold-prize-01`** — lihat §4.3. |
| 9 | `rek`/`rek bank` sebagai penanda instruksi transfer ke luar kanal resmi | `engine.ts` | Singkatan "rek Bank" lolos dari `risky-instruction`. Dapat ditelusuri ke `val-risky-01` ("rek Bank"); berlaku juga pada `hold-risky-01` ("rek atas nama") sebagai efek samping yang sah. |
| 10 | Penjaga *reported speech* pada sinyal permintaan uang | `socialEngineering.ts` | Kalimat edukasi "biasanya meminta uang pendaftaran" keliru ditandai `money-request`. |
| 11 | Perluasan konteks protektif ("tidak pernah/akan menelepon/menghubungi") | `context.ts` | Kalimat edukasi "petugas tidak pernah menelepon meminta denda" keliru ditandai `impersonation`. |
| 12 | `upfront-payment` bersyarat dipersempit (hanya kata benda "biaya/fee"); jendela diperluas 32 char | `engine.ts` | *False positive* "Lewati **verifikasi**, langsung **bayar** ke rekening" (pola "verifikasi…bayar" terlalu luas) — kini benar sebagai `risky-instruction`. |

### 4.2 Keterbatasan yang masih tersisa (holdout)

Satu *false negative* holdout biner masih tersisa dan **sengaja tidak dikejar**
(menala pada sisa holdout hanya akan memperburuk status independensinya):

- **Desakan & intimidasi — recall 0/3.** Tiga contoh berlabel *desakan &
  intimidasi* tidak memunculkan temuan ber-keparahan sedang/tinggi pada kategori
  itu: `hold-threat-01` ("…dalam 2 jam, layanan Anda kami cabut permanen"),
  `hold-link-01` ("…login segera!"), dan `hold-imp-02` ("…segera hubungi kami").
  Dari ketiganya, hanya `hold-threat-01` yang menjadi *false negative biner*;
  dua lainnya tetap benar di level biner karena kategori lain mereka
  (`suspicious-link` dan `impersonation`) sudah menandai bahaya.
- **Satu kelebihan sinyal level kategori (bukan FP biner).** Pada kasus scam
  `hold-imp-01` ("…konfirmasi dana bantuan… Mohon kirim data KTP dan nomor
  rekening"), mesin memunculkan sinyal `money-request` meskipun anotasi dasarnya
  hanya `impersonation`: kata "dana" ikut dianggap penanda nominal, padahal pesan
  meminta *data*, bukan uang. Karena pesannya memang scam, keputusan biner tetap
  `TP` (FP biner tetap 0); ini murni FP kategori yang belum dirapikan.

Seluruh contoh *false negative* dan *false positive* dicetak lengkap oleh skrip
evaluasi (blok `FALSE-NEGATIF` / `FALSE-POSITIF`).

### 4.3 Status independensi holdout

Perbedaan antara "holdout lama" (recall 78,6%) dan "terbaru" (92,9%) **adalah
dataset yang sama** yang dijalankan pada aturan lama vs. aturan baru — bukan dua
dataset yang berbeda. Dua kasus yang berubah dari FN menjadi TP adalah:

| Kasus | Teks inti | Aturan yang memperbaikinya | Asal kosakata aturan |
|---|---|---|---|
| `hold-prize-01` | "…komisi undian… bayar biaya kirim voucher…" | `upfront-payment` (baris #8) | `pajak/PPN hadiah` dari dev+validation **dan** `komisi undian` / `biaya kirim voucher` yang **hanya ada di holdout** |
| `hold-risky-01` | "…transfer DP ke rek atas nama saya." | `risky-instruction` (`\brek\b`, baris #9) | `rek Bank` dari `val-risky-01` (validation) — efek samping yang sah |

Menurut tiga tingkatan definisi independensi, status holdout Saring adalah:

1. ~~Benar-benar tidak pernah digunakan untuk pengembangan~~ — **tidak terpenuhi**.
2. ~~Hasil agregat diketahui tetapi tidak pernah dipakai untuk tuning~~ — **tidak
   sepenuhnya terpenuhi**.
3. **Kasusnya dipakai langsung untuk memperbaiki aturan** — **terpenuhi untuk
   `hold-prize-01`**: frasa `komisi undian` dan `biaya kirim/pengiriman voucher`
   tertanam pada aturan `upfront-payment` dan diuji secara eksplisit di
   `tests/unit/engineImprovements.test.ts`. Frasa itu tidak muncul pada contoh
   development maupun validation mana pun, sehingga satu-satunya sumbernya adalah
   teks `hold-prize-01` itu sendiri.

**Kesimpulan:** hasil holdout **tidak boleh disebut evaluasi *blind***. Recall
92,9% adalah angka pada dataset yang sebagiannya telah "membocorkan" kosakatanya
ke dalam satu aturan. Ia tetap bernilai sebagai penangkap regresi, tetapi bukan
bukti generalisasi independen. Perbaikannya *campuran*: `hold-risky-01` adalah
efek samping sah dari validation, sedangkan `hold-prize-01` berasal dari
kebocoran kosakata. Tidak ada tindakan "membersihkan" angka dilakukan; yang
dilakukan adalah mengoreksi klaim metodologisnya, dan menyiapkan pengumpulan
dataset baru yang benar-benar belum tersentuh (§7).

## 5. Pintu kualitas (regresi)

`tests/unit/analysisEval.test.ts` menegakkan ambang agar perbaikan di masa depan
tidak menurunkan kualitas:

- **Development** (n besar, dipakai tuning): presisi/recall/akurasi biner ≥ 0,90;
  recall per-kategori ≥ 0,80.
- **Validation & holdout** (n kecil, pengukuran independen): hanya lantai biner
  recall ≥ 0,50 dan presisi ≥ 0,70 sebagai penangkap regresi parah, karena ukuran
  sampel terlalu kecil untuk ambang per-kategori yang bermakna.

## 6. Batasan

1. **Bukan akurasi dunia nyata.** Dataset kurasi tidak dapat digeneralisasi ke
   seluruh pesan. Development menyentuh 100% karena dipakai tuning; holdout
   berada di recall 92,9% tetapi **tidak sepenuhnya blind** (§4.3) dan masih
   memiliki FN pada ancaman ber-tenggat (§4.2).
2. **Ukuran sampel kecil.** Validation (20 non-ambigu) dan holdout (23
   non-ambigu) tidak cukup untuk estimasi per-kategori yang stabil. Satu FN/FP
   saja menggeser metrik beberapa poin persen. Angka per-kategori pada subset ini
   adalah indikasi awal, bukan klaim statistik.
3. **Pola baru bisa lolos.** Teknik penipuan berevolusi; aturan heuristik statis
   tidak menangkap pola yang belum ditulis (lihat §4.2).
4. **Terbatas Bahasa Indonesia.** Variasi frasa, slang, dan ejaan yang diuji
   adalah bahasa Indonesia; efektivitas pada bahasa lain tidak diukur.
5. **Tanpa konteks pengirim.** Mesin hanya membaca isi teks; nomor pengirim,
   riwayat, dan niat tidak dapat dinilai (lihat `SECURITY-AND-PRIVACY.md`).
6. **Dataset sintetis, bukan korban nyata.** Contoh dikurasi dari pola umum
   penipuan yang dilaporkan, bukan dikumpulkan dari korban sungguhan. Protokol
   pengumpulan dataset independen baru yang benar-benar belum tersentuh dijelaskan
   di §7 (belum dikumpulkan).

## 7. Protokol pengumpulan dataset independen baru

Karena holdout saat ini tidak lagi dapat disebut *blind* (§4.3), untuk mengklaim
generalisasi perlu dikumpulkan **dataset baru yang benar-benar belum pernah
dibuka oleh siapapun yang menulis/menala aturan**. Protokol (belum dijalankan):

1. **Pemisahan tim.** Yang mengisi dataset bukan orang yang membaca/menulis
   `lib/analysis/**`. Dataset dikelola di luar repositori sampai terkunci.
2. **Sumber nyata (diplihkan, bukan karangan).** Kumpulkan 100+ SMS/chat/media
   sosial bertema penipuan **dan** pesan wajar, lalu anonimkan (hapus nama,
   nomor, akun, URL identitas). Prioritaskan variasi gaya yang belum teruji:
   campur kode bahasa, ejaan santai, singkatan baru, dan modus yang sedang naik.
3. **Pelabelan ganda independen.** Dua penilai (buta terhadap keluaran mesin)
   menandai `scam`/`non-scam`/`educational`/`ambiguous` plus `expectedCategories`
   multi-label. Ketidaksepakatan diselesaikan penilai ketiga; yang tetap tipis
   masuk `ambiguous` (dikeluarkan dari metrik biner).
4. **Penguncian (freeze).** Setelah label final, berkas dikunci (checksum/versi),
   dan **baru** dijalankan sekali terhadap mesin yang tidak diubah lagi.
5. **Pelaporan.** Laporkan confusion matrix biner + per-kategori, ukuran sampel,
   dan interval keyakinan; nyatakan subset ini benar-benar *blind* hanya bila
   butir 1–4 dipatuhi.

Belum ada anggota tim yang mewakili langkah 1, sehingga item ini **belum
dikerjakan** dan tidak ada angka yang diklaim darinya.