# Evaluasi Mesin Analisis

Dokumen ini menjelaskan **cara hasil pemeriksaan pesan diukur**, bukan klaim
akurasi di dunia nyata. Angka di bawah dihasilkan oleh skrip evaluasi yang
**benar-benar dijalankan** (`tests/unit/analysisEval.test.ts`), tanggal referensi
9 November 2026.

> **Poin jujur terpenting.** Subset *development* pernah dipakai untuk
> **menemukan dan memperbaiki aturan mesin**, jadi evaluasi terhadapnya **bukan**
> bukti generalisasi — hanya penangkap regresi. Subset *validation* dipakai untuk
> **memantau regresi** saat tuning berlanjut. Subset *holdout* dimaksudkan sebagai
> uji independen, tetapi **tidak sepenuhnya *blind*** karena dua alasan yang
> dijelaskan di §4.3:
>
> 1. Pola `upfront-payment` menambah kosakata `komisi undian` / `biaya kirim
>    voucher` yang **hanya muncul pada kasus holdout `hold-prize-01`**, bukan pada
>    development maupun validation (§4.1 baris #8). Kosakata khas holdout itu
>    tertanam ke dalam aturan dan uji regresinya.
> 2. Satu *false negative* biner holdout — `hold-threat-01` (ancaman pemutusan
>    layanan ber-tenggat) — **sengaja diperbaiki** pada audit ini lewat aturan
>    generik "ancaman pemutusan layanan" yang dirancang umum dan disertai kasus
>    negatif (§4.1 baris #13). Aturan itu valid secara umum, tetapi pemicunya
>    tetaplah pengamatan pada holdout.
>
> Karena itu hasil holdout **tidak boleh disebut evaluasi *blind*** dan bukan
> bukti generalisasi independen — baik pada recall 92,9% sebelumnya maupun 100%
> sekarang. Sebagian perbaikan lain *memang* efek samping yang dapat ditelusuri
> ke validation (mis. `rek` dari `val-risky-01`, §4.1 baris #9). Seluruh angka
> sebelum/sesudah **dipertahankan apa adanya**; yang dijaga adalah klaim
> metodologisnya, bukan angkanya.

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
§4.3). Angka 100% terakhir dicapai setelah *false negative* ancaman ber-tenggat
(`hold-threat-01`) diperbaiki lewat aturan generik pemutusan layanan.

| Ukuran | Sebelum | Sesudah |
|---|---:|---:|
| True Positive | 11 | **14** |
| False Positive | 0 | 0 |
| False Negative | 3 | **0** |
| True Negative | 9 | 9 |
| Presisi | 100,0% | **100,0%** |
| Recall | 78,6% | **100,0%** |
| F1 | 88,0% | **100,0%** |
| Akurasi | 87,0% | **100,0%** |

Per kategori sesudah (TP/FP/FN → P/R/F1):

| Kategori | TP | FP | FN | Presisi | Recall | F1 |
|---|---|---|---|---|---|---|
| Pencurian kredensial | 2 | 0 | 0 | 100% | 100% | 100% |
| Desakan & intimidasi | 1 | 0 | 2 | 100% | 33,3% | 50,0% |
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
kategori lain (dibuktikan oleh angka per-kategori di §3). **Dua pengecualian**
menyentuh holdout dan dianotasi eksplisit: baris #8 (kosakata khas holdout yang
tertanam) dan baris #13 (perbaikan FN biner yang dipicu pengamatan holdout) —
lihat §4.3.

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
| 13 | Ancaman **pemutusan layanan** ("layanan dicabut/dihentikan", "layanan Anda kami cabut") | `engine.ts` | Provider listrik/internet/bank sering mengancam memutus layanan; `layanan` tidak dikenali objek ancaman dan verba aktif `cabut` tidak terdeteksi. Disertai kasus negatif ("saya cabut langganan", "akses kantor ditutup pukul 6"). **Catatan integritas:** pemicunya adalah FN biner `hold-threat-01` — lihat §4.3. |
| 14 | **Penjaga *false positive*** pada pemutusan layanan & desakan waktu: (a) pemberitahuan sah (`LEGIT_SERVICE_NOTICE`: pemeliharaan/`sementara`/`sesuai ketentuan/jadwal/prosedur`/hari libur), (b) kanal resmi (`OFFICIAL_CHANNEL`: "bayar lewat **aplikasi resmi**"), (c) pelaporan/edukasi lintas-klausa (`isReportedContext`: "Waspada modus penipuan: …", "Saya dapat pesan '…', apakah ini penipuan?") | `engine.ts`, `context.ts` | Uji kasus Fase 2 menunjukkan aturan #13 bersifat **terlalu luas**: pemberitahuan pemeliharaan jaringan, penonaktifan sementara, penagihan sesuai ketentuan, serta kalimat edukasi/melaporkan ancaman ikut ditandai `urgency-intimidation`. Penjaga ini dibangun dari kasus negatif **baru** (bukan holdout) di `tests/unit/engineImprovements.test.ts`. Tidak mengubah satu pun angka biner dev/val/holdout (tetap presisi/recall 100%). |

### 4.2 Keterbatasan yang masih tersisa (holdout)

Setelah perbaikan baris #13, **tidak ada lagi *false negative* biner** pada
holdout (recall biner 100%). Yang tersisa adalah celah **level kategori** yang
tidak mengubah keputusan biner karena kategori lain sudah menandai bahaya, plus
satu kelebihan sinyal:

- **Desakan & intimidasi — recall 1/3.** Dua contoh berlabel *desakan &
  intimidasi* tetap tidak memunculkan temuan kategori itu: `hold-link-01`
  ("…login segera!") dan `hold-imp-02` ("…segera hubungi kami"). Keduanya tetap
  benar di level biner karena kategori lain mereka (`suspicious-link` dan
  `impersonation`) sudah menandai bahaya.
- **Pembayaran di muka — 1 FN kategori.** `hold-risky-01` ("…transfer DP ke rek
  atas nama…") diberi label `upfront-payment`, tetapi pola "DP" tanpa nominal
  tidak memicu aturan itu; pesannya tetap TP via `risky-instruction`.
- **Peniruan pihak resmi — 1 FN kategori.** `hold-imp-01` ("Kami dari OJK…")
  tidak cocok dengan pola klaim otoritas (tidak memakai "petugas/admin/atas
  nama"); pesan tetap TP via `money-request`.
- **Satu kelebihan sinyal level kategori (bukan FP biner).** Pada kasus scam
  `hold-imp-01` ("…konfirmasi dana bantuan… Mohon kirim data KTP dan nomor
  rekening"), mesin memunculkan sinyal `money-request` meskipun anotasi dasarnya
  hanya `impersonation`: kata "dana" ikut dianggap penanda nominal, padahal pesan
  meminta *data*, bukan uang. Karena pesannya memang scam, keputusan biner tetap
  `TP` (FP biner tetap 0); ini murni FP kategori yang belum dirapikan.

Seluruh contoh *false negative* dan *false positive* dicetak lengkap oleh skrip
evaluasi (blok `FALSE-NEGATIF` / `FALSE-POSITIF`).

> **Audit kategori (Fase 2).** Keempat celah di atas diperiksa satu per satu
> terhadap seluruh aturan terkait (`DEADLINE_PRESSURE`, `UPFRONT_*`,
> `AUTHORITY_CLAIMS`, `MONEY_*`). Kelimanya hanya muncul pada holdout — pada
> development dan validation, sepuluh kategori sudah mencapai presisi/recall
> 100%. Karena memperbaikinya berarti menala aturan menggunakan contoh holdout
> (mis. menambah "login segera"/"segera hubungi" ke daftar desakan, "DP tanpa
> nominal" ke pembayaran di muka, atau "Kami dari X" ke klaim otoritas — satu
> persis kosakata `hold-imp-01`), **celah itu sengaja tidak dikejar** demi tidak
> makin menggerus status independensi yang sudah terbatas (§4.3). Perbaikan
> generik yang bisa dibangun dari development+validation saja sudah tuntas di
> §4.1; sisanya menunggu dataset independen baru (§7).

### 4.3 Status independensi holdout

Perbedaan antara "holdout lama" (recall 78,6%) dan "terbaru" (100%) **adalah
dataset yang sama** yang dijalankan pada aturan lama vs. aturan baru — bukan dua
dataset yang berbeda. Tiga kasus yang berubah dari FN menjadi TP adalah:

| Kasus | Teks inti | Aturan yang memperbaikinya | Asal kosakata aturan |
|---|---|---|---|
| `hold-prize-01` | "…komisi undian… bayar biaya kirim voucher…" | `upfront-payment` (baris #8) | `pajak/PPN hadiah` dari dev+validation **dan** `komisi undian` / `biaya kirim voucher` yang **hanya ada di holdout** |
| `hold-risky-01` | "…transfer DP ke rek atas nama saya." | `risky-instruction` (`\brek\b`, baris #9) | `rek Bank` dari `val-risky-01` (validation) — efek samping yang sah |
| `hold-threat-01` | "…dalam 2 jam, layanan Anda kami cabut permanen." | `urgency-intimidation` pemutusan layanan (baris #13) | Aturan **generik** (layanan + verba cabut/dihentikan), disertai kasus negatif; tetapi pemicunya pengamatan pada holdout |

Menurut tiga tingkatan definisi independensi, status holdout Saring adalah:

1. ~~Benar-benar tidak pernah digunakan untuk pengembangan~~ — **tidak terpenuhi**.
2. ~~Hasil agregat diketahui tetapi tidak pernah dipakai untuk tuning~~ — **tidak
   sepenuhnya terpenuhi**.
3. **Kasusnya dipakai langsung untuk memperbaiki aturan** — **terpenuhi untuk
   `hold-prize-01`** (kosakatanya tertanam pada aturan) **dan `hold-threat-01`**
   (perbaikannya dipicu oleh kasus ini, walau aturannya generik).

**Kesimpulan:** hasil holdout **tidak boleh disebut evaluasi *blind***. Recall
100% adalah angka pada dataset yang (a) sebagian kosakatanya bocor ke satu aturan
(`hold-prize-01`), dan (b) salah satu FN-nya sengaja diperbaiki berdasarkan
pengamatan pada kasus tersebut (`hold-threat-01`). Ia tetap bernilai sebagai
penangkap regresi, tetapi bukan bukti generalisasi independen. Perbaikannya
*campuran*: `hold-risky-01` efek samping sah dari validation;
`hold-prize-01` kebocoran kosakata; `hold-threat-01` perbaikan generik yang
dipicu holdout. Tidak ada tindakan "membersihkan" angka; yang dilakukan adalah
mengoreksi klaim metodologisnya dan menyiapkan dataset baru yang benar-benar
belum tersentuh (§7).

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
   berada di recall biner 100% tetapi **tidak sepenuhnya blind** (§4.3) dan
   masih memiliki celah level kategori pada desakan waktu, pembayaran di muka,
   dan peniruan (§4.2).
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

### 7.1 Material eksekusi (sudah tersedia, siap dipakai)

Protokol operasional lengkap beserta perkakasnya sudah tersedia sebagai berkas
terpisah, agar evaluator independen bisa menjalankan semuanya tanpa menyentuh
aturan mesin:

| Material | Berkas | Isi |
|---|---|---|
| Protokol & pemisahan peran | `evaluation/PROTOKOL.md` | Alur pengumpulan 200–300 contoh, tabel peran (kurator/anotator/penala/pelaksana), perintah pembekuan & uji, tabel bukti yang wajib diisi |
| Skema label & pedoman anotasi | `evaluation/LABEL-SCHEMA.md` | Definisi `risk` + 10 kategori, contoh yang tidak boleh salah, aturan adjudikasi |
| Template anotasi (TSV) | `evaluation/annotate-template.tsv` | Format `id/text/risk/categories/note/provenance` |
| Template provenance | `evaluation/provenance-template.md` | Sumber, klasifikasi sintetis/publik/partisipan, pernyataan integritas |
| Hitung confusion & P/R/F1/akurasi | `scripts/evaluation/blind-eval.mjs` | Biner + per-kategori + daftar FN/FP + `ambiguous` |
| Deteksi duplikat/near-duplicate | `scripts/evaluation/dedupe.mjs` | Normalisasi ejaan + Jaccard untuk mencegah kebocoran antar-subset |
| Pembekuan (checksum SHA-256) | `scripts/evaluation/freeze.mjs` | Manifest `freeze.lock.json` (sha256, jumlah contoh, versi/commit mesin) |
| Pembangkit prediksi mesin beku | `tests/unit/blind-predict.test.ts` | Ditrigger env `SARING_BLIND_DATASET`/`SARING_BLIND_PREDICTIONS`; dilewati tanpa env |

Dataset yang dibekukan (`evaluation/dataset.jsonl`), prediksi
(`evaluation/predictions.jsonl`), dan kunci pembekuan
(`scripts/evaluation/freeze.lock.json`) **tidak dimasukkan ke repositori** —
sudah dicantumkan di `.gitignore` — sehingga penala mesin tidak bisa melihat isi
dataset. Perintah lengkap pengujian end-to-end ada di `evaluation/PROTOKOL.md` §5.

Belum ada anggota tim yang mewakili langkah 1, sehingga item ini **belum
dikerjakan** dan tidak ada angka yang diklaim darinya. Tabel bukti di
`evaluation/PROTOKOL.md` §6 sengaja dikosongkan sampai evaluasi independen
benar-benar dijalankan oleh manusia independen.