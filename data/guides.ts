export type StepPriority = "segera" | "penting" | "lanjutan";

export interface GuideStep {
  priority: StepPriority;
  text: string;
}

export interface OfficialResource {
  label: string;
  url: string;
  note: string;
}

export interface SafetyGuide {
  id: string;
  situation: string;
  summary: string;
  steps: GuideStep[];
  evidenceChecklist: string[];
  /** Akun, perangkat, atau transaksi yang perlu diperiksa. */
  checks: string[];
  resources: OfficialResource[];
}

export const OFFICIAL_RESOURCES = {
  iasc: {
    label: "Indonesia Anti-Scam Centre (IASC)",
    url: "https://iasc.ojk.go.id/",
    note: "Portal OJK untuk melaporkan penipuan transaksi keuangan.",
  },
  kontak157: {
    label: "Kontak 157 OJK: Portal Pengaduan",
    url: "https://kontak157.ojk.go.id/appkpublicportal/Pengaduan",
    note: "Saluran pengaduan konsumen sektor jasa keuangan.",
  },
  ojk: {
    label: "OJK. Otoritas Jasa Keuangan",
    url: "https://www.ojk.go.id/",
    note: "Situs resmi informasi, edukasi, dan pengecekan legalitas.",
  },
} satisfies Record<string, OfficialResource>;

const COMMON_EVIDENCE = [
  "Tangkapan layar percakapan dan profil pengirim",
  "Catatan waktu serta tanggal kejadian",
];

