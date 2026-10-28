export interface ScenarioOption {
  id: string;
  label: string;
  isSafest: boolean;
  feedback: string;
  recommendedAction: string;
}

export interface TrainingScenario {
  id: string;
  category: string;
  title: string;
  setup: string;
  message: string;
  options: ScenarioOption[];
}

export const SCENARIOS: TrainingScenario[] = [
  {
    id: "recruitment",
    category: "Lowongan palsu",
    title: "Lowongan dengan biaya pendaftaran",
    setup:
      "Kamu baru saja melamar kerja dan menerima pesan ini dari nomor yang tidak dikenal.",
    message:
      "Kami dari tim rekrutmen PT Karya Sinar Abadi. Anda lolos seleksi berkas. Segera transfer biaya administrasi Rp250.000 untuk aktivasi data calon karyawan, atau slot wawancara Anda kami berikan ke orang lain.",
    options: [
      {
        id: "pay",
        label: "Segera transfer agar tidak kehilangan kesempatan",
        isSafest: false,
        feedback:
          "Perusahaan resmi tidak meminta calon karyawan membayar biaya apa pun di muka. Ini pola umum lowongan palsu.",
        recommendedAction:
          "Abaikan dan jangan transfer. Cek lowongan melalui situs karier resmi perusahaan.",
      },
      {
        id: "verify",
        label: "Cek dulu kebenaran lowongan lewat situs resmi perusahaan",
        isSafest: true,
        feedback:
          "Tepat. Verifikasi lewat saluran resmi yang kamu cari sendiri, bukan dari nomor pengirim.",
        recommendedAction:
          "Hubungi kontak resmi perusahaan dan konfirmasi apakah lowongan itu benar ada.",
      },
      {
        id: "ask",
        label: "Balas menanyakan detail, lalu transfer jika meyakinkan",
        isSafest: false,
        feedback:
          "Penipu pandai meyakinkan. Permintaan biaya di muka tetaplah tanda bahaya.",
        recommendedAction:
          "Jangan lanjut membalas. Laporkan nomor tersebut dan jangan kirim dana.",
      },
    ],
  },
  {
    id: "otp",
    category: "Permintaan OTP",
    title: "Operator palsu meminta kode OTP",
    setup:
      "Kamu menerima telepon yang mengaku dari layanan perbankan digital.",
    message:
      "Selamat siang, saya petugas Bank Sahabat Nusantara. Sistem kami mendeteksi transaksi mencurigakan. Untuk mengamankan akun Anda, sebutkan kode OTP yang baru kami kirim ke nomor Anda.",
    options: [
      {
        id: "give-otp",
        label: "Sebutkan kode OTP agar akun aman",
        isSafest: false,
        feedback:
          "Kode OTP tidak pernah diminta oleh petugas resmi. Memberikannya membuka akses penuh ke akunmu.",
        recommendedAction:
          "Jangan pernah membagikan OTP. Tutup panggilan dan hubungi bank lewat kanal resmi.",
      },
      {
        id: "refuse",
        label: "Tolak memberi kode dan verifikasi lewat aplikasi resmi",
        isSafest: true,
        feedback:
          "Benar. Petugas resmi tidak akan meminta OTP. Cek notifikasi di aplikasi resmi untuk memastikan tidak ada masalah.",
        recommendedAction:
          "Buka aplikasi resmi, periksa riwayat transaksi, dan hubungi layanan resmi bila ragu.",
      },
      {
        id: "read-out",
        label: "Bacakan angka yang muncul, tapi tanpa konfirmasi identitas",
        isSafest: false,
        feedback:
          "Membacakan OTP sama saja dengan menyerahkan kuncinya, apa pun alasannya.",
        recommendedAction:
          "Hentikan percakapan dan laporkan percobaan ini ke layanan resmi.",
      },
    ],
  },
  {
    id: "link",
    category: "Tautan mencurigakan",
    title: "Tautan pendek di pesan tidak dikenal",
    setup:
      "Kamu menerima pesan yang mengaku berisi struktur slip gaji atau info penting.",
    message:
      "Info gaji & tunjangan bulan ini sudah kami kirim, silakan cek di sini: https://bit.ly/info-gaji-karyawan",
    options: [
      {
        id: "click",
        label: "Langsung klik untuk melihat info",
        isSafest: false,
        feedback:
          "Tautan pendek menyembunyikan tujuan aslinya dan bisa mengarah ke halaman palsu.",
        recommendedAction:
          "Jangan klik. Minta info melalui kanal internal yang biasa kamu gunakan.",
      },
      {
        id: "ask-sender",
        label: "Konfirmasi ke pengirim lewat jalur lain sebelum membuka",
        isSafest: true,
        feedback:
          "Benar. Memastikan ke pengirim lewat saluran terpisah mencegahmu terpancing tautan palsu.",
        recommendedAction:
          "Hubungi HRD atau rekan lewat kontak/email resmi, bukan nomor pengirim pesan ini.",
      },
      {
        id: "copy",
        label: "Salin dan buka di mode penyamaran",
        isSafest: false,
        feedback:
          "Membuka tautan mencurigakan tetap berisiko meski memakai mode penyamaran.",
        recommendedAction:
          "Hindari membuka. Gunakan saluran resmi untuk mengakses informasi tersebut.",
      },
    ],
  },
  {
    id: "impersonation",
    category: "Peniruan pihak resmi",
    title: "Admin marketplace mengalihkan pembayaran",
    setup:
      "Kamu sedang berbelanja dan diarahkan bertransaksi di luar aplikasi.",
    message:
      "Ini admin resmi BelanjaSeru. Stok yang Anda pesan tinggal satu. Agar tidak keduluan, silakan transfer langsung ke rekening pribadi gudang kami di nomor 0812-XXXX dan konfirmasi di sini.",
    options: [
      {
        id: "off-app",
        label: "Transfer ke rekening yang diberikan agar pesanan aman",
        isSafest: false,
        feedback:
          "Transaksi di luar aplikasi atau ke rekening pribadi tidak terlindungi sistem dan sulit dilacak.",
        recommendedAction:
          "Tolak. Semua pembayaran resmi diproses di dalam aplikasi.",
      },
      {
        id: "stay-app",
        label: "Tolak dan lanjutkan pembayaran hanya di dalam aplikasi",
        isSafest: true,
        feedback:
          "Tepat. Bertransaksi di dalam aplikasi menjaga keamanan dan bukti pembayaranmu.",
        recommendedAction:
          "Bayar lewat metode resmi aplikasi. Laporkan akun yang meminta transfer di luar aplikasi.",
      },
      {
        id: "negotiate",
        label: "Minta potongan harga lalu transfer",
        isSafest: false,
        feedback:
          "Diskon tidak mengurangi risiko. Transfer ke rekening pribadi tetap rentan penipuan.",
        recommendedAction:
          "Batalkan rencana transfer dan gunakan jalur pembayaran resmi.",
      },
    ],
  },
  {
    id: "investment",
    category: "Investasi palsu",
    title: "Tawaran untung pasti",
    setup:
      "Sebuah grup chat menawarkan peluang investasi yang menggiurkan.",
    message:
      "Gabung investasi emas digital sekarang! Dijamin untung 20% per bulan, tanpa risiko. Banyak member sudah buktikan. Transfer modalmu hari ini, makin besar makin cepat cuan.",
    options: [
      {
        id: "invest-big",
        label: "Transfer modal besar sekalian agar cepat untung",
        isSafest: false,
        feedback:
          "Tidak ada investasi sah yang menjanjikan keuntungan pasti. Semakin besar dana, semakin besar risikonya.",
        recommendedAction:
          "Jangan transfer. Cek legalitas penawaran di situs resmi OJK.",
      },
      {
        id: "skip",
        label: "Abaikan, karena janji untung pasti adalah tanda bahaya",
        isSafest: true,
        feedback:
          "Benar. Imbal hasil besar yang dijamin adalah ciri penawaran ilegal.",
        recommendedAction:
          "Laporkan dan blokir pengirim. Edukasi orang terdekat agar tidak ikut.",
      },
      {
        id: "small-test",
        label: "Coba modal kecil dulu untuk menguji",
        isSafest: false,
        feedback:
          "Banyak skema penipuan justru membayar keuntungan awal kecil untuk menjerat korban.",
        recommendedAction:
          "Hindari sama sekali. Setor dana ke entitas yang sudah terdaftar di OJK.",
      },
    ],
  },
  {
    id: "giveaway",
    category: "Undian palsu",
    title: "Menang hadiah tanpa ikut undian",
    setup:
      "Kamu dikabari menang hadiah padahal tidak pernah mendaftar undian.",
    message:
      "Selamat! Nomormu terpilih jadi pemenang mobil. Untuk klaim, silakan kirim foto KTP dan transfer biaya administrasi Rp500.000 ke rekening panitia. Batas klaim hari ini.",
    options: [
      {
        id: "send-docs",
        label: "Kirim KTP dan transfer biaya administrasi",
        isSafest: false,
        feedback:
          "Meminta uang dan dokumen pribadi untuk klaim hadiah adalah pola undian bodong.",
        recommendedAction:
          "Jangan kirim apa pun. Hadiah sah tidak meminta biaya di muka.",
      },
      {
        id: "ignore",
        label: "Abaikan karena tidak pernah ikut undian",
        isSafest: true,
        feedback:
          "Tepat. Kamu tidak bisa menang undian yang tidak pernah kamu ikuti.",
        recommendedAction: "Hapus dan blokir. Jangan klik tautan atau balas pesan tersebut.",
      },
      {
        id: "verify-prize",
        label: "Minta bukti legalitas panitia undian dulu",
        isSafest: false,
        feedback:
          "Membalas tetap membuka peluang dimanipulasi dengan dokumen palsu yang meyakinkan.",
        recommendedAction: "Jangan lanjut berkomunikasi. Laporkan nomor pengirim.",
      },
    ],
  },
  {
    id: "recovery",
    category: "Pemulihan akun",
    title: "Bantuan pemulihan akun yang meminta kode",
    setup:
      "Akun media sosialmu sempat dilaporkan bermasalah dan kamu mencari bantuan.",
    message:
      "Saya dari tim bantuan resmi. Akun Anda bisa dipulihkan hari ini. Kirimkan kode verifikasi yang masuk ke email Anda agar kami bisa memulihkannya dari sistem kami.",
    options: [
      {
        id: "send-code",
        label: "Kirim kode verifikasi untuk mempercepat pemulihan",
        isSafest: false,
        feedback:
          "Kode verifikasi atau pemulihan tidak pernah diminta oleh tim resmi. Memberikannya bisa membuat akun diambil alih.",
        recommendedAction:
          "Jangan berikan. Gunakan halaman pemulihan resmi aplikasi.",
      },
      {
        id: "official-recovery",
        label: "Pulihkan sendiri lewat menu resmi aplikasi",
        isSafest: true,
        feedback:
          "Benar. Pemulihan akun hanya dilakukan lewat fitur resmi penyedia layanan.",
        recommendedAction:
          "Ikuti panduan pemulihan resmi dan aktifkan verifikasi dua langkah.",
      },
    ],
  },
  {
    id: "transfer",
    category: "Permintaan transfer uang",
    title: "Teman dengan nomor baru butuh dana",
    setup:
      "Seorang teman mengaku ganti nomor dan meminta bantuan dana mendesak.",
    message:
      "Ini aku, Rara. Nomor lamaku hilang. Aku lagi di luar kota dan butuh cepat Rp1.000.000 hari ini juga untuk tiket pulang. Bisa transfer sekarang? Nanti langsung kuganti.",
    options: [
      {
        id: "send",
        label: "Langsung transfer karena kasihan",
        isSafest: false,
        feedback:
          "Penipu sering menyamar sebagai teman dan memanfaatkan rasa iba serta desakan waktu.",
        recommendedAction:
          "Jangan transfer dulu. Konfirmasi lewat jalur lain yang benar-benar milik temanmu.",
      },
      {
        id: "verify-call",
        label: "Telepon nomor lamanya atau tanya hal pribadi",
        isSafest: true,
        feedback:
          "Tepat. Memastikan identitas lewat saluran terpisah mencegah transfer ke penipu.",
        recommendedAction:
          "Tanya pertanyaan yang hanya temanmu yang tahu, atau hubungi lewat kontak lamanya.",
      },
      {
        id: "close-friend",
        label: "Tanya teman bersama dulu, lalu transfer",
        isSafest: false,
        feedback:
          "Berkonsultasi itu baik, tapi keputusan transfer tetap harus menunggu identitas terverifikasi.",
        recommendedAction:
          "Pastikan langsung ke orangnya lewat jalur yang kamu yakini sebelum mengirim uang.",
      },
    ],
  },
];