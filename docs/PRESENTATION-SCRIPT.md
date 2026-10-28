# Naskah Presentasi Final — sekitar 10 menit

## 0:00–1:00 — Masalah dan pembukaan

- **Layar:** buka tab browser Saring di `/`.
- **Aksi:** tunjuk tagline dan area **Coba langsung**.
- **Narasi:** “Saring membantu pengguna berhenti sebelum bereaksi terhadap pesan, nomor, atau tautan yang mencurigakan. Fokus kami bukan memberi vonis, tetapi menunjukkan sinyal, bukti, dan langkah berikutnya.”

## 1:00–3:30 — Pemeriksaan pesan

- **Layar:** klik **Periksa** atau buka `/periksa`.
- **Aksi:** pilih **Periksa Pesan**, klik contoh fiktif permintaan OTP, lalu klik **Periksa pesan**.
- **Narasi:** “Analisis berjalan lokal. Hasil memuat klasifikasi, skor heuristik, temuan, bukti teks, alasan, dan tindakan. Skor bukan probabilitas dan tidak ada label mutlak aman.”

## 3:30–5:00 — Nomor dan tautan

- **Layar:** klik tab **Periksa Nomor**.
- **Aksi:** masukkan `+62 812-3456-7890`, klik **Periksa nomor**, salin nomor, lalu tunjuk **Buka AduanNomor — Komdigi**.
- **Narasi:** “Saring memvalidasi dan menormalisasi format. Belum ada provider reputasi nomor gratis yang terverifikasi, jadi kami tidak memalsukan hasil.”
- **Aksi:** klik tab **Periksa Tautan**, masukkan `https://bit.ly/contoh-login`, centang consent, lalu klik **Periksa tautan**.
- **Narasi:** “Heuristik lokal ditampilkan bersama status PhishTank. URL tidak pernah dibuka; no-match bukan bukti aman. Pada demo tanpa credential, tampilkan state provider tidak tersedia secara jujur.”

## 5:00–6:30 — Latihan

- **Layar:** buka `/latihan`.
- **Aksi:** pilih satu opsi, jelaskan feedback, klik **Skenario berikutnya**.
- **Narasi:** “Feedback baru muncul setelah jawaban dipilih dan ringkasan dihitung dari jawaban aktual.”

## 6:30–8:00 — Tindakan setelah insiden

- **Layar:** buka `/langkah`, pilih **Saya sudah mentransfer uang**.
- **Aksi:** tunjuk prioritas, bukti, dan tautan IASC/Kontak 157.
- **Narasi:** “Panduan mengutamakan kanal bank resmi, penyimpanan bukti, dan pelaporan. Tidak ada janji dana pasti kembali.”

## 8:00–9:15 — Arsitektur dan privasi

- **Layar:** Alt+Tab ke VS Code, buka `lib/analysis/engine.ts`, lalu `lib/analysis/link.ts`.
- **Narasi:** “Rule engine adalah fungsi deterministik TypeScript. State sensitif berada di memori React; tidak ada akun, storage browser, analytics, atau API AI.”
- **Aksi:** Alt+Tab kembali ke browser.

## 9:15–10:00 — QA dan penutup

- **Layar:** kembali ke `/`.
- **Narasi:** “Saring diuji dengan unit, component, dan Playwright. Batasannya jelas: heuristik dapat false positive/negative dan lookup reputasi eksternal belum diintegrasikan. Berhenti sebentar. Periksa sinyalnya.”