export const SAFETY_GUIDES: SafetyGuide[] = [
  {
    id: "received-message",
    situation: "Saya menerima pesan yang mencurigakan",
    summary:
      "Belum ada tindakan yang merugikan. Fokus pada tidak menindaklanjuti dan mengamankan bukti.",
    steps: [
      { priority: "segera", text: "Jangan balas, jangan klik tautan, dan jangan buka lampiran." },
      { priority: "segera", text: "Jangan berikan kode OTP, PIN, kata sandi, atau data pribadi apa pun." },
      { priority: "penting", text: "Blokir dan laporkan pengirim melalui aplikasi yang kamu gunakan." },
      { priority: "penting", text: "Jika pesan mengatasnamakan lembaga atau kenalan, konfirmasi lewat saluran resmi yang kamu cari sendiri." },
      { priority: "lanjutan", text: "Simpan tangkapan layar dan catat nomor/akun pengirim sebagai bukti." },
    ],
    evidenceChecklist: [...COMMON_EVIDENCE, "Teks/tautan pesan (jangan diklik)"],
    checks: [
      "Apakah pengirim benar orang atau institusi yang diklaim?",
      "Apakah Anda memang sedang menunggu pesan dari pihak tersebut?",
      "Apakah ada permintaan uang, kode, atau data pribadi?",
    ],
    resources: [OFFICIAL_RESOURCES.ojk],
  },
  {
    id: "clicked-link",
    situation: "Saya mengklik tautan mencurigakan tapi belum mengisi apa pun",
    summary:
      "Risiko relatif rendah, tetapi perangkat perlu dicek dan akun penting perlu diamankan.",
    steps: [
      { priority: "segera", text: "Tutup halaman yang terbuka tanpa mengisi formulir atau login apa pun." },
      { priority: "segera", text: "Jangan mengunduh atau menjalankan berkas apa pun dari halaman tersebut." },
      { priority: "penting", text: "Pindai perangkat dengan aplikasi keamanan yang kamu percaya." },
      { priority: "penting", text: "Ganti kata sandi akun penting bila kamu sempat diminta login di halaman itu." },
      { priority: "lanjutan", text: "Aktifkan verifikasi dua langkah pada akun-akun penting." },
    ],
    evidenceChecklist: ["Tangkapan layar alamat/halaman yang terbuka", "Waktu kunjungan"],
    checks: [
      "Apakah halaman meminta login, unduhan, atau izin akses?",
      "Apakah ada aplikasi baru yang terpasang tanpa Anda sadari?",
      "Apakah riwayat peramban menunjukkan pengalihan ke situs lain?",
    ],
    resources: [],
  },
  {
    id: "entered-credentials",
    situation: "Saya memasukkan kata sandi atau OTP",
    summary:
      "Kredensial mungkin sudah bocor. Prioritaskan mengganti kredensial dan mencabut sesi lain.",
    steps: [
      { priority: "segera", text: "Buka situs/aplikasi resmi (diketik manual) dan ganti kata sandi akun terkait." },
      { priority: "segera", text: "Cabut atau keluarkan semua sesi/perangkat lain yang terhubung." },
      { priority: "penting", text: "Ganti kata sandi email yang terhubung dan aktifkan verifikasi dua langkah." },
      { priority: "penting", text: "Periksa aktivitas login dan transaksi terakhir; catat yang tidak dikenali." },
      { priority: "lanjutan", text: "Lapor ke penyedia layanan bila kamu tidak dapat mengakses akun." },
    ],
    evidenceChecklist: [...COMMON_EVIDENCE, "Bukti halaman login palsu bila ada"],
    checks: [
      "Riwayat login akun terkait, apakah ada perangkat atau lokasi asing?",
      "Email dan nomor pemulihan, apakah masih milik Anda?",
      "Perangkat yang masih memiliki sesi aktif.",
      "Kata sandi yang sama dipakai di akun lain.",
    ],
    resources: [OFFICIAL_RESOURCES.ojk],
  },
  {
    id: "transferred-money",
    situation: "Saya sudah mentransfer uang",
    summary:
      "Prioritas utama: hubungi bank/e-wallet lewat kanal resmi sesegera mungkin.",
    steps: [
      { priority: "segera", text: "Hubungi bank atau penyedia e-wallet lewat kanal resmi dan laporkan transaksinya." },
      { priority: "segera", text: "Minta penundaan atau pemblokiran transaksi bila masih memungkinkan." },
      { priority: "penting", text: "Kumpulkan bukti: tanda terima, mutasi, percakapan, serta nomor rekening tujuan." },
      { priority: "penting", text: "Laporkan melalui Indonesia Anti-Scam Centre (IASC) untuk penipuan keuangan." },
      { priority: "penting", text: "Ajukan pengaduan lewat Kontak 157 OJK untuk lembaga jasa keuangan." },
      { priority: "lanjutan", text: "Buat laporan kepolisian bila diperlukan, dengan membawa seluruh bukti." },
    ],
    evidenceChecklist: ["Tanda terima/bukti transfer dan mutasi", "Nomor rekening tujuan", ...COMMON_EVIDENCE],
    checks: [
      "Status transaksi di aplikasi bank atau e-wallet.",
      "Rekening tujuan, apakah masih bisa dilaporkan ke penyedia.",
      "Metode pembayaran yang tersimpan, apakah perlu dihapus.",
    ],
    resources: [OFFICIAL_RESOURCES.iasc, OFFICIAL_RESOURCES.kontak157, OFFICIAL_RESOURCES.ojk],
  },
  {
    id: "account-takeover",
    situation: "Akun saya mungkin telah diambil alih",
    summary:
      "Pulihkan lewat jalur resmi dan segera peringatkan kontakmu.",
    steps: [
      { priority: "segera", text: "Gunakan fitur pemulihan resmi penyedia layanan untuk mengambil alih kembali akun." },
      { priority: "segera", text: "Segera ganti kata sandi dan aktifkan verifikasi dua langkah setelah akses kembali." },
      { priority: "penting", text: "Cabut izin aplikasi atau sesi perangkat yang tidak dikenal." },
      { priority: "penting", text: "Peringatkan kontakmu lewat kanal terpisah agar tidak tertipu pesan dari akunmu." },
      { priority: "lanjutan", text: "Laporkan ke penyedia layanan dan simpan bukti pengambilalihan." },
    ],
    evidenceChecklist: ["Bukti login yang tidak dikenal", ...COMMON_EVIDENCE],
    checks: [
      "Perangkat yang masih login ke akun tersebut.",
      "Email pemulihan dan nomor telepon pada pengaturan akun.",
      "Pesan terkirim, apakah ada permintaan yang dikirim ke kontak Anda.",
      "Aplikasi pihak ketiga yang memiliki izin akses.",
    ],
    resources: [],
  },
  {
    id: "shared-documents",
    situation: "Saya membagikan dokumen identitas atau data pribadi",
    summary:
      "Dokumen pribadi bisa disalahgunakan. Catat dan pantau pemakaiannya.",
    steps: [
      { priority: "segera", text: "Catat dokumen apa yang dibagikan, kepada siapa, dan kapan." },
      { priority: "segera", text: "Jangan mengirim dokumen tambahan atau informasi pelengkap apa pun." },
      { priority: "penting", text: "Pantau laporan kredit/layanan yang memakai identitasmu bila datanya menyangkut keuangan." },
      { priority: "penting", text: "Hubungi lembaga penerbit dokumen bila KTP atau dokumen lain dicurigai disalahgunakan." },
      { priority: "lanjutan", text: "Waspadai panggilan atau penawaran mencurigakan yang menyebut data pribadimu." },
    ],
    evidenceChecklist: [...COMMON_EVIDENCE, "Daftar dokumen yang pernah dibagikan"],
    checks: [
      "Dokumen apa saja yang sudah dibagikan dan kepada siapa.",
      "Apakah nomor rekening atau data keuangan ikut terkirim.",
      "Apakah ada pinjaman atau rekening baru atas nama Anda.",
    ],
    resources: [OFFICIAL_RESOURCES.ojk],
  },
];