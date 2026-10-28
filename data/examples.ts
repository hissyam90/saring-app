export interface AnalysisExample {
  id: string;
  label: string;
  /** Catatan singkat tentang pola yang bisa dilihat pengguna. */
  note?: string;
  text: string;
}

export const EXAMPLES: AnalysisExample[] = [
  {
    id: "friend-new-number",
    label: "Nomor baru minta pinjam uang",
    note: "Klaim nomor baru + permintaan uang + desakan waktu",
    text: "Ra, ini aku. nomor baru. hp lama ilang kmrn di angkot. bisa pinjem 500 dulu ga? buat bayar kos, hari ini harus setor. nanti sore aku balikin",
  },
  {
    id: "otp",
    label: "Minta kode OTP",
    note: "Menyamar sebagai customer service bank",
    text: "Halo kak, saya dari CS Bank Sahabat Nusantara. Terdeteksi ada percobaan login di akun kakak. Boleh dibantu info kode OTP yang masuk ke SMS? Biar kami amankan sekarang ya kak",
  },
  {
    id: "job-fee",
    label: "Lowongan minta biaya",
    note: "Seleksi palsu + biaya administrasi di muka",
    text: "Halo kak, selamat! CV kakak lolos seleksi berkas di PT Karya Sinar Abadi. Untuk proses selanjutnya ada biaya administrasi 250rb ya kak. Transfer ke BCA 1234567890 a.n Rina Melati. Hari ini terakhir kak",
  },
  {
    id: "login-link",
    label: "Tautan cek paket",
    note: "Tautan pendek + desakan",
    text: "Paket anda gagal dikirim ya kak. Konfirmasi alamat lewat link ini dulu: https://bit.ly/cek-paket-id . Besok kami kirim ulang",
  },
  {
    id: "giveaway",
    label: "Undian palsu",
    note: "Hadiah + biaya admin untuk klaim",
    text: "SELAMAT!! Nomor Anda terpilih sebagai pemenang Rp10.000.000 dari BelanjaSeru. Klaim sekarang: transfer biaya admin 150rb ke 908070605040 a.n Bayu. Batas klaim hari ini ya",
  },
  {
    id: "investment",
    label: "Investasi untung pasti",
    note: "Imbal hasil dijamin tanpa risiko",
    text: "join investasi emas digital yuk, slot terbatas. dijamin untung 20% perbulan, tanpa risiko sama sekali. modal 100rb aja. transfer ke rek 9876543210988 a.n Joko Sentosa buat aktivasi akun",
  },
  {
    id: "benign-chat",
    label: "Chat biasa (bukan penipuan)",
    note: "Percakapan wajar tanpa permintaan berisiko",
    text: "besok kita meeting jam 10 ya di ruang rapat lt 3. jangan lupa bawa draft proposal sama print out anggaran",
  },
  {
    id: "benign-shipping",
    label: "Info pesanan (bukan penipuan)",
    note: "Notifikasi transaksi normal",
    text: "Halo, pesanan #BS-2041 sudah kami kirim. Estimasi tiba 2-4 hari kerja. Silakan lacak statusnya di aplikasi BelanjaSeru. Terima kasih.",
  },
  {
    id: "near-miss",
    label: "Nomor baru, tanpa minta uang",
    note: "Mirip kasus di atas, tetapi tidak ada permintaan uang",
    text: "Ra ini aku, nomor baru ya. hp lama ilang. nanti aku kabarin lagi kalau udah dapet nomor lama. makasih ya",
  },
];