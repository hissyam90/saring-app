import type { FindingCategory } from "@/lib/analysis";

/**
 * Dataset evaluasi mesin analisis Saring.
 *
 * Dataset ini TERPISAH dari data runtime aplikasi (`data/examples.ts`): contoh
 * berikut tidak pernah dirender ke pengguna. Semua teks adalah karangan fiktif
 * yang disusun untuk mengukur kualitas deteksi, bukan pesan pribadi atau data
 * korban yang dapat diidentifikasi.
 *
 * ## Pembagian subset
 *
 * - `DEVELOPMENT_DATASET` — seluruh 88 contoh lama. Dataset inilah yang dipakai
 *   untuk **menemukan dan memperbaiki aturan** pada fase sebelumnya, sehingga
 *   hasil terhadapnya BUKAN validasi independen (lihat
 *   `docs/EVALUASI-ANALISIS.md`).
 * - `VALIDATION_DATASET` — contoh baru yang **tidak** dipakai untuk menala
 *   aturan (dipakai untuk memantau regresi saat tuning berlanjut).
 * - `HOLDOUT_DATASET` — dimaksudkan sebagai uji independen yang tidak disentuh
 *   aturan. **Catatan integritas (lihat `docs/EVALUASI-ANALISIS.md` §4.3):**
 *   satu aturan `upfront-payment` memakai kosakata (`komisi undian`,
 *   `biaya kirim/pengiriman voucher`) yang hanya muncul pada kasus
 *   `hold-prize-01`, sehingga holdout **tidak sepenuhnya blind**.
 *
 * ## Anotasi multi-label penuh
 *
 * `expectedCategories` memuat **semua** kategori yang benar-benar hadir pada
 * teks (bukan hanya kategori inti), ditentukan lewat telusuran manusia yang
 * independen dari keluaran mesin. Dengan pelabelan penuh, sinyal tambahan yang
 * benar (mis. tekanan waktu pada pesan permintaan kredensial) tidak lagi
 * tercatat keliru sebagai *false positive* per kategori. Lihat
 * `docs/EVALUASI-ANALISIS.md` untuk definisi tiap kategori.
 *
 * Label risiko: `scam`, `non-scam`, `educational`, `ambiguous`. `non-scam`
 * adalah "pesan wajar / bukan indikasi penipuan", **bukan** jaminan bahwa pesan
 * aman untuk ditindaklanjuti.
 */

export type EvalRisk = "scam" | "non-scam" | "educational" | "ambiguous";

export interface EvalCase {
  id: string;
  text: string;
  /** Kebenaran dasar: penipuan / wajar / edukasi / ambigu. */
  risk: EvalRisk;
  /** Semua kategori yang benar-benar hadir (anotasi multi-label penuh). */
  expectedCategories: FindingCategory[];
  /** Alasan anotasi. */
  note: string;
}

