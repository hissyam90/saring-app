import type { ArticleCategory } from "./resources";

export interface ScenarioOption {
  id: string;
  label: string;
  /**
   * Nilai keputusan:
   * 100 = langkah terbaik yang menutup risiko utama.
   * 50  = cukup hati-hati, tetapi masih menyisakan celah.
   * 0   = tindakan berisiko atau tidak menutup risiko sama sekali.
   */
  points: number;
  /** Apa yang terjadi bila pilihan ini diambil. */
  feedback: string;
  /** Risiko spesifik pilihan ini. Kosong untuk pilihan terbaik. */
  risk: string;
  /** Langkah yang seharusnya diambil. */
  betterAction: string;
  /** Mengapa langkah itu lebih baik. */
  rationale: string;
}

export interface TrainingScenario {
  id: string;
  category: ArticleCategory;
  title: string;
  setup: string;
  message: string;
  options: ScenarioOption[];
  /** Slug artikel Pustaka yang relevan untuk dipelajari ulang. */
  article: string;
}

export const SCENARIOS: TrainingScenario[] = [
  {
    id: "teman-nomor-baru",
    category: "Rekayasa sosial",
    title: "Nomor baru, minta pinjaman",
    setup: "Pesan masuk dari nomor yang tidak ada di kontak Anda.",
    message:
      "Ra ini aku, nomor baru ya. HP lama ilang kemarin. Bisa pinjem 500 dulu gak? Buat bayar kos, hari ini harus setor. Sore aku balikin.",
    options: [
      {
        id: "transfer",
        label: "Transfer sekarang, kasihan kalau benar-benar butuh",
        points: 0,
        feedback:
          "Nominal kecil dan alasannya masuk akal, tetapi identitas pengirim belum terbukti sama sekali.",
        risk:
          "Uang berpindah ke rekening yang tidak bisa Anda pastikan pemiliknya, dan tidak ada dasar untuk menuntutnya kembali.",
        betterAction: "Telepon atau video call ke nomor lama sebelum memutuskan apa pun.",
        rationale:
          "Satu panggilan cukup untuk memastikan apakah pengirim benar orang yang Anda kenal.",
      },
      {
        id: "ask-photo",
        label: "Minta kirim foto selfie dulu sebagai bukti",
        points: 50,
        feedback:
          "Anda mencoba memverifikasi, tetapi foto bisa diambil dari media sosial atau dikirim orang lain.",
        risk:
          "Verifikasi lewat gambar tidak membuktikan identitas. Pelaku bisa memakai foto lama dari profil.",
        betterAction:
          "Minta panggilan video langsung, atau hubungi nomor lama yang tersimpan.",
        rationale:
          "Panggilan video menampilkan orang secara langsung dan sulit dipalsukan.",
      },
      {
        id: "call-old",
        label: "Hubungi nomor lama lewat panggilan suara atau video",
        points: 100,
        feedback:
          "Tepat. Anda memverifikasi lewat kanal yang tidak dikendalikan pengirim.",
        risk: "",
        betterAction:
          "Jika nomor lama tidak aktif, minta panggilan video dari nomor baru ini.",
        rationale:
          "Verifikasi lewat kanal terpisah memastikan identitas tanpa bergantung pada klaim pengirim.",
      },
    ],
    article: "nomor-baru-minta-uang",
  },
  {
    id: "otp-cs-bank",
    category: "Kredensial",
    title: "Petugas bank meminta kode OTP",
    setup: "Panggilan masuk mengaku dari layanan pelanggan bank Anda.",
    message:
      "Selamat siang, saya dari layanan nasabah. Ada percobaan transaksi mencurigakan di kartu Anda. Untuk membatalkannya, mohon sebutkan kode OTP yang baru kami kirim ke SMS Anda.",
    options: [
      {
        id: "read-otp",
        label: "Sebutkan kode OTP agar transaksi dibatalkan",
        points: 0,
        feedback:
          "Membacakan OTP sama dengan menyerahkan kunci akun kepada orang di telepon.",
        risk:
          "Pelaku bisa menyelesaikan transaksi atau mengambil alih akun sepenuhnya.",
        betterAction:
          "Tutup panggilan, lalu hubungi bank lewat nomor resmi di belakang kartu.",
        rationale:
          "Petugas resmi tidak pernah meminta OTP. Pembatalan dilakukan lewat kanal resmi, bukan lewat kode yang Anda berikan.",
      },
      {
        id: "ask-name",
        label: "Tanyakan nama dan nomor induk petugas dulu",
        points: 50,
        feedback:
          "Anda menahan diri, tetapi pelaku mudah menyebut nama dan nomor karangan.",
        risk:
          "Identitas yang disebut lewat telepon tidak dapat diverifikasi, sehingga Anda masih bisa tertipu.",
        betterAction:
          "Tutup panggilan dan hubungi bank lewat kanal resmi yang Anda cari sendiri.",
        rationale:
          "Verifikasi harus lewat kanal yang Anda kendalikan, bukan informasi dari penelepon.",
      },
      {
        id: "hang-up",
        label: "Tutup panggilan, cek aplikasi resmi, lalu hubungi bank sendiri",
        points: 100,
        feedback:
          "Tepat. Anda memutus jalur pelaku dan memeriksa dari sumber yang benar.",
        risk: "",
        betterAction:
          "Buka aplikasi resmi untuk memeriksa transaksi, lalu hubungi call center resmi bila perlu.",
        rationale:
          "Jika memang ada transaksi mencurigakan, informasinya muncul di aplikasi resmi tanpa perlu memberi kode apa pun.",
      },
    ],
    article: "otp-dan-pengambilalihan-akun",
  },
  {
    id: "akun-diblokir",
    category: "Tautan dan akun",
    title: "Ancaman akun diblokir dalam 24 jam",
    setup: "Pesan singkat bernada mendesak masuk ke WhatsApp Anda.",
    message:
      "PEMBERITAHUAN: akun Anda akan DIBLOKIR dalam 24 jam karena aktivitas tidak wajar. Verifikasi sekarang di http://verifikasi-akun-aman.xyz/login atau akun hilang permanen.",
    options: [
      {
        id: "click-fast",
        label: "Buka tautannya sekarang, jangan sampai diblokir",
        points: 0,
        feedback:
          "Tenggat 24 jam dirancang agar Anda tidak sempat memeriksa alamat tautannya.",
        risk: "Halaman tiruan bisa mencuri kata sandi dan kode verifikasi Anda.",
        betterAction:
          "Abaikan tautannya dan buka aplikasi resmi layanan tersebut langsung.",
        rationale:
          "Status akun hanya bisa dipercaya dari aplikasi resmi, bukan dari pesan dengan tautan.",
      },
      {
        id: "open-no-input",
        label: "Buka tautan untuk melihat tampilannya, tapi tidak mengisi apa pun",
        points: 50,
        feedback:
          "Anda menahan data, tetapi tautan tetap dimuat dan bisa mencatat kunjungan Anda.",
        risk:
          "Anda memberi tahu pelaku bahwa nomor Anda aktif, dan berisiko memuat skrip berbahaya.",
        betterAction:
          "Jangan buka sama sekali. Periksa struktur tautannya di tab Periksa Tautan bila ingin tahu polanya.",
        rationale:
          "Inspeksi teks memberi informasi yang sama tanpa memuat halaman pelaku.",
      },
      {
        id: "verify-app",
        label: "Buka aplikasi resmi untuk memastikan status akun",
        points: 100,
        feedback:
          "Tepat. Anda memeriksa dari sumber yang tidak bisa dipalsukan pengirim pesan.",
        risk: "",
        betterAction:
          "Jika aplikasi menunjukkan akun normal, abaikan dan blokir pengirim pesan.",
        rationale:
          "Peringatan pemblokiran yang sah muncul di dalam aplikasi resmi, bukan lewat tautan pihak ketiga.",
      },
    ],
    article: "phishing-domain-mirip",
  },
  {
    id: "lowongan-biaya",
    category: "Kerja dan uang",
    title: "Lolos seleksi, diminta biaya administrasi",
    setup: "Anda melamar lewat akun Instagram lowongan kerja.",
    message:
      "Halo kak, selamat! CV kakak lolos seleksi berkas di PT Karya Sinar Abadi. Untuk proses selanjutnya ada biaya administrasi 250rb ya kak. Transfer ke BCA 1234567890 a.n Rina Melati. Hari ini terakhir kak.",
    options: [
      {
        id: "pay",
        label: "Bayar supaya tidak kehilangan kesempatan",
        points: 0,
        feedback: "Tenggat hari ini membuat Anda tidak sempat memeriksa perusahaan.",
        risk: "Perusahaan fiktif mendapat uang Anda, dan data pribadi Anda sudah mereka pegang.",
        betterAction: "Jangan bayar. Cek lowongan di halaman karier resmi perusahaan.",
        rationale: "Rekrutmen sah tidak memungut biaya dari pelamar, dalam bentuk apa pun.",
      },
      {
        id: "ask-hrd",
        label: "Minta kontak HRD resmi lalu telepon",
        points: 50,
        feedback: "Anda mencoba memverifikasi, tetapi kontak yang diberikan tetap berasal dari pengirim.",
        risk: "Nomor yang diberikan bisa milik rekan pelaku, sehingga verifikasi terasa meyakinkan padahal palsu.",
        betterAction: "Cari nomor perusahaan sendiri dari situs resminya, lalu hubungi dari sana.",
        rationale: "Verifikasi hanya sah bila kanal penghubungnya Anda temukan sendiri.",
      },
      {
        id: "check-career",
        label: "Cek halaman karier resmi dan hubungi perusahaan dari sana",
        points: 100,
        feedback: "Tepat. Anda menguji keberadaan lowongan tanpa memberi uang atau data.",
        risk: "",
        betterAction: "Jika lowongan tidak ada di situs resmi, abaikan dan laporkan akun pengirim.",
        rationale: "Lowongan asli bisa dibuktikan dari kanal resmi perusahaan.",
      },
    ],
    article: "lowongan-kerja-palsu",
  },
  {
    id: "tugas-online",
    category: "Kerja dan uang",
    title: "Tugas rating dibayar, lalu diminta deposit",
    setup: "Anda dihubungi lewat Telegram dan sudah dibayar Rp25.000 untuk tugas pertama.",
    message:
      "Selamat, tugas pertama selesai. Sekarang masuk level 2 ya kak. Untuk membuka paket tugas, cukup setor saldo 300rb. Nanti saldo plus komisi 400rb bisa ditarik langsung.",
    options: [
      {
        id: "deposit",
        label: "Setor 300rb karena tugas pertama sudah terbukti dibayar",
        points: 0,
        feedback: "Pembayaran kecil di awal memang dirancang untuk membuat Anda percaya.",
        risk: "Setoran berikutnya akan terus bertambah dengan syarat baru yang tidak pernah selesai.",
        betterAction: "Berhenti sekarang dan jangan menyetor apa pun.",
        rationale: "Tidak ada pekerjaan sah yang meminta pekerja menyetor uang lebih dulu.",
      },
      {
        id: "small-deposit",
        label: "Setor nominal terkecil dulu untuk menguji",
        points: 50,
        feedback: "Anda membatasi kerugian, tetapi tetap masuk ke skema yang sama.",
        risk: "Setoran sekecil apa pun memulai pola yang mendorong setoran lebih besar.",
        betterAction: "Berhenti total, simpan bukti, dan blokir pengirim.",
        rationale: "Skema seperti ini tidak punya titik henti yang menguntungkan Anda.",
      },
      {
        id: "stop",
        label: "Berhenti, simpan bukti, dan blokir pengirim",
        points: 100,
        feedback: "Tepat. Anda mengenali bahwa pekerjaan tidak seharusnya meminta modal.",
        risk: "",
        betterAction: "Laporkan nomor pengirim ke platform pesan yang dipakai.",
        rationale: "Kerugian berhenti pada nilai yang sudah Anda terima, bukan bertambah.",
      },
    ],
    article: "tugas-online-dan-komisi",
  },
  {
    id: "marketplace-luar-aplikasi",
    category: "Kerja dan uang",
    title: "Penjual minta bayar di luar aplikasi",
    setup: "Anda sedang menegosiasikan harga kamera bekas di marketplace.",
    message:
      "Oke harga deal ya kak. Tapi jangan lewat aplikasi, nanti kepotong admin. Transfer langsung ke rekening saya aja, nanti sore saya kirim. Sudah biasa kok saya begini.",
    options: [
      {
        id: "direct-transfer",
        label: "Transfer ke rekening penjual agar lebih murah",
        points: 0,
        feedback: "Anda menghemat biaya admin, tetapi kehilangan seluruh perlindungan pembeli.",
        risk: "Tidak ada pihak yang menahan dana, sehingga barang tidak datang berarti uang hilang.",
        betterAction: "Tetap bertransaksi di dalam aplikasi.",
        rationale: "Sistem marketplace menahan dana sampai barang diterima, itulah yang Anda bayar.",
      },
      {
        id: "half-now",
        label: "Transfer setengah dulu, sisanya setelah barang datang",
        points: 50,
        feedback: "Anda mengurangi kerugian, tetapi tetap mentransfer tanpa jaminan.",
        risk: "Uang muka tetap bisa hilang, dan penjual tidak punya kewajiban apa pun di luar sistem.",
        betterAction: "Gunakan pembayaran di dalam aplikasi atau COD.",
        rationale: "COD aman karena uang berpindah bersamaan dengan barang, bukan sebelumnya.",
      },
      {
        id: "stay-in-app",
        label: "Tolak, dan bayar hanya lewat aplikasi atau COD",
        points: 100,
        feedback: "Tepat. Anda mempertahankan perlindungan yang seharusnya Anda dapatkan.",
        risk: "",
        betterAction: "Laporkan penjual yang meminta transaksi di luar aplikasi.",
        rationale: "Selama transaksi di dalam sistem, ada mekanisme sengketa bila barang tidak sesuai.",
      },
    ],
    article: "transaksi-luar-aplikasi",
  },
  {
    id: "kurir-paket",
    category: "Tautan dan akun",
    title: "Paket gagal dikirim, diminta data kartu",
    setup: "Anda menerima SMS padahal tidak sedang menunggu paket.",
    message:
      "Paket anda gagal dikirim karena alamat tidak lengkap. Konfirmasi alamat dan biaya kirim ulang Rp8.000 di https://bit.ly/konfirmasi-paket-id . Besok kami kirim ulang.",
    options: [
      {
        id: "fill-card",
        label: "Isi data kartu karena biayanya cuma Rp8.000",
        points: 0,
        feedback: "Nominal kecil memang dipilih agar Anda tidak curiga.",
        risk: "Yang diambil bukan Rp8.000, melainkan nomor kartu, masa berlaku, dan CVV Anda.",
        betterAction: "Tutup halaman. Jangan masukkan data kartu untuk biaya pengiriman.",
        rationale: "Kurir resmi tidak meminta data kartu lengkap lewat halaman web.",
      },
      {
        id: "check-tracking",
        label: "Buka tautannya untuk melihat nomor resi",
        points: 50,
        feedback: "Anda belum memasukkan data, tetapi tetap memuat halaman pelaku.",
        risk: "Halaman bisa meminta data pada langkah berikutnya, atau mencatat kunjungan Anda.",
        betterAction: "Periksa struktur tautannya di Periksa Tautan tanpa membukanya.",
        rationale: "Alamat pendek menyembunyikan tujuan, dan inspeksi teks cukup untuk menilainya.",
      },
      {
        id: "ignore",
        label: "Abaikan karena tidak sedang menunggu paket",
        points: 100,
        feedback: "Tepat. Premis pesannya tidak berlaku untuk Anda.",
        risk: "",
        betterAction: "Hapus pesan dan blokir pengirimnya.",
        rationale: "Pesan paket hanya relevan bila Anda memang punya pesanan berjalan.",
      },
    ],
    article: "penipuan-paket-kurir",
  },
  {
    id: "investasi-pasti",
    category: "Kerja dan uang",
    title: "Investasi dijamin untung 20 persen per bulan",
    setup: "Seorang kenalan di grup chat menawarkan peluang investasi.",
    message:
      "join investasi emas digital yuk, slot terbatas. dijamin untung 20% perbulan, tanpa risiko sama sekali. modal 100rb aja, banyak yang udah buktiin.",
    options: [
      {
        id: "invest",
        label: "Ikut dengan modal kecil karena risikonya kecil",
        points: 0,
        feedback: "Imbal hasil tetap yang dijamin adalah ciri penawaran tanpa izin.",
        risk: "Skema membayar anggota lama dari setoran baru, sehingga peserta terakhir kehilangan dana.",
        betterAction: "Tolak, lalu cek izin entitas dan produknya di situs OJK.",
        rationale: "Tidak ada investasi sah yang menjamin keuntungan.",
      },
      {
        id: "ask-legal",
        label: "Minta bukti izin OJK dari penawarnya",
        points: 50,
        feedback: "Anda memeriksa, tetapi dokumen dari penawarnya sendiri mudah dipalsukan.",
        risk: "Bukti yang dikirim penawarnya tidak dapat dipercaya sebagai verifikasi.",
        betterAction: "Cek sendiri nama entitas dan produk di situs resmi OJK.",
        rationale: "Verifikasi legalitas harus dari sumber resmi, bukan dari pihak yang menawarkan.",
      },
      {
        id: "verify-ojk",
        label: "Cek legalitas di situs OJK, lalu putuskan",
        points: 100,
        feedback: "Tepat. Anda memindahkan verifikasi ke sumber yang berwenang.",
        risk: "",
        betterAction: "Laporkan penawaran tersebut bila entitasnya tidak terdaftar.",
        rationale: "Legalitas adalah syarat pertama, dan itu bisa diperiksa sendiri tanpa biaya.",
      },
    ],
    article: "investasi-palsu",
  },
  {
    id: "giveaway-klaim",
    category: "Rekayasa sosial",
    title: "Menang mobil, diminta biaya klaim",
    setup: "Pesan masuk dari nomor tak dikenal, mengaku panitia undian.",
    message:
      "SELAMAT!! Nomor Anda terpilih sebagai pemenang mobil dari undian bulan ini. Untuk klaim, kirim foto KTP dan transfer biaya administrasi Rp500.000 ke rekening panitia. Batas klaim hari ini.",
    options: [
      {
        id: "send-all",
        label: "Kirim KTP dan transfer biaya klaim",
        points: 0,
        feedback: "Kegembiraan membuat dua permintaan berisiko terlihat wajar.",
        risk: "Uang hilang, dan data KTP bisa dipakai membuka rekening atau pinjaman atas nama Anda.",
        betterAction: "Jangan kirim apa pun. Anda tidak mengikuti undian ini.",
        rationale: "Hadiah sah tidak meminta biaya maupun dokumen identitas lewat chat.",
      },
      {
        id: "ask-proof",
        label: "Minta bukti surat resmi panitia dulu",
        points: 50,
        feedback: "Anda menahan diri, tetapi pelaku mudah mengirim dokumen yang tampak resmi.",
        risk: "Dokumen palsu bisa membuat Anda melanjutkan ke langkah berikutnya.",
        betterAction: "Abaikan saja karena Anda tidak pernah mengikuti undian tersebut.",
        rationale: "Premis undiannya sudah tidak masuk akal, jadi verifikasi tidak diperlukan.",
      },
      {
        id: "ignore",
        label: "Abaikan karena tidak pernah mengikuti undian",
        points: 100,
        feedback: "Tepat. Anda menguji premis sebelum menanggapi detail.",
        risk: "",
        betterAction: "Blokir dan laporkan nomor pengirim.",
        rationale: "Tidak ada mekanisme yang membuat Anda menang tanpa pernah ikut.",
      },
    ],
    article: "giveaway-palsu",
  },
  {
    id: "login-domain-mirip",
    category: "Tautan dan akun",
    title: "Tautan login dengan domain mirip",
    setup: "Rekan kerja mengirim tautan untuk mengisi formulir cuti.",
    message:
      "ini link buat isi form cuti ya, pakai akun kantor biasa: https://portal-hrd-kantor.absensi-online.net/login",
    options: [
      {
        id: "login-now",
        label: "Login pakai akun kantor seperti biasa",
        points: 0,
        feedback: "Tampilan halaman bisa sangat mirip, tetapi alamatnya bukan domain kantor Anda.",
        risk: "Kredensial akun kantor bisa dicuri dan dipakai mengakses sistem internal.",
        betterAction: "Jangan login. Ketik alamat portal HRD resmi secara manual.",
        rationale: "Domain sebenarnya adalah absensi-online.net, bukan domain kantor Anda.",
      },
      {
        id: "check-domain",
        label: "Periksa domain, lalu tanya rekan lewat kanal lain",
        points: 100,
        feedback: "Tepat. Anda memeriksa alamat sekaligus memverifikasi pengirim secara terpisah.",
        risk: "",
        betterAction: "Laporkan tautan ke tim TI kantor bila domainnya tidak dikenal.",
        rationale: "Domain dibaca dari kanan sebelum garis miring, dan verifikasi lewat kanal lain menutup dua celah.",
      },
      {
        id: "open-only",
        label: "Buka tautannya untuk melihat, tapi tidak login",
        points: 50,
        feedback: "Anda menahan kredensial, tetapi tetap memuat halaman yang belum terverifikasi.",
        risk: "Halaman bisa memuat skrip berbahaya atau mencatat informasi perangkat Anda.",
        betterAction: "Periksa strukturnya di Periksa Tautan tanpa membuka.",
        rationale: "Inspeksi teks memberi informasi yang sama tanpa risiko memuat halaman.",
      },
    ],
    article: "phishing-domain-mirip",
  },
  {
    id: "pemulihan-akun",
    category: "Kredensial",
    title: "Bantuan pemulihan akun yang meminta kode",
    setup: "Akun media sosial Anda terkunci, dan Anda mencari bantuan di kolom komentar.",
    message:
      "Halo kak, saya dari tim bantuan resmi. Akun kakak bisa dipulihkan hari ini. Kirimkan kode verifikasi yang masuk ke email kakak ya, biar saya proses dari sistem kami.",
    options: [
      {
        id: "send-code",
        label: "Kirim kode verifikasi supaya cepat dipulihkan",
        points: 0,
        feedback: "Anda sedang dalam posisi butuh bantuan, sehingga lebih mudah percaya.",
        risk: "Kode pemulihan bisa dipakai mengambil alih akun yang justru ingin Anda selamatkan.",
        betterAction: "Jangan kirim kode. Gunakan menu pemulihan resmi di aplikasi.",
        rationale: "Tim resmi tidak memerlukan kode Anda, karena mereka punya akses sistem sendiri.",
      },
      {
        id: "official-recovery",
        label: "Gunakan menu pemulihan resmi di aplikasi atau situs",
        points: 100,
        feedback: "Tepat. Anda memakai jalur yang memang disediakan penyedia layanan.",
        risk: "",
        betterAction: "Setelah masuk, aktifkan verifikasi dua langkah.",
        rationale: "Pemulihan resmi tidak memerlukan perantara, dan tidak ada pihak lain yang bisa mempercepatnya.",
      },
      {
        id: "pay-service",
        label: "Pakai jasa pemulihan akun berbayar",
        points: 0,
        feedback: "Jasa seperti ini tidak memiliki akses khusus apa pun ke sistem penyedia.",
        risk: "Anda membayar biaya, menyerahkan kredensial, dan akun tetap tidak pulih.",
        betterAction: "Gunakan hanya fitur pemulihan resmi, tanpa biaya.",
        rationale: "Hanya penyedia layanan yang bisa memulihkan akunnya sendiri.",
      },
    ],
    article: "setelah-kredensial-bocor",
  },
  {
    id: "data-pribadi",
    category: "Rekayasa sosial",
    title: "Permintaan data pribadi berkedok pendataan",
    setup: "Pesan WhatsApp mengaku dari petugas kelurahan.",
    message:
      "Selamat pagi, kami dari kelurahan melakukan pendataan ulang. Mohon kirim foto KTP, KK, dan nomor rekening untuk pencocokan data bansos ya bu.",
    options: [
      {
        id: "send-docs",
        label: "Kirim semua dokumen karena mengaku dari kelurahan",
        points: 0,
        feedback: "Kedok instansi membuat permintaan yang tidak wajar terasa sah.",
        risk: "KTP, KK, dan nomor rekening cukup untuk membuka rekening atau mengajukan pinjaman atas nama Anda.",
        betterAction: "Jangan kirim lewat chat. Datang atau hubungi kantor kelurahan langsung.",
        rationale: "Pendataan resmi punya prosedur dan kanal yang bisa Anda verifikasi sendiri.",
      },
      {
        id: "ask-letter",
        label: "Minta surat tugas resmi dulu",
        points: 50,
        feedback: "Anda menahan dokumen, tetapi surat bisa dipalsukan dengan mudah.",
        risk: "Dokumen resmi palsu bisa membuat Anda mengirim data pada pesan berikutnya.",
        betterAction: "Verifikasi ke kantor kelurahan lewat nomor resmi yang Anda cari sendiri.",
        rationale: "Verifikasi harus ke instansi, bukan ke dokumen yang dikirim pengirim.",
      },
      {
        id: "verify-office",
        label: "Hubungi kelurahan lewat nomor resmi untuk memastikan",
        points: 100,
        feedback: "Tepat. Anda memindahkan verifikasi ke instansi yang sebenarnya.",
        risk: "",
        betterAction: "Bila program itu benar ada, ikuti prosedur resmi yang diberikan kelurahan.",
        rationale: "Satu telepon menghindarkan Anda dari penyalahgunaan identitas jangka panjang.",
      },
    ],
    article: "verifikasi-identitas",
  },
  {
    id: "invoice-palsu",
    category: "Kerja dan uang",
    title: "Tagihan vendor dengan rekening baru",
    setup: "Email masuk mengaku dari vendor yang biasa bekerja dengan kantor Anda.",
    message:
      "Halo, berikut invoice INV-2291 untuk pekerjaan bulan ini. Mohon diperhatikan, rekening kami berubah menjadi 7788990011 a.n CV Mitra Karya. Mohon transfer sebelum Jumat agar tidak kena denda.",
    options: [
      {
        id: "pay-invoice",
        label: "Transfer ke rekening baru karena invoice-nya lengkap",
        points: 0,
        feedback: "Perubahan rekening lewat email adalah pola penipuan invoice yang paling umum.",
        risk: "Dana kantor masuk ke rekening pelaku, dan kewajiban ke vendor asli tetap ada.",
        betterAction: "Verifikasi perubahan rekening lewat telepon ke kontak vendor yang sudah ada.",
        rationale: "Nomor rekening hanya boleh berubah lewat verifikasi suara ke kontak lama.",
      },
      {
        id: "reply-email",
        label: "Balas email untuk konfirmasi perubahan rekening",
        points: 50,
        feedback: "Anda memverifikasi, tetapi ke alamat yang sama dengan pengirim invoice.",
        risk: "Balasan Anda diterima pelaku, yang akan mengonfirmasi rekening barunya sendiri.",
        betterAction: "Telepon kontak vendor yang tersimpan, bukan membalas email.",
        rationale: "Verifikasi ke kanal yang dikendalikan pelaku tidak membuktikan apa pun.",
      },
      {
        id: "call-vendor",
        label: "Telepon kontak vendor lama untuk mengonfirmasi",
        points: 100,
        feedback: "Tepat. Anda memakai kanal yang tidak bisa dikendalikan pengirim email.",
        risk: "",
        betterAction: "Tahan pembayaran sampai vendor mengonfirmasi secara lisan.",
        rationale: "Satu panggilan mencegah kerugian besar dan menjaga hubungan dengan vendor.",
      },
    ],
    article: "verifikasi-identitas",
  },
  {
    id: "qris-tertempel",
    category: "Kerja dan uang",
    title: "Stiker QRIS yang ditempel ulang",
    setup: "Anda membayar di warung dan melihat stiker QRIS tampak bertumpuk.",
    message:
      "Setelah memindai, aplikasi menampilkan nama penerima \"Toko Berkah Jaya\" padahal nama warungnya \"Warung Bu Sri\".",
    options: [
      {
        id: "pay-anyway",
        label: "Lanjutkan karena nominalnya kecil",
        points: 0,
        feedback: "Nama penerima yang tidak cocok adalah satu-satunya peringatan yang Anda punya.",
        risk: "Uang masuk ke rekening orang lain, dan warung tidak menerima pembayaran Anda.",
        betterAction: "Batalkan, lalu tanyakan ke kasir kode mana yang benar.",
        rationale: "Nama penerima muncul tepat sebelum konfirmasi, dan itu bisa dibaca dalam satu detik.",
      },
      {
        id: "ask-cashier",
        label: "Batalkan dan tanyakan ke kasir",
        points: 100,
        feedback: "Tepat. Anda memakai informasi di layar dan memverifikasinya ke orang yang tepat.",
        risk: "",
        betterAction: "Laporkan stiker yang mencurigakan ke pemilik warung.",
        rationale: "Kasir tahu kode mana yang resmi, dan bisa langsung memeriksa stikernya.",
      },
      {
        id: "pay-cash",
        label: "Bayar tunai saja tanpa memberi tahu siapa pun",
        points: 50,
        feedback: "Anda menghindari kerugian sendiri, tetapi stiker palsu tetap terpasang.",
        risk: "Orang berikutnya bisa menjadi korban karena stiker tidak ditangani.",
        betterAction: "Bayar tunai, lalu beri tahu pemilik warung tentang stiker tersebut.",
        rationale: "Melaporkan satu menit melindungi pembeli lain di tempat yang sama.",
      },
    ],
    article: "qris-palsu",
  },
  {
    id: "cs-marketplace",
    category: "Rekayasa sosial",
    title: "Layanan pelanggan menawarkan bantuan di luar aplikasi",
    setup: "Anda mengeluh soal pesanan yang belum tiba di media sosial.",
    message:
      "Halo kak, saya admin resmi dari tim CS. Kendala pesanan kakak sudah saya catat. Supaya cepat, silakan lanjut ke WhatsApp saya ya kak, nanti saya bantu proses refund-nya.",
    options: [
      {
        id: "move-to-wa",
        label: "Lanjut ke WhatsApp sesuai arahan",
        points: 0,
        feedback: "Memindahkan percakapan ke luar sistem menghilangkan perlindungan transaksi Anda.",
        risk: "Pelaku bisa meminta biaya refund, data rekening, atau kode OTP tanpa pengawasan platform.",
        betterAction: "Tetap di kanal resmi aplikasi atau media sosial terverifikasi.",
        rationale: "Percakapan yang tercatat di sistem memberi Anda bukti dan jalur sengketa.",
      },
      {
        id: "check-verified",
        label: "Cek apakah akun yang menghubungi sudah terverifikasi",
        points: 50,
        feedback: "Anda memeriksa satu hal, tetapi tanda verifikasi juga bisa ditiru di akun lain.",
        risk: "Pelaku sering membuat akun dengan nama dan foto yang hampir identik.",
        betterAction: "Buka aplikasi resmi dan gunakan fitur bantuan di dalamnya.",
        rationale: "Bantuan resmi tersedia di dalam aplikasi, tidak perlu dipindahkan ke pesan pribadi.",
      },
      {
        id: "in-app-help",
        label: "Gunakan fitur bantuan di dalam aplikasi resmi",
        points: 100,
        feedback: "Tepat. Anda memakai jalur yang tidak bisa dipalsukan pihak lain.",
        risk: "",
        betterAction: "Simpan nomor tiket dari laporan di aplikasi sebagai bukti.",
        rationale: "Seluruh riwayat penanganan tercatat, sehingga klaim Anda bisa ditelusuri.",
      },
    ],
    article: "transaksi-luar-aplikasi",
  },
  {
    id: "chat-normal",
    category: "Tautan dan akun",
    title: "Pesan biasa dari rekan kerja",
    setup: "Pesan masuk dari nomor yang tersimpan di kontak Anda.",
    message:
      "besok kita meeting jam 10 ya di ruang rapat lt 3. jangan lupa bawa draft proposal sama print out anggaran",
    options: [
      {
        id: "treat-as-scam",
        label: "Anggap penipuan dan blokir nomornya",
        points: 0,
        feedback: "Ini percakapan normal dari kontak yang Anda kenal, tanpa permintaan berisiko.",
        risk: "Anda memutus komunikasi kerja yang sah dan bisa kehilangan informasi penting.",
        betterAction: "Tanggapi seperti biasa, tanpa perlu verifikasi tambahan.",
        rationale: "Tidak ada permintaan uang, data, kode, maupun tautan dalam pesan ini.",
      },
      {
        id: "normal-reply",
        label: "Tanggapi seperti biasa",
        points: 100,
        feedback: "Tepat. Kewaspadaan seharusnya proporsional, bukan otomatis curiga.",
        risk: "",
        betterAction: "Hadiri rapat sesuai jadwal.",
        rationale: "Mengenali pesan yang wajar sama pentingnya dengan mengenali pesan yang mencurigakan.",
      },
      {
        id: "full-verify",
        label: "Telepon balik untuk memastikan identitas pengirim",
        points: 50,
        feedback: "Tidak berbahaya, tetapi berlebihan untuk pesan rutin dari kontak tersimpan.",
        risk: "Kewaspadaan berlebihan pada hal wajar bisa merusak hubungan kerja.",
        betterAction: "Tanggapi langsung, simpan verifikasi untuk permintaan berisiko.",
        rationale: "Verifikasi diperlukan saat ada uang, data, atau tautan yang dipertaruhkan.",
      },
    ],
    article: "verifikasi-identitas",
  },
  // __MORE_SCENARIOS__
  {
    id: "ambigu-tawaran",
    category: "Rekayasa sosial",
    title: "Tawaran freelance yang belum jelas",
    setup: "Akun LinkedIn yang tidak Anda kenal mengirim pesan.",
    message:
      "Hai, saya dari tim rekrutmen agensi digital. Kami butuh penulis konten freelance. Boleh kirim portofolio dan rate kamu? Kalau cocok, kita lanjut diskusi minggu ini.",
    options: [
      {
        id: "send-all",
        label: "Kirim portofolio, KTP, dan nomor rekening sekaligus",
        points: 0,
        feedback: "Permintaan portofolio wajar, tetapi dokumen identitas dan rekening belum diperlukan.",
        risk: "Data identitas dan rekening bisa disalahgunakan sebelum ada kontrak apa pun.",
        betterAction: "Kirim portofolio dan rate saja pada tahap ini.",
        rationale: "Tahap awal rekrutmen tidak memerlukan dokumen sensitif.",
      },
      {
        id: "portfolio-only",
        label: "Kirim portofolio dan rate, tahan dokumen pribadi",
        points: 100,
        feedback: "Tepat. Anda menanggapi secara proporsional sambil melindungi data sensitif.",
        risk: "",
        betterAction: "Periksa keberadaan agensi sebelum melanjutkan ke tahap kontrak.",
        rationale: "Portofolio adalah informasi publik, sedangkan KTP dan rekening bukan.",
      },
      {
        id: "ignore",
        label: "Abaikan karena pengirim tidak dikenal",
        points: 50,
        feedback: "Aman, tetapi Anda melewatkan peluang yang mungkin sah.",
        risk: "Tidak ada kerugian keamanan, hanya kehilangan kesempatan.",
        betterAction: "Balas dengan portofolio tanpa dokumen pribadi, lalu nilai responsnya.",
        rationale: "Ketidakpastian identitas cukup ditangani dengan membatasi data, bukan menolak total.",
      },
    ],
    article: "lowongan-kerja-palsu",
  },
  {
    id: "kurir-asli",
    category: "Tautan dan akun",
    title: "Notifikasi pengiriman dari aplikasi resmi",
    setup: "Anda memang sedang menunggu pesanan, dan notifikasi muncul di aplikasi belanja.",
    message:
      "Pesanan #BS-2041 sedang dalam perjalanan. Kurir akan menghubungi Anda. Lacak status di aplikasi BelanjaSeru. Tidak ada biaya tambahan yang perlu dibayar.",
    options: [
      {
        id: "pay-fee",
        label: "Cari tautan pembayaran tambahan yang disebutkan",
        points: 0,
        feedback: "Pesan ini justru menyatakan tidak ada biaya tambahan.",
        risk: "Anda berpotensi masuk ke halaman pembayaran yang tidak terkait pesanan Anda.",
        betterAction: "Tidak ada yang perlu dibayar. Cukup pantau status di aplikasi.",
        rationale: "Jika pesan resmi menyebut tanpa biaya, maka tidak ada pembayaran yang diperlukan.",
      },
      {
        id: "track-in-app",
        label: "Pantau status lewat aplikasi resmi",
        points: 100,
        feedback: "Tepat. Anda memakai kanal yang memang menerbitkan notifikasi tersebut.",
        risk: "",
        betterAction: "Tunggu kurir menghubungi lewat nomor yang tertera di aplikasi.",
        rationale: "Status pesanan paling akurat ada di aplikasi tempat Anda bertransaksi.",
      },
      {
        id: "call-sender",
        label: "Telepon nomor pengirim untuk memastikan",
        points: 50,
        feedback: "Tidak berbahaya, tetapi tidak perlu untuk notifikasi rutin.",
        risk: "Tidak ada kerugian langsung, hanya waktu terpakai.",
        betterAction: "Cukup periksa di aplikasi resmi.",
        rationale: "Notifikasi rutin tidak memerlukan verifikasi tambahan.",
      },
    ],
    article: "penipuan-paket-kurir",
  },


  {
    id: "undangan-apk",
    category: "Tautan dan akun",
    title: "Undangan digital yang meminta pasang aplikasi",
    setup: "Pesan WhatsApp masuk dari nomor tak dikenal berisi undangan pernikahan.",
    message:
      "Undangan pernikahan kami kak, mohon dibuka ya. Ada file undangan dan foto acaranya. Kalau tidak bisa dibuka, install dulu aplikasinya di link dalam file itu.",
    options: [
      {
        id: "install-apk",
        label: "Pasang aplikasinya supaya bisa membuka undangan",
        points: 0,
        feedback: "Undangan tidak pernah memerlukan pemasangan aplikasi tambahan.",
        risk: "Aplikasi dari sumber tidak resmi bisa membaca pesan, kode OTP, dan data perbankan Anda.",
        betterAction: "Jangan pasang apa pun. Hapus pesannya.",
        rationale: "Berkas undangan tidak memerlukan izin akses ke pesan atau perbankan.",
      },
      {
        id: "open-file",
        label: "Buka file undangannya saja tanpa memasang aplikasi",
        points: 50,
        feedback: "Anda menolak memasang aplikasi, tetapi berkas dari pengirim asing tetap berisiko.",
        risk: "Dokumen berbahaya bisa mengeksploitasi pembaca berkas yang belum diperbarui.",
        betterAction: "Hapus tanpa membuka, dan konfirmasi ke pengirim lewat kanal lain bila Anda mengenalnya.",
        rationale: "Undangan dari orang tak dikenal tidak cukup penting untuk diambil risikonya.",
      },
      {
        id: "delete",
        label: "Hapus pesan tanpa membuka apa pun",
        points: 100,
        feedback: "Tepat. Anda menolak dua jalur masuk sekaligus.",
        risk: "",
        betterAction: "Blokir nomor pengirim dan beri tahu orang terdekat bila perlu.",
        rationale: "Tidak ada undangan sah yang mensyaratkan pemasangan aplikasi dari luar toko resmi.",
      },
    ],
    article: "setelah-klik-tautan",
  },
  {
    id: "pinjol-ilegal",
    category: "Kerja dan uang",
    title: "Pinjaman cepat tanpa syarat",
    setup: "SMS menawarkan pinjaman yang cair dalam hitungan menit.",
    message:
      "Butuh dana cepat? Cair 5 juta tanpa BI checking, tanpa jaminan. Cukup foto KTP dan akses kontak. Bunga ringan, cair hari ini juga.",
    options: [
      {
        id: "accept",
        label: "Ajukan karena butuh dana hari ini",
        points: 0,
        feedback: "Permintaan akses kontak adalah tanda pinjaman tidak resmi.",
        risk: "Data kontak dan KTP Anda bisa dipakai menagih dengan cara yang merugikan orang lain.",
        betterAction: "Tolak. Cek penyedia pinjaman di daftar resmi OJK lebih dulu.",
        rationale: "Penyelenggara resmi tidak meminta akses ke seluruh kontak Anda.",
      },
      {
        id: "ask-rate",
        label: "Tanya bunga dan biaya dulu sebelum memutuskan",
        points: 50,
        feedback: "Anda berhati-hati soal biaya, tetapi belum memeriksa izin penyedianya.",
        risk: "Bunga yang disebut di awal bisa berbeda dari yang diterapkan kemudian.",
        betterAction: "Cek izin penyedia di situs OJK sebelum memberi data apa pun.",
        rationale: "Legalitas menentukan apakah biaya yang disepakati bisa dituntut.",
      },
      {
        id: "verify-ojk",
        label: "Cek izin penyedia di OJK, lalu putuskan",
        points: 100,
        feedback: "Tepat. Anda memeriksa status legal sebelum menyerahkan data.",
        risk: "",
        betterAction: "Gunakan hanya penyelenggara yang terdaftar resmi.",
        rationale: "Pinjaman tanpa izin tidak memiliki jalur pengaduan yang jelas bila terjadi masalah.",
      },
    ],
    article: "investasi-palsu",
  },
];






