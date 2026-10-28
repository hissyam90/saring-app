export interface AnalysisExample {
  id: string;
  label: string;
  text: string;
}

export const EXAMPLES: AnalysisExample[] = [
  {
    id: "recruitment",
    label: "Lowongan kerja palsu",
    text: "Selamat! Anda dinyatakan lolos seleksi berkas di PT Karya Sinar Abadi. Untuk mengaktifkan status calon karyawan, silakan transfer biaya administrasi sebesar Rp250.000 ke rekening 1234-5678-9012 atas nama Rina Melati. Mohon kirim bukti transfer hari ini juga agar kesempatan Anda tidak hangus.",
  },
  {
    id: "otp",
    label: "Permintaan kode OTP",
    text: "[Bank Sahabat Nusantara] Akun Anda terdeteksi aktivitas mencurigakan dan akan diblokir dalam 24 jam. Segera verifikasi dengan memasukkan kode OTP yang kami kirimkan melalui tautan ini: http://bank-sahabat-verifikasi.net/login",
  },
  {
    id: "giveaway",
    label: "Undian berhadiah",
    text: "Selamat! Nomor Anda terpilih sebagai pemenang undian BelanjaSeru senilai Rp10.000.000. Untuk klaim hadiah, silakan transfer biaya administrasi Rp150.000 sebagai syarat pengecekan ke rekening 9080-7060-5040 a.n. Pak Bayu. Batas klaim hari ini.",
  },
  {
    id: "investment",
    label: "Investasi bodong",
    text: "PENAWARAN INVESTASI EMAS DIGITAL — dijamin untung 20% per bulan, tanpa risiko. Modal mulai Rp100.000 dan balik modal pasti dalam 30 hari. Segera transferkan dana Anda ke rekening 9876-5432-1098 a.n. Joko Sentosa untuk mengaktifkan akun.",
  },
  {
    id: "benign",
    label: "Pesan yang terlihat wajar",
    text: "Halo, terima kasih sudah menghubungi layanan pelanggan BelanjaSeru. Pesanan #BS-2041 Anda sedang diproses dan akan dikirim dalam 2–4 hari kerja. Silakan pantau statusnya melalui aplikasi resmi BelanjaSeru. Terima kasih.",
  },
  {
    id: "ambiguous",
    label: "Teman butuh bantuan dana",
    text: "Halo, ini aku, Rara — temanmu dari SMA. HP-ku barusan hilang, jadi aku pakai nomor baru ini. Bisa bantu pinjamkan Rp500.000 dulu? Aku butuh cepat hari ini juga untuk bayar kos. Nanti sore langsung aku ganti. Makasih ya.",
  },
];