// ──────────────────────────────────────────────────────────────
// DATA PENGEMBANGAN (88 contoh lama — sudah dipakai untuk tuning)
// ──────────────────────────────────────────────────────────────
export const DEVELOPMENT_DATASET: EvalCase[] = [
  // ── Pencurian kredensial ──
  {
    id: "cred-01",
    text: "Segera kirim kode OTP Anda atau akun Anda akan diblokir.",
    risk: "scam",
    expectedCategories: ["credential-theft", "urgency-intimidation"],
    note: "Permintaan OTP disertai ancaman pemblokiran akun.",
  },
  {
    id: "cred-02",
    text: "Kode OTP-nya berapa? Kirim ke sini ya.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Permintaan langsung kode OTP.",
  },
  {
    id: "cred-03",
    text: "Boleh dibantu info kode yang masuk ke SMS kakak?",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Meminta kode SMS dengan bahasa sopan untuk menyamarkan niat.",
  },
  {
    id: "cred-04",
    text: "Kasih tau kode 6 digit yang baru masuk dong.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Permintaan kode 6 digit (OTP) tanpa menyebut istilah OTP.",
  },
  {
    id: "cred-05",
    text: "Sebutkan PIN ATM dan masa berlaku kartu Anda untuk verifikasi.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Meminta PIN dan data kartu; institusi resmi tidak memintanya.",
  },
  {
    id: "cred-06",
    text: "Kirim 0tp kamu sekarang juga.",
    risk: "scam",
    expectedCategories: ["credential-theft", "urgency-intimidation"],
    note: "Variasi penulisan OTP (0tp) + desakan \"sekarang juga\".",
  },
  {
    id: "cred-07",
    text: "otp ny kaka berapa? aku butuh buat verifikasi.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Bahasa informal; tetap permintaan OTP.",
  },
  {
    id: "cred-08",
    text: "Tolong isi data kartu kredit, nomor kartu, dan CVV di form ini.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Meminta data kartu kredit dan CVV.",
  },
  {
    id: "cred-09",
    text: "Verifikasi keamanan: masukkan kode verifikasi yang kami kirimkan.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Meminta kode verifikasi atas nama proses keamanan.",
  },
  {
    id: "cred-10",
    text: "Saya dari CS Bank Nusantara. Mohon sebutkan kode akses rekening Anda.",
    risk: "scam",
    expectedCategories: ["credential-theft", "impersonation"],
    note: "Kombinasi penyamaran petugas bank dan permintaan kode akses.",
  },
  {
    id: "cred-11",
    text: "Password email kamu berapa? Nanti aku bantu cek.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Meminta kata sandi untuk 'bantuan'.",
  },
  {
    id: "cred-12",
    text: "Untuk aktivasi ulang, kirim kode pemulihan yang baru masuk ke SMS.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Permintaan kode pemulihan.",
  },
  {
    id: "cred-safe-01",
    text: "Jangan pernah bagikan kode OTP kepada siapa pun.",
    risk: "educational",
    expectedCategories: [],
    note: "Larangan membagikan OTP, bukan permintaan.",
  },
  {
    id: "cred-safe-02",
    text: "Bank tidak akan pernah meminta PIN atau kata sandi lewat telepon.",
    risk: "educational",
    expectedCategories: [],
    note: "Pernyataan edukasi tentang kebijakan bank.",
  },
  {
    id: "cred-safe-03",
    text: "Kemarin saya tidak sengaja memberi OTP ke orang tak dikenal.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Narasi lampau orang pertama, bukan permintaan.",
  },
  {
    id: "cred-safe-04",
    text: "Modus penipuan yang umum adalah meminta OTP lalu membajak akun.",
    risk: "educational",
    expectedCategories: [],
    note: "Membahas modus penipuan, bukan melakukannya.",
  },
  {
    id: "cred-safe-05",
    text: "Aktifkan verifikasi dua langkah untuk keamanan akun Anda.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Saran keamanan tanpa permintaan kredensial.",
  },

  // ── Penyamaran teman/keluarga ──
  {
    id: "friend-01",
    text: "Ra, ini aku. nomor baru. hp lama ilang di angkot. bisa pinjem 500 dulu buat bayar kos? hari ini harus setor.",
    risk: "scam",
    expectedCategories: [
      "acquaintance-impersonation",
      "money-request",
      "urgency-intimidation",
    ],
    note: "Klaim nomor baru + alasan HP hilang + permintaan uang + desakan waktu.",
  },
  {
    id: "friend-02",
    text: "Ma ini aku, nomor baru. hp ku kebanjiran. kirim uang 1jt ke rekening ini ya buat ganti hp.",
    risk: "scam",
    expectedCategories: ["acquaintance-impersonation", "money-request"],
    note: "Penyamaran sebagai anggota keluarga + transfer dana.",
  },
  {
    id: "friend-03",
    text: "Bro, gue ganti nomor nih. lagi butuh dana darurat 2jt, bisa transfer sekarang?",
    risk: "scam",
    expectedCategories: [
      "acquaintance-impersonation",
      "money-request",
      "urgency-intimidation",
    ],
    note: "Klaim ganti nomor + permintaan dana darurat + desakan sekarang.",
  },
  {
    id: "friend-04",
    text: "Ini mama, hp ketinggalan di travel. tolong transfer ke rekening ini dulu ya, nanti aku ganti.",
    risk: "scam",
    expectedCategories: ["acquaintance-impersonation", "money-request"],
    note: "Mengaku sebagai ibu + permintaan transfer + janji ganti.",
  },
  {
    id: "friend-05",
    text: "Aku kakakmu, nomor baru. jangan ditelepon dulu karena lagi rapat. kirim dana 3jt sekarang.",
    risk: "scam",
    expectedCategories: [
      "acquaintance-impersonation",
      "money-request",
      "verification-blocking",
      "urgency-intimidation",
    ],
    note: "Klaim nomor baru + permintaan uang + larangan verifikasi + desakan.",
  },
  {
    id: "friend-06",
    text: "Nak, ini ayah. nomor baru. lagi di rumah sakit butuh biaya, segera transfer ya.",
    risk: "scam",
    expectedCategories: [
      "acquaintance-impersonation",
      "money-request",
      "urgency-intimidation",
    ],
    note: "Mengaku orang tua dalam situasi darurat + desakan segera.",
  },
  {
    id: "friend-07",
    text: "Ini temen kampus, nomor lama ilang. talangin dulu pulsa 100rb ya.",
    risk: "scam",
    expectedCategories: ["acquaintance-impersonation", "money-request"],
    note: "Klaim nomor hilang + permintaan dana kecil.",
  },
  {
    id: "friend-safe-01",
    text: "Ini nomor baruku ya, tolong simpan. Nanti ketemu biasa.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Nomor baru tanpa permintaan uang.",
  },
  {
    id: "friend-safe-02",
    text: "Halo, ini aku. HP-ku kemarin hilang makanya ganti nomor.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Klaim nomor hilang tanpa permintaan uang.",
  },
  {
    id: "friend-safe-03",
    text: "Boleh minta nomornya si Andi? Ini aku, nomor baru.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Nomor baru, hanya minta kontak lain.",
  },

  // ── Pembayaran di muka ──
  {
    id: "upfront-01",
    text: "Selamat, Anda lolos seleksi. Transfer biaya administrasi Rp250.000 untuk proses selanjutnya.",
    risk: "scam",
    expectedCategories: ["upfront-payment"],
    note: "Biaya administrasi seleksi kerja.",
  },
  {
    id: "upfront-02",
    text: "Lowongan di PT Karya Abadi. Ada biaya pelatihan Rp500.000 yang dibayar di muka.",
    risk: "scam",
    expectedCategories: ["upfront-payment"],
    note: "Biaya pelatihan di muka lowongan.",
  },
  {
    id: "upfront-03",
    text: "Bayar uang muka Rp1.000.000 sebagai jaminan posisi kerja.",
    risk: "scam",
    expectedCategories: ["upfront-payment"],
    note: "Uang muka untuk jaminan kerja.",
  },
  {
    id: "upfront-04",
    text: "Untuk aktivasi rekening kerja, transfer biaya Rp150.000 sekarang.",
    risk: "scam",
    expectedCategories: ["upfront-payment"],
    note: "Biaya aktivasi rekening kerja.",
  },
  {
    id: "upfront-05",
    text: "Klaim hadiah Anda dengan membayar biaya pengiriman Rp100.000 dulu.",
    risk: "scam",
    expectedCategories: ["upfront-payment", "unrealistic-promise"],
    note: "Biaya klaim hadiah di muka.",
  },
  {
    id: "upfront-06",
    text: "Deposit Rp300.000 untuk modal usaha, dijamin balik modal sebulan.",
    risk: "scam",
    expectedCategories: ["upfront-payment", "unrealistic-promise"],
    note: "Deposit + janji balik modal.",
  },
  {
    id: "upfront-07",
    text: "Transfer biaya seragam Rp350.000 hari ini terakhir.",
    risk: "scam",
    expectedCategories: ["upfront-payment", "urgency-intimidation"],
    note: "Biaya seragam dengan desakan waktu.",
  },
  {
    id: "upfront-safe-01",
    text: "Biaya administrasi transfer antar bank sekarang Rp6.500.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Informasi biaya transfer wajar.",
  },
  {
    id: "upfront-safe-02",
    text: "Tidak ada biaya pendaftaran. Lowongan ini gratis untuk semua pelamar.",
    risk: "educational",
    expectedCategories: [],
    note: "Pernyataan tanpa biaya, bukan permintaan.",
  },
  {
    id: "upfront-safe-03",
    text: "Ongkos kirim dihitung otomatis saat checkout, gratis untuk pembelian tertentu.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Informasi ongkir wajar.",
  },

  // ── Janji keuntungan tidak realistis ──
  {
    id: "invest-01",
    text: "Investasi emas digital dijamin untung 20% per bulan, tanpa risiko.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Janji untung pasti + tanpa risiko.",
  },
  {
    id: "invest-02",
    text: "Join robot trading, profit pasti 50% dalam seminggu.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Janji profit pasti jangka pendek.",
  },
  {
    id: "invest-03",
    text: "Dijamin cuan 5x lipat dalam sebulan, modal mulai 100rb.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Janji kelipatan keuntungan.",
  },
  {
    id: "invest-04",
    text: "Reksadana imbal hasil tetap 30% per tahun, dijamin oleh pemerintah.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Klaim imbal hasil tetap yang dijamin.",
  },
  {
    id: "invest-05",
    text: "100% aman, pasti balik modal dua kali lipat.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Klaim aman 100% dan balik modal.",
  },
  {
    id: "invest-06",
    text: "Deposit crypto bebas risiko, untung berlipat ganda dalam waktu singkat.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Klaim bebas risiko pada crypto.",
  },
  {
    id: "invest-safe-01",
    text: "Suku bunga tabungan naik menjadi 4,5% per tahun.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Informasi bunga wajar.",
  },
  {
    id: "invest-safe-02",
    text: "Investasi selalu mengandung risiko, keuntungan tidak pernah dijamin.",
    risk: "educational",
    expectedCategories: [],
    note: "Pernyataan edukasi risiko.",
  },
  {
    id: "invest-safe-03",
    text: "Bunga deposito bank sesuai ketentuan yang berlaku.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Bunga deposito wajar.",
  },

  // ── Hadiah/undian palsu ──
  {
    id: "prize-01",
    text: "SELAMAT! Anda menang Rp10.000.000. Klaim dengan transfer biaya admin Rp150.000.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise", "upfront-payment"],
    note: "Klaim hadiah + biaya admin.",
  },
  {
    id: "prize-02",
    text: "Nomor Anda terpilih pemenang undian. Klik tautan untuk klaim hadiah.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Klaim kemenangan yang tidak diikuti (tanpa tautan/biaya eksplisit).",
  },
  {
    id: "prize-03",
    text: "Anda memenangkan iPhone 15. Bayar pajak hadiah Rp200.000 dulu.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise", "upfront-payment"],
    note: "Hadiah + biaya pajak di muka.",
  },
  {
    id: "prize-04",
    text: "Selamat, dapat voucher belanja Rp1.000.000. Verifikasi dengan mengisi data pribadi.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Iming-iming voucher + permintaan data.",
  },
  {
    id: "prize-safe-01",
    text: "Hadiah ulang tahunmu sudah aku sembunyikan di lemari.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Hadiah nyata antar teman, bukan penipuan.",
  },
  {
    id: "prize-safe-02",
    text: "Aku menang undian kecil di kantor, nanti traktir.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Narasi kemenangan pribadi.",
  },

  // ── Tautan mencurigakan ──
  {
    id: "link-01",
    text: "Paket Anda gagal dikirim, konfirmasi alamat lewat bit.ly/cek-paket.",
    risk: "scam",
    expectedCategories: ["suspicious-link"],
    note: "Tautan pendek untuk konfirmasi pengiriman.",
  },
  {
    id: "link-02",
    text: "Akun Anda akan diblokir. Login ulang di http://bca-verifikasi.xyz",
    risk: "scam",
    expectedCategories: [
      "suspicious-link",
      "urgency-intimidation",
      "impersonation",
    ],
    note: "Domain menyerupai bank + ancaman blokir (peniruan lewat domain).",
  },
  {
    id: "link-03",
    text: "Cek tagihan terbaru di http://192.168.1.10/login",
    risk: "scam",
    expectedCategories: ["suspicious-link"],
    note: "Tautan alamat IP.",
  },
  {
    id: "link-04",
    text: "Update data akun di http://gojek-resmi.top sekarang.",
    risk: "scam",
    expectedCategories: ["suspicious-link", "impersonation"],
    note: "Domain tidak resmi menyerupai Gojek (peniruan merek).",
  },
  {
    id: "link-safe-01",
    text: "Cek pengumuman beasiswa di https://www.kemdikbud.go.id/pengumuman",
    risk: "non-scam",
    expectedCategories: [],
    note: "Domain resmi pemerintah.",
  },
  {
    id: "link-safe-02",
    text: "Lacak pesanan Anda melalui aplikasi resmi saja.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Arahan resmi tanpa URL mencurigakan.",
  },

  // ── Peniruan pihak resmi ──
  {
    id: "imp-01",
    text: "Saya petugas bank, ada kejanggalan pada rekening Anda.",
    risk: "scam",
    expectedCategories: ["impersonation"],
    note: "Mengaku petugas bank.",
  },
  {
    id: "imp-02",
    text: "Ini admin Tokopedia, akun Anda akan diblokir karena pelanggaran.",
    risk: "scam",
    expectedCategories: ["impersonation", "urgency-intimidation"],
    note: "Mengaku admin marketplace + ancaman.",
  },
  {
    id: "imp-03",
    text: "Perwakilan OJK menghubungi Anda soal dana mengendap.",
    risk: "scam",
    expectedCategories: ["impersonation"],
    note: "Mengaku perwakilan OJK.",
  },
  {
    id: "imp-04",
    text: "Tim PLN: token listrik Anda akan dinonaktifkan, segera hubungi kami.",
    risk: "scam",
    expectedCategories: ["impersonation", "urgency-intimidation"],
    note: "Mengaku PLN + ancaman penonaktifan.",
  },
  {
    id: "imp-safe-01",
    text: "Admin grup akan memverifikasi anggota baru minggu ini.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Admin grup wajar, bukan peniruan institusi.",
  },
  {
    id: "imp-safe-02",
    text: "Jika ada kendala, hubungi customer service resmi di aplikasi.",
    risk: "educational",
    expectedCategories: [],
    note: "Arahan ke CS resmi.",
  },

  // ── Instruksi percakapan berisiko ──
  {
    id: "risky-01",
    text: "Bayar lewat luar aplikasi ya, transfer saja ke rekening pribadi saya.",
    risk: "scam",
    expectedCategories: ["risky-instruction"],
    note: "Mengarahkan transaksi keluar aplikasi.",
  },
  {
    id: "risky-02",
    text: "Jangan pakai escrow, langsung transfer agar cepat.",
    risk: "scam",
    expectedCategories: ["risky-instruction"],
    note: "Menyuruh melewati escrow.",
  },
  {
    id: "risky-03",
    text: "Lanjutkan chat lewat WhatsApp pribadi, bukan di platform.",
    risk: "scam",
    expectedCategories: ["risky-instruction"],
    note: "Mengarahkan ke kanal pribadi.",
  },
  {
    id: "risky-04",
    text: "Lewati verifikasi, langsung bayar ke nomor rekening atas nama saya.",
    risk: "scam",
    expectedCategories: ["risky-instruction"],
    note: "Menyuruh melewati verifikasi.",
  },
  {
    id: "risky-safe-01",
    text: "Pembayaran tetap lewat aplikasi resmi sesuai prosedur.",
    risk: "educational",
    expectedCategories: [],
    note: "Arahan membayar lewat jalur resmi.",
  },
  {
    id: "risky-safe-02",
    text: "Lanjutkan pembayaran di aplikasi agar tercatat otomatis.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Arahan pembayaran lewat aplikasi.",
  },

  // ── Manipulasi psikologis / desakan & tekanan waktu ──
  {
    id: "psycho-01",
    text: "Kesempatan terakhir! Transfer sekarang sebelum slot habis.",
    risk: "scam",
    expectedCategories: ["urgency-intimidation"],
    note: "Tekanan waktu untuk transfer.",
  },
  {
    id: "psycho-02",
    text: "Hanya hari ini, jika tidak konfirmasi maka rekening Anda dihapus besok.",
    risk: "scam",
    expectedCategories: ["urgency-intimidation"],
    note: "Ancaman penghapusan dengan tenggat.",
  },
  {
    id: "psycho-03",
    text: "Akun Anda dilaporkan ke pihak berwajib, segera bayar denda sebelum diproses.",
    risk: "scam",
    expectedCategories: ["urgency-intimidation"],
    note: "Ancaman hukum untuk menekan bayar.",
  },
  {
    id: "psycho-04",
    text: "Batas klaim promo hari ini, segera konfirmasi atau hangus.",
    risk: "scam",
    expectedCategories: ["urgency-intimidation"],
    note: "Tenggat klaim yang menekan.",
  },

  // ── Transaksi & marketplace ──
  {
    id: "market-01",
    text: "Pembeli sudah transfer, silakan kirim barang. Cek dana tidak perlu.",
    risk: "scam",
    expectedCategories: ["risky-instruction"],
    note: "Menyuruh penjual kirim barang tanpa memverifikasi dana masuk.",
  },
  {
    id: "market-02",
    text: "Harga nego di luar aplikasi, transfer dulu DP ke rekening saya ya.",
    risk: "scam",
    expectedCategories: ["risky-instruction", "upfront-payment"],
    note: "DP di luar aplikasi.",
  },

  // ── Pesan ambigu ──
  {
    id: "amb-01",
    text: "Kak, ini saya. Bisa pinjam uang sedikit? Nanti saya ganti.",
    risk: "ambiguous",
    expectedCategories: [],
    note: "Bisa teman sungguhan atau penyamaran; tanpa penanda nomor baru.",
  },
  {
    id: "amb-02",
    text: "Mohon lengkapi data Anda sesegera mungkin.",
    risk: "ambiguous",
    expectedCategories: [],
    note: "Permintaan data tanpa konteks penipuan.",
  },
  {
    id: "amb-03",
    text: "Butuh dana cepat? Hubungi nomor ini sekarang.",
    risk: "ambiguous",
    expectedCategories: [],
    note: "Tawaran dana tanpa indikator penipuan jelas.",
  },
  {
    id: "amb-04",
    text: "Selamat, Anda berhak mendapatkan hadiah. Hubungi layanan kami.",
    risk: "ambiguous",
    expectedCategories: [],
    note: "Klaim hadiah tanpa permintaan biaya/data spesifik.",
  },

  // ── Pesan wajar tambahan (negatif sesungguhnya) ──
  {
    id: "safe-01",
    text: "Besok rapat tim jam 10 pagi di ruang serbaguna, bawa draf proposal.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Koordinasi kerja wajar.",
  },
  {
    id: "safe-02",
    text: "Terima kasih, pesanan kamu sudah dikirim. Estimasi tiba 2-3 hari.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Notifikasi transaksi wajar.",
  },
  {
    id: "safe-03",
    text: "Jangan lupa bawa KTP untuk keperluan administrasi hari Senin.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Pengingat dokumen wajar.",
  },
  {
    id: "safe-04",
    text: "Ibu pulang nanti sore, kamu jangan lupa makan ya.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Pesan keluarga wajar.",
  },
  {
    id: "safe-05",
    text: "Masih ada 30 menit lagi sebelum seminar dimulai.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Informasi waktu wajar.",
  },
  {
    id: "safe-06",
    text: "Bukti transfer sudah saya kirim melampirkan gambar.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Informasi transaksi wajar.",
  },
  {
    id: "safe-07",
    text: "Nanti sore kita ketemuan di kafe dekat kantor ya.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Janji temu wajar.",
  },
  {
    id: "safe-08",
    text: "Maaf baru balas, tadi sinyal di rumah jelek.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Pesan penjelasan wajar.",
  },
];

