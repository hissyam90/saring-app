# Skema Label & Pedoman Anotasi

Panduan untuk anotator dataset evaluasi independen. Ditulis agar dua anotator
yang berbeda memberi label yang konsisten tanpa melihat output mesin.

## 1. `risk` (label utama)

| Nilai | Arti | Kriteria |
|---|---|---|
| `scam` | Pesan berisi indikasi penipuan/diri manipulatif | Ada setidaknya satu kategori di bawah, dengan konteks nyata (bukan kutipan/edukasi) |
| `non-scam` | Pesan wajar/biasa | Tidak ada indikasi manipulasi; boleh mengandung kata berisiko tanpa niat menipu |
| `educational` | Materi yang *membahas* penipuan | Edukasi, tips, kutipan contoh, "penipu biasanya…", arahan ke kanal resmi |
| `ambiguous` | Tidak bisa dipastikan dari teks saja | Informasi tidak cukup; atau anotator tidak sepakat setelah adjudikasi |

## 2. `categories` (multi-label; hanya untuk `risk=scam`)

Semua kategori yang benar-benar hadir. Contoh scam boleh lebih dari satu.

| Kategori | Definisi ringkas |
|---|---|
| `credential-theft` | Meminta OTP/PIN/kata sandi/kode verifikasi/kartu |
| `urgency-intimidation` | Desakan waktu atau ancaman (blokir/denda/pemutusan layanan) |
| `upfront-payment` | Minta biaya di muka (admin/pendaftaran/klaim hadiah/deposit) |
| `unrealistic-promise` | Janji untung/hadiah yang tak realistis atau tanpa risiko |
| `suspicious-link` | Tautan pendek/domain tiruan/IP/non-https mencurigakan |
| `impersonation` | Mengaku/atas nama institusi atau petugas resmi |
| `risky-instruction` | Arahkan keluar aplikasi resmi / lewati verifikasi / transfer ke rek pribadi |
| `acquaintance-impersonation` | Menyamar kenalan (nomor baru + minta uang / halangi verifikasi) |
| `money-request` | Permintaan pinjam/transfer uang mendadak |
| `verification-blocking` | Menghalangi verifikasi identitas (jangan ditelepon, dsb.) |

## 3. Contoh yang WAJIB tidak salah

- **Resmi/kanal resmi** bukan penipuan: "Bayar tagihan melalui aplikasi resmi
  PLN" → `non-scam` (walau ada "bayar"). Yang jadi `risky-instruction` adalah
  instruksi keluar dari kanal resmi ("transfer ke rek pribadi").
- **Pemberitahuan pemeliharaan/penonaktifan sementara** → `non-scam`.
- **Kutipan/pelaporan** ("Saya dapat pesan '…', apakah ini penipuan?") →
  `educational`, bukan `scam`.
- **Kalimat tentang penipuan** ("Penipu biasanya meminta OTP") → `educational`.

## 4. Adjudikasi (saat anotator berbeda)

1. Bila beda `scam` vs `non-scam`/`educational`: baca ulang konteks. Jika isi
   mengarah ke kutipan/edukasi/kanal resmi → `educational`/`non-scam`. Jika benar
   berisi ajakan/manipulasi nyata → `scam`.
2. Bila beda pada `categories`: pakai definisi §2; hanya kategori yang didukung
   bukti teks yang dicantumkan (jangan menebak niat di luar teks).
3. Bila tetap tak sepakat → `ambiguous`, dan catat di kolom `note`.

## 5. Aturan integritas

- Label ditetapkan **sebelum** melihat output mesin.
- Jangan salin contoh antar-subset; `dedupe.mjs` dipakai untuk mengecek.
- Data korban nyata tanpa izin **dilarang**; catat sumber di `provenance`.