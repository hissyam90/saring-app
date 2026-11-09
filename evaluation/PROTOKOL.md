# Evaluasi Blinded Independen — Protokol

Dokumen ini mendefinisikan **cara mengumpulkan dan menguji dataset yang
benar-benar belum tersentuh** oleh siapapun yang menulis/menala aturan mesin.
Ia melengkapi `docs/EVALUASI-ANALISIS.md` §7 (ringkasan) dengan prosedur yang
bisa dieksekusi.

> **Status saat ini: protokol siap, dataset BELUM dikumpulkan.** Evaluator
> manusia independen belum menyediakan contoh. Jangan mengklaim evaluasi
> independen sudah selesai sampai kolom "Bukti" di bawah terisi data nyata.

## 1. Prinsip pemisahan (mengapa ini *blind*)

Sebuah evaluasi baru berhak disebut *blind* hanya bila keempat syarat terpenuhi:

1. Contoh **tidak diketahui** oleh pengembang mesin saat menala aturan.
2. **Tidak ada kosakata spesifik** yang bocor ke aturan dari contoh tersebut.
3. Label **ditetapkan sebelum** hasil mesin dilihat.
4. Proses dapat **diaudit ulang** oleh pihak lain.

Konsekuensinya, peran terkunci:

| Peran | Boleh | Tidak boleh |
|---|---|---|
| **Kurator** (bukan penala mesin) | Menulis/mengkurasi teks, membuat id | Menala aturan mesin |
| **Anotator** | Memberi `risk` + `categories` | Melihat output mesin sebelum melabeli |
| **Penala mesin** | Membekukan mesin (versi + commit) | Membaca isi dataset |
| **Pelaksana uji** | Menjalankan mesin beku atas dataset beku | Mengubah dataset / mesin di tengah jalan |

## 2. Pengumpulan (target 200–300 contoh)

Variasi yang WAJIB ada (disarankan memakai materi edukasi & peringatan resmi
OJK/Komdigi/lembaga terkait sebagai acuan pola, bukan salinan):

- phishing akun; OTP & pencurian kredensial; penyamaran bank/pemerintah;
- lowongan kerja palsu; biaya administrasi palsu; hadiah/undian palsu;
- investasi mencurigakan; pinjaman & permintaan transfer; penipuan kurir;
- penipuan keluarga/teman; ancaman hukum; ancaman penutupan rekening/layanan;
- manipulasi emosional; tekanan tenggat; social engineering multi-tahap;
- pesan normal yang mengandung kata berisiko; materi edukasi; pesan ambigu.

Variasi bentuk: formal/informal, salah ketik, singkatan, slang, angka pengganti
huruf, pesan pendek & panjang, multi-paragraf, lebih dari satu indikator.

## 3. Sumber & persetujuan

- Hanya **data sintetis** atau **data publik yang dianonimkan**.
- Data korban nyata **tidak boleh** dipakai tanpa izin; jangan scraping sumber
  yang melarangnya; anonimkan dan catat asal (lihat `provenance-template.md`).
- Setiap contoh diberi `provenance` (lihat format anotasi) yang dapat ditelusuri.

## 4. Anotasi & adjudikasi

Format anotasi: `evaluation/annotate-template.tsv`. Skema label dan pedoman
detail: `evaluation/LABEL-SCHEMA.md`.

- Dua anotator independen; **tidak melihat output mesin**.
- Konflik `risk` atau `categories` diselesaikan lewat **adjudikasi** (aturan di
  `LABEL-SCHEMA.md` §Adjudikasi); kasus yang tetap tak sepakat ditandai
  `ambiguous`.
- Label disimpan **sebelum** mesin dijalankan.

## 5. Pembekuan & uji

```bash
# 1. Deteksi duplikat/near-duplicate (pastikan tidak ada yang bocor antar subset):
node scripts/evaluation/dedupe.mjs evaluation/dataset.jsonl

# 2. Bekukan dataset (dapatkan sha256; simpan commit mesin):
node scripts/evaluation/freeze.mjs evaluation/dataset.jsonl $(git rev-parse --short HEAD)

# 3. Bangkitkan prediksi dengan mesin beku (tanpa membaca dataset oleh penala):
#    (hanya pelaksana uji; env menunjuk ke dataset + keluaran)
$env:SARING_BLIND_DATASET="evaluation/dataset.jsonl"
$env:SARING_BLIND_PREDICTIONS="evaluation/predictions.jsonl"
npx vitest run tests/unit/blind-predict.test.ts

# 4. Hitung metrik (biner + per-kategori, FN/FP + rincian ambiguous):
node scripts/evaluation/blind-eval.mjs evaluation/dataset.jsonl evaluation/predictions.jsonl
```

## 6. Bukti (diisi saat evaluasi benar-benar dijalankan)

| Item | Bukti | Nilai |
|---|---|---|
| Jumlah contoh | `freeze.lock.json` → `examples` | _(belum ada)_ |
| SHA-256 dataset | `freeze.lock.json` → `sha256` | _(belum ada)_ |
| Versi/commit mesin | `freeze.lock.json` → `gitCommit` | _(belum ada)_ |
| Recall biner | keluaran `blind-eval.mjs` | _(belum ada)_ |
| Presisi biner | keluaran `blind-eval.mjs` | _(belum ada)_ |
| F1/akurasi biner | keluaran `blind-eval.mjs` | _(belum ada)_ |
| Hasil per-kategori | keluaran `blind-eval.mjs` | _(belum ada)_ |
| Nama & peran anotator kurator | `provenance-template.md` | _(belum ada)_ |

> Kosongkan semua sel di atas secara jujur sampai evaluasi independen
> benar-benar dijalankan oleh manusia independen.