// ──────────────────────────────────────────────────────────────
// DATA VALIDASI (baru — untuk memantau regresi; sebagian aturan diturunkan darinya)
// ──────────────────────────────────────────────────────────────
export const VALIDATION_DATASET: EvalCase[] = [
  {
    id: "val-cred-01",
    text: "Token 6 digit yang masuk ke SMS kamu, sebutkan sekarang atau akun e-wallet kamu ditutup.",
    risk: "scam",
    expectedCategories: ["credential-theft", "urgency-intimidation"],
    note: "Permintaan token/OTP + ancaman penutupan akun.",
  },
  {
    id: "val-friend-01",
    text: "Halo kak, ini adik. HP ketinggalan di bus, ini nomor darurat. Bisa transfer 300rb buat ongkos pulang? buruan ya.",
    risk: "scam",
    expectedCategories: [
      "acquaintance-impersonation",
      "money-request",
      "urgency-intimidation",
    ],
    note: "Penyamaran saudara + HP hilang + transfer + desakan buruan.",
  },
  {
    id: "val-upfront-01",
    text: "Posisi admin PT Maju Terus tersedia. Dikenakan uang pendaftaran Rp175.000 di awal.",
    risk: "scam",
    expectedCategories: ["upfront-payment"],
    note: "Uang pendaftaran lowongan di awal.",
  },
  {
    id: "val-invest-01",
    text: "Seduh duit lewat robot trader, jaminan cuan 30 persen tiap bulan.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Janji profit tetap lewat robot trading.",
  },
  {
    id: "val-prize-01",
    text: "Kamu keluar sebagai pemenang undian berhadiah emas. Bayar PPN hadiah 250rb lebih dulu.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise", "upfront-payment"],
    note: "Umumkan hadiah + pembayaran pajak hadiah di muka.",
  },
  {
    id: "val-link-01",
    text: "Konfirmasi pengiriman paket Anda lewat rebrand.ly/resi-saya sekarang.",
    risk: "scam",
    expectedCategories: ["suspicious-link"],
    note: "Tautan pendek rebrand.ly untuk konfirmasi.",
  },
  {
    id: "val-imp-01",
    text: "Saya staf kementerian keuangan, ada denda pajak yang mengendap dan harus segera dibayar.",
    risk: "scam",
    expectedCategories: ["impersonation", "urgency-intimidation"],
    note: "Mengaku pejabat + denda mendesak.",
  },
  {
    id: "val-risky-01",
    text: "Jangan bayar lewat afk jugak, transfer saja ke rek Bank pribadi penjual supaya cepat.",
    risk: "scam",
    expectedCategories: ["risky-instruction"],
    note: "Mengarahkan transfer ke rekening pribadi di luar platform.",
  },
  {
    id: "val-money-01",
    text: "Bang, pinjam 200rb dong buat beli obat. Nanti sore tak balikin. Jangan telepon, lagi di klinik.",
    risk: "scam",
    expectedCategories: ["money-request", "verification-blocking"],
    note: "Permintaan uang + janji balikin + penghalangan verifikasi.",
  },
  {
    id: "val-threat-01",
    text: "Masa aktif dompet digital Anda hampir habis, konfirmasi hari ini atau saldo dibekukan.",
    risk: "scam",
    expectedCategories: ["urgency-intimidation"],
    note: "Ancaman pembekuan saldo dengan tenggat.",
  },
  {
    id: "val-cred-02",
    text: "Bagi PIN m-banking dan nomor kartu kamu ya, ada masalah di sistem.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Permintaan PIN dan nomor kartu.",
  },
  {
    id: "val-upfront-02",
    text: "Deposit 500rb untuk mengunci harga, kalau tidak besok naik.",
    risk: "scam",
    expectedCategories: ["upfront-payment", "urgency-intimidation"],
    note: "Deposit di muka + tekanan harga naik besok.",
  },
  {
    id: "val-prize-02",
    text: "Pemenang giveaway Facebook terpilih: cepat klaim hadiah Anda di tautan berikut.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Pengumuman pemenang giveaway + arahan klaim.",
  },
  {
    id: "val-safe-01",
    text: "Tolong ingatkan ayah besok pagi ambil hasil lab jam sembilan.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Pengingat keluarga wajar.",
  },
  {
    id: "val-safe-02",
    text: "Resi pesananmu sudah aktif, bisa dicek di situs ekspedisi resmi.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Notifikasi resi wajar.",
  },
  {
    id: "val-safe-03",
    text: "Malam ini ada arisan keluarga jam tujuh, bawa makanan ya.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Undangan arisan wajar.",
  },
  {
    id: "val-safe-04",
    text: "Kartu parkir saya ketinggalan di meja, tolong bawa besok.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Pesan titip barang wajar.",
  },
  {
    id: "val-safe-05",
    text: "Rapat pindah ke jam dua siang di ruang A, kabari teman-teman.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Koordinasi kerja wajar.",
  },
  {
    id: "val-edu-01",
    text: "Ingat, bank tidak pernah menelepon meminta kode OTP dari Anda.",
    risk: "educational",
    expectedCategories: [],
    note: "Pengingat kebijakan bank.",
  },
  {
    id: "val-edu-02",
    text: "Ciri lowongan palsu biasanya meminta uang pendaftaran di awal.",
    risk: "educational",
    expectedCategories: [],
    note: "Edukasi ciri penipuan.",
  },
  {
    id: "val-amb-01",
    text: "Butuh pinjaman cepat tanpa ribet? Chat saya.",
    risk: "ambiguous",
    expectedCategories: [],
    note: "Tawaran pinjaman tanpa indikator penipuan jelas.",
  },
];