export type SessionMode = "quick" | "standard" | "full";

export interface SessionModeInfo {
  id: SessionMode;
  label: string;
  count: number;
  description: string;
}

export const SESSION_MODES: SessionModeInfo[] = [
  {
    id: "quick",
    label: "Latihan cepat",
    count: 5,
    description: "Lima soal campuran untuk mencoba alurnya.",
  },
  {
    id: "standard",
    label: "Latihan standar",
    count: 10,
    description: "Sepuluh soal dengan topik yang lebih beragam.",
  },
  {
    id: "full",
    label: "Latihan lengkap",
    count: SCENARIOS.length,
    description: `Seluruh ${SCENARIOS.length} soal dari bank latihan.`,
  },
];

/**
 * Pengacak deterministik (mulberry32). Dipakai agar urutan soal bisa
 * direproduksi pada pengujian, bukan untuk keamanan kriptografis.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pilih soal tanpa duplikasi, dengan urutan yang diacak. */
export function pickSessionScenarios(
  count: number,
  random: () => number = Math.random,
): TrainingScenario[] {
  const pool = [...SCENARIOS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export interface AnswerRecord {
  scenario: TrainingScenario;
  option: ScenarioOption;
}

export interface CategoryScore {
  category: ArticleCategory;
  earned: number;
  max: number;
}

export interface SessionScore {
  earned: number;
  max: number;
  percentage: number;
  bestCount: number;
  total: number;
  categories: CategoryScore[];
  /** Soal yang belum memperoleh poin penuh. */
  needsReview: AnswerRecord[];
}

export function scoreSession(answers: AnswerRecord[]): SessionScore {
  const earned = answers.reduce((sum, a) => sum + a.option.points, 0);
  const max = answers.length * 100;
  const bestCount = answers.filter((a) => a.option.points === 100).length;

  const byCategory = new Map<ArticleCategory, CategoryScore>();
  for (const answer of answers) {
    const current = byCategory.get(answer.scenario.category) ?? {
      category: answer.scenario.category,
      earned: 0,
      max: 0,
    };
    current.earned += answer.option.points;
    current.max += 100;
    byCategory.set(answer.scenario.category, current);
  }

  return {
    earned,
    max,
    percentage: max === 0 ? 0 : Math.round((earned / max) * 100),
    bestCount,
    total: answers.length,
    categories: [...byCategory.values()].sort((a, b) =>
      a.category.localeCompare(b.category),
    ),
    needsReview: answers.filter((a) => a.option.points < 100),
  };
}