// ──────────────────────────────────────────────────────────────
// DATA HOLDOUT (baru — dimaksudkan independen; TIDAK sepenuhnya *blind*, lihat docs/EVALUASI-ANALISIS.md §4.3)
// ──────────────────────────────────────────────────────────────
export const HOLDOUT_DATASET: EvalCase[] = [
  {
    id: "hold-cred-01",
    text: "Sebutin nomor kartu + tanggal kadaluarsa + 3 angka belakang kartu biar bisa kami verifikasi.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Permintaan data kartu lengkap (nomor, masa berlaku, CVV).",
  },
  {
    id: "hold-friend-01",
    text: "Yayah lagi di RS, ini nomor baru. Transferin 2jt ke rekening suster ya, jangan telpon ayah dulu, lagi istirahat.",
    risk: "scam",
    expectedCategories: [
      "acquaintance-impersonation",
      "money-request",
      "verification-blocking",
    ],
    note: "Penyamaran ayah + transfer + penghalangan verifikasi.",
  },
  {
    id: "hold-upfront-01",
    text: "Kena biaya seragam dan material Rp420ribu, wajib ditransfer sebelum hari training.",
    risk: "scam",
    expectedCategories: ["upfront-payment"],
    note: "Biaya seragam/materai di muka.",
  },
  {
    id: "hold-invest-01",
    text: "Gabung binary option, keuntungan tetap 25% per pekan tanpa modal besar.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise"],
    note: "Janji keuntungan tetap binary option.",
  },
  {
    id: "hold-prize-01",
    text: "Selamat! komisi undian Anda cair setelah bayar biaya kirim voucher Rp99ribu.",
    risk: "scam",
    expectedCategories: ["unrealistic-promise", "upfront-payment"],
    note: "Hadiah/komisi + biaya kirim voucher di muka.",
  },
  {
    id: "hold-link-01",
    text: "Ada masalah pada akun Anda, perbaiki via tinyurl.com/akun-aman — login segera!",
    risk: "scam",
    expectedCategories: ["suspicious-link", "urgency-intimidation"],
    note: "Tautan pendek + desakan login segera.",
  },
  {
    id: "hold-imp-01",
    text: "Kami dari OJK, konfirmasi dana bantuan pemerintah. Mohon kirim data KTP dan nomor rekening.",
    risk: "scam",
    expectedCategories: ["impersonation"],
    note: "Mengaku OJK + permintaan data pribadi.",
  },
  {
    id: "hold-risky-01",
    text: "Transkasi di DM aja biar aman, transfer DP ke rek atas nama saya.",
    risk: "scam",
    expectedCategories: ["risky-instruction", "upfront-payment"],
    note: "Arahkan keluar platform + permintaan DP.",
  },
  {
    id: "hold-money-01",
    text: "Deb, minta tolong transfer 150rb ya buat beli token listrik, udah mati listriknya. Ini nomor baru, hpku jatuh.",
    risk: "scam",
    expectedCategories: ["acquaintance-impersonation", "money-request"],
    note: "Permintaan transfer + klaim nomor baru/hp jatuh.",
  },
  {
    id: "hold-threat-01",
    text: "Jika tidak membayar tagihan dalam 2 jam, layanan Anda kami cabut permanen.",
    risk: "scam",
    expectedCategories: ["urgency-intimidation"],
    note: "Ancaman pencabutan layanan dengan tenggat 2 jam.",
  },
  {
    id: "hold-cred-02",
    text: "Masukkan password ig kamu ke link survey ini ya biar dapet followers gratis.",
    risk: "scam",
    expectedCategories: ["credential-theft"],
    note: "Permintaan password + iming-iming followers.",
  },
  {
    id: "hold-upfront-02",
    text: "Biaya pendaftaran lelang mobil Rp300ribu, ditransfer agar bisa ikut lelang.",
    risk: "scam",
    expectedCategories: ["upfront-payment"],
    note: "Biaya pendaftaran lelang di muka.",
  },
  {
    id: "hold-link-02",
    text: "Unduh aplikasi promo di http://212.45.12.9/apk untuk klaim hadiah.",
    risk: "scam",
    expectedCategories: ["suspicious-link", "unrealistic-promise"],
    note: "Tautan alamat IP + iming-iming hadiah.",
  },
  {
    id: "hold-imp-02",
    text: "Admin BPJS Kesehatan menginformasikan ada klaim yang belum cair, segera hubungi kami.",
    risk: "scam",
    expectedCategories: ["impersonation", "urgency-intimidation"],
    note: "Mengaku admin BPJS + klaim belum cair.",
  },
  {
    id: "hold-safe-01",
    text: "Tolong ambilkan paket di depan pintu nanti sore ya.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Permintaan antar keluarga wajar.",
  },
  {
    id: "hold-safe-02",
    text: "Hasil rapat sudah saya rangkum dan kirim ke email kantor.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Laporan kerja wajar.",
  },
  {
    id: "hold-safe-03",
    text: "Foto keluarga untuk album liburan sudah dicetak.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Informasi dokumen wajar.",
  },
  {
    id: "hold-safe-04",
    text: "Undangan rapat RT hari Minggu jam empat sore.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Undangan kegiatan warga.",
  },
  {
    id: "hold-safe-05",
    text: "Tiket konser sudah saya bagikan ke grup.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Pembagian tiket wajar.",
  },
  {
    id: "hold-safe-06",
    text: "Jangan lupa matikan kompor sebelum tidur.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Pengingat rumah tangga wajar.",
  },
  {
    id: "hold-safe-07",
    text: "Email konfirmasi order sudah masuk, terima kasih.",
    risk: "non-scam",
    expectedCategories: [],
    note: "Notifikasi order wajar.",
  },
  {
    id: "hold-edu-01",
    text: "Contoh penipuan: pelaku ingin Anda menyebutkan kode OTP. Jangan pernah memberikannya.",
    risk: "educational",
    expectedCategories: [],
    note: "Edukasi + larangan membagikan OTP.",
  },
  {
    id: "hold-edu-02",
    text: "Berinvestasi butuh legalitas. Jangan pernah percaya jaminan untung pasti.",
    risk: "educational",
    expectedCategories: [],
    note: "Edukasi risiko investasi.",
  },
  {
    id: "hold-amb-01",
    text: "Bisa bantu bayari dulu? Nanti saya ganti ya.",
    risk: "ambiguous",
    expectedCategories: [],
    note: "Permintaan uang tanpa penanda penipuan jelas.",
  },
];