export interface ResourceSection {
  heading: string;
  body: string;
  /** Poin tambahan yang ditampilkan sebagai daftar di bawah paragraf. */
  bullets?: string[];
  /** Sorotan penting; dipakai hemat. */
  callout?: string;
}

export interface ResourceLink {
  label: string;
  url: string;
  note?: string;
}

export interface ResourceArticle {
  /** Slug sekaligus id. Dipakai di /pustaka/[slug]. */
  id: string;
  title: string;
  /** Ringkasan untuk kartu dan dek artikel. */
  summary: string;
  category: ArticleCategory;
  tags: string[];
  sections: ResourceSection[];
  checklist?: string[];
  sources?: ResourceLink[];
  related?: string[];
}

export type ArticleCategory =
  | "Rekayasa sosial"
  | "Kredensial"
  | "Kerja dan uang"
  | "Tautan dan akun"
  | "Setelah kejadian";

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  "Rekayasa sosial",
  "Kredensial",
  "Kerja dan uang",
  "Tautan dan akun",
  "Setelah kejadian",
];

function articleText(article: ResourceArticle): string {
  return [
    article.summary,
    ...article.sections.flatMap((section) => [
      section.heading,
      section.body,
      ...(section.bullets ?? []),
      section.callout ?? "",
    ]),
    ...(article.checklist ?? []),
  ].join(" ");
}

export function articleWordCount(article: ResourceArticle): number {
  return articleText(article).split(/\s+/).filter(Boolean).length;
}

/** Estimasi waktu baca dari jumlah kata nyata, 200 kata per menit. */
export function readingMinutes(article: ResourceArticle): number {
  return Math.max(1, Math.round(articleWordCount(article) / 200));
}

export const SOURCE_OJK: ResourceLink = {
  label: "OJK: Otoritas Jasa Keuangan",
  url: "https://www.ojk.go.id/",
  note: "Cek legalitas entitas dan produk keuangan.",
};

export const SOURCE_IASC: ResourceLink = {
  label: "Indonesia Anti-Scam Centre",
  url: "https://iasc.ojk.go.id/",
  note: "Pelaporan penipuan transaksi keuangan.",
};

export const SOURCE_KONTAK157: ResourceLink = {
  label: "Kontak 157 OJK",
  url: "https://kontak157.ojk.go.id/appkpublicportal/Pengaduan",
  note: "Pengaduan konsumen sektor jasa keuangan.",
};

export const SOURCE_ADUANNOMOR: ResourceLink = {
  label: "AduanNomor (Komdigi)",
  url: "https://aduannomor.id/",
  note: "Pemeriksaan nomor yang pernah dilaporkan.",
};

export const LIBRARY: ResourceArticle[] = [
  {
    id: "nomor-baru-minta-uang",
    title: "Nomor baru, minta pinjaman: modus yang paling sering berhasil",
    summary:
      "Penipu memakai nomor baru dan mengaku sebagai teman yang kehilangan HP. Yang membuatnya berhasil bukan teknologi, tapi rasa tidak enak menolak.",
    category: "Rekayasa sosial",
    tags: ["nomor baru", "pinjaman", "whatsapp", "penyamaran"],
    sections: [
      {
        heading: "Kenapa modus ini bekerja",
        body: "Pelaku tidak perlu meretas apa pun. Ia hanya perlu membuat nomor baru, lalu mengirim pesan yang menyebut nama Anda dan nama panggilan akrab. Karena HP lama disebut hilang, Anda tidak punya pembanding. Karena nominalnya kecil dan alasannya masuk akal, banyak orang memilih transfer daripada terkesan tidak percaya pada teman.",
      },
      {
        heading: "Contoh pesan yang beredar",
        body: "Polanya biasanya pendek dan tidak rapi, karena ditulis cepat seperti chat biasa. Contohnya: “Ra ini aku, nomor baru ya. HP lama ilang. Bisa pinjem 500 dulu gak? Buat bayar kos hari ini. Sore aku balikin.” Tidak ada tautan, tidak ada logo, tidak ada permintaan OTP. Itu sebabnya pesan seperti ini jarang terasa mencurigakan.",
      },
      {
        heading: "Sinyal yang patut diperiksa",
        body: "Satu sinyal saja tidak cukup untuk menyimpulkan apa pun. Yang layak diperiksa adalah kombinasinya.",
        bullets: [
          "Nomor baru yang belum pernah Anda simpan.",
          "Alasan nomor lama tidak bisa dihubungi, tepat saat Anda ingin memverifikasi.",
          "Permintaan uang muncul di pesan pertama atau kedua.",
          "Ada tenggat waktu: hari ini, sore ini, harus segera.",
          "Janji mengembalikan dalam waktu dekat.",
        ],
      },
      {
        heading: "Kasus yang mirip tapi sah",
        body: "Orang benar-benar kehilangan HP dan benar-benar butuh bantuan. Teman asli Anda juga bisa memakai nomor baru. Karena itu kesimpulannya bukan “penipu”, melainkan “belum terverifikasi”. Perbedaan ini menentukan cara Anda menolak: menolak mentransfer ke nomor yang belum dipastikan, bukan menuduh orangnya.",
      },
      {
        heading: "Cara memverifikasi tanpa terkesan menuduh",
        body: "Hubungi nomor lama yang masih tersimpan. Kalau tidak aktif, telepon nomor baru itu langsung. Pelaku biasanya menghindari panggilan suara. Jika tidak diangkat, minta panggilan video. Alternatif lain: tanyakan hal yang hanya diketahui orang itu, misalnya nama wali kelas atau kejadian kecil yang kalian alami bersama.",
        callout:
          "Pesan teks bisa dipalsukan siapa saja. Suara lebih sulit dipalsukan, panggilan video paling sulit.",
      },
      {
        heading: "Kalau sudah terlanjur transfer",
        body: "Hubungi bank atau penyedia e-wallet melalui kanal resmi dan laporkan transaksi secepat mungkin. Simpan bukti transfer, nomor rekening tujuan, dan tangkapan layar percakapan. Pelaporan tidak menjamin dana kembali, tetapi memperbesar peluang penanganan dan membantu pelaporan nomor pelaku.",
      },
    ],
    checklist: [
      "Jangan transfer sebelum identitas terkonfirmasi lewat panggilan suara atau video",
      "Hubungi nomor lama yang tersimpan, bukan nomor dari pesan",
      "Waspadai alasan yang membuat Anda tidak bisa menelepon",
      "Simpan bukti jika sudah terlanjur mengirim uang",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157, SOURCE_ADUANNOMOR],
    related: ["verifikasi-identitas", "setelah-transfer"],
  },
  {
    id: "verifikasi-identitas",
    title: "Memverifikasi identitas tanpa harus bersikap curiga",
    summary:
      "Verifikasi bukan tanda tidak percaya. Ini kebiasaan kecil yang membuat penipuan gagal tanpa merusak hubungan.",
    category: "Rekayasa sosial",
    tags: ["verifikasi", "identitas", "kanal terpisah"],
    sections: [
      {
        heading: "Prinsip satu kalimat",
        body: "Verifikasi selalu lewat kanal yang Anda cari sendiri, bukan kanal yang diberikan pengirim. Kalau seseorang mengirim nomor lalu meminta Anda menelepon nomor itu, Anda belum memverifikasi apa pun. Anda hanya memakai jalur yang disiapkan pelaku.",
      },
      {
        heading: "Tiga kanal yang bisa dipakai",
        body: "Pilih yang paling cepat tersedia dan paling sulit dipalsukan.",
        bullets: [
          "Nomor lama yang sudah tersimpan, dari sebelum percakapan ini terjadi.",
          "Panggilan suara atau video ke nomor tersebut, bukan pesan teks.",
          "Orang ketiga yang mengenal keduanya, misalnya teman bersama atau anggota keluarga.",
        ],
      },
      {
        heading: "Pertanyaan yang hanya diketahui orang aslinya",
        body: "Hindari pertanyaan yang jawabannya ada di media sosial. Pilih hal kecil dan spesifik: siapa yang duduk di sebelah Anda saat ujian, nama kucing di rumahnya, apa yang kalian pesan terakhir kali makan bersama. Pelaku bisa membaca profil, tetapi tidak bisa membaca ingatan.",
      },
      {
        heading: "Untuk institusi, jangan pakai nomor dari pesan",
        body: "Bank, marketplace, dan lembaga pemerintah tidak meminta Anda menghubungi nomor pribadi. Buka aplikasi resminya, atau ketik alamat situs resmi secara manual. Nomor layanan resmi biasanya tercetak di belakang kartu ATM atau di halaman kontak situs resmi.",
      },
      {
        heading: "Verifikasi tidak harus terasa canggung",
        body: "Banyak orang menunda verifikasi karena takut dianggap tidak percaya. Cara menghindarinya adalah menjadikannya kebiasaan, bukan tuduhan. Kalimat seperti “aku telepon bentar ya, biar jelas” terdengar wajar dalam percakapan sehari-hari, dan orang yang memang asli tidak akan keberatan. Yang justru menolak diverifikasi biasanya punya alasan untuk menghindar.",
        bullets: [
          "Sebutkan alasannya singkat, tanpa berpanjang lebar.",
          "Lakukan lewat panggilan, bukan pesan, agar cepat selesai.",
          "Jangan minta dokumen identitas hanya untuk membuktikan hal sepele.",
        ],
      },
      {
        heading: "Kalau verifikasi gagal",
        body: "Bukan berarti pasti penipuan. Bisa jadi orangnya sedang sibuk, HP-nya benar-benar rusak, atau sinyal buruk. Yang berubah hanyalah kesimpulan Anda: identitas belum terkonfirmasi. Selama statusnya begitu, jangan kirim uang, jangan kirim kode, dan jangan kirim dokumen.",
        callout:
          "Verifikasi yang gagal bukan bukti kejahatan. Verifikasi yang gagal hanya berarti Anda belum punya cukup alasan untuk bertindak.",
      },
      {
        heading: "Waktu yang dibutuhkan",
        body: "Satu panggilan biasanya cukup, kurang dari dua menit. Bandingkan dengan waktu untuk mengurus laporan dan mengganti kata sandi setelah akun diambil alih. Verifikasi hampir selalu lebih murah, dan bisa diulang kapan saja tanpa biaya.",
      },
    ],
    checklist: [
      "Gunakan nomor atau akun yang Anda cari sendiri",
      "Pilih panggilan suara atau video, bukan pesan teks",
      "Ajukan pertanyaan yang tidak bisa dicari di internet",
      "Tunda semua tindakan selama identitas belum pasti",
    ],
    sources: [SOURCE_ADUANNOMOR],
    related: ["nomor-baru-minta-uang", "otp-dan-pengambilalihan-akun"],
  },
  {
    id: "otp-dan-pengambilalihan-akun",
    title: "OTP, PIN, dan kata sandi: kunci yang tidak boleh dipinjamkan",
    summary:
      "Satu kode enam angka bisa membuka seluruh akun. Pahami mengapa pihak resmi tidak pernah memintanya, dan apa yang terjadi setelahnya.",
    category: "Kredensial",
    tags: ["otp", "pin", "kata sandi", "pengambilalihan akun"],
    sections: [
      {
        heading: "Apa fungsi OTP sebenarnya",
        body: "Kode OTP dibuat untuk membuktikan bahwa yang sedang login adalah Anda, karena hanya Anda yang memegang perangkat atau nomor tujuan. Begitu kode itu Anda berikan ke orang lain, pembuktiannya runtuh. Sistem menganggap orang itu sebagai Anda, dan server tidak punya cara membedakannya.",
      },
      {
        heading: "Kalimat yang biasa dipakai pelaku",
        body: "Permintaan OTP jarang disampaikan langsung. Biasanya dibungkus sebagai prosedur.",
        bullets: [
          "“Ada percobaan login, kami perlu verifikasi. Sebutkan kode yang masuk ya kak.”",
          "“Sistem kami sedang migrasi, kirim kode 6 angka supaya akun tidak terkunci.”",
          "“Saya sudah kirim kode ke nomor Anda, balas kodenya untuk konfirmasi.”",
        ],
      },
      {
        heading: "Yang membuatnya meyakinkan",
        body: "Nomor pengirim bisa dipalsukan sehingga tampak seperti nomor resmi, dan nama pengirim di aplikasi pesan juga bisa diubah. Pelaku kadang sudah tahu nama, nomor rekening, atau transaksi terakhir Anda dari kebocoran data, sehingga percakapan terasa sangat spesifik. Kedekatan informasi bukan bukti identitas.",
      },
      {
        heading: "Kasus sah yang mirip",
        body: "Beberapa layanan memang meminta kode saat Anda menghubungi mereka. Perbedaannya: Anda yang memulai, Anda memakai nomor resmi yang Anda cari sendiri, dan petugas tidak meminta kode dikirim lewat chat. Jika kode diminta lewat pesan, atau panggilan datang tanpa Anda minta, itu bukan prosedur verifikasi yang wajar.",
        callout:
          "Aturan sederhana: kode hanya Anda yang boleh mengetik, dan hanya di aplikasi atau situs yang Anda buka sendiri.",
      },
      {
        heading: "Tanda akun sudah diambil alih",
        body: "Anda tiba-tiba keluar dari akun. Kata sandi tidak dikenali. Muncul notifikasi login dari perangkat atau lokasi asing. Kontak menerima pesan aneh dari akun Anda. Email pemulihan berubah tanpa Anda lakukan. Pada akun keuangan, mungkin ada metode pembayaran baru atau transaksi kecil yang tidak Anda kenali sebagai uji coba.",
        bullets: [
          "Notifikasi login dari perangkat yang bukan milik Anda.",
          "Email atau nomor pemulihan berubah tanpa persetujuan Anda.",
          "Pesan terkirim berisi permintaan uang kepada kontak Anda.",
          "Kata sandi lama tidak lagi berlaku.",
        ],
      },
      {
        heading: "Yang harus dilakukan lebih dulu",
        body: "Gunakan fitur pemulihan resmi aplikasi untuk masuk kembali. Setelah berhasil, ganti kata sandi, cabut sesi di semua perangkat lain, dan periksa apakah email pemulihan atau nomor telepon diganti. Amankan email utama lebih dulu, karena email adalah pintu pemulihan untuk akun lain. Jika email pemulihan sudah diubah pelaku, proses pemulihan biasanya memerlukan verifikasi identitas tambahan melalui dukungan resmi.",
      },
      {
        heading: "Kebiasaan yang mencegah pengulangan",
        body: "Setelah akun aman, perbaiki hal-hal yang membuat insiden ini mungkin terjadi. Gunakan kata sandi berbeda untuk setiap akun penting, terutama email. Aktifkan verifikasi dua langkah dengan aplikasi autentikator bila tersedia, karena kode yang dikirim lewat SMS lebih mudah disadap. Periksa daftar perangkat yang masih login setiap beberapa bulan, dan cabut yang tidak Anda kenali.",
        callout:
          "Verifikasi dua langkah tetap berguna meski kata sandi Anda bocor. Kode OTP di aplikasi autentikator tidak bisa dipakai orang lain tanpa perangkat Anda.",
      },
    ],
    checklist: [
      "Jangan pernah membagikan OTP, PIN, atau kode pemulihan",
      "Aktifkan verifikasi dua langkah di akun penting",
      "Pakai kata sandi berbeda untuk email, bank, dan media sosial",
      "Periksa perangkat yang masih login secara berkala",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157],
    related: ["setelah-kredensial-bocor", "verifikasi-identitas"],
  },
  {
    id: "lowongan-kerja-palsu",
    title: "Lowongan kerja yang meminta biaya di muka",
    summary:
      "Rekrutmen asli tidak menarik biaya dari pelamar. Kenali bentuk biayanya, karena namanya sering diganti agar terdengar wajar.",
    category: "Kerja dan uang",
    tags: ["lowongan", "rekrutmen", "biaya", "administrasi"],
    sections: [
      {
        heading: "Arah uang yang benar",
        body: "Pada rekrutmen yang sah, uang mengalir dari perusahaan ke kandidat dalam bentuk gaji. Perusahaan tidak memungut biaya dari pelamar. Karena itu setiap permintaan transfer dari pihak perekrut, apa pun namanya, adalah alasan untuk berhenti dan memeriksa.",
      },
      {
        heading: "Nama-nama yang dipakai",
        body: "Biaya jarang disebut apa adanya. Biasanya dibungkus sebagai prosedur.",
        bullets: [
          "Biaya administrasi atau pendaftaran.",
          "Biaya seragam, ID card, atau perlengkapan kerja.",
          "Biaya pelatihan wajib sebelum penempatan.",
          "Biaya verifikasi rekening untuk penggajian.",
        ],
      },
      {
        heading: "Ciri lain yang menyertai",
        body: "Proses seleksi terasa terlalu cepat: melamar pagi, diterima sore. Wawancara lewat chat, bukan panggilan atau pertemuan. Gaji ditawarkan jauh di atas pasar untuk posisi tanpa keahlian khusus. Kontak memakai email gratis, bukan domain perusahaan. Penawaran datang tanpa Anda pernah melamar.",
      },
      {
        heading: "Cara memeriksa dengan benar",
        body: "Cari nama perusahaan di situs resminya, lalu buka halaman karier. Jika lowongan tidak ada di sana, tanyakan lewat kontak resmi yang Anda temukan sendiri. Periksa apakah domain email perekrut cocok dengan domain perusahaan. Untuk entitas yang mengaku lembaga keuangan, cek daftar legalitas di OJK.",
        callout:
          "Perusahaan asli bisa menjelaskan alamat kantor, nama perekrut, dan posisi yang dibuka tanpa meminta uang lebih dulu.",
      },
      {
        heading: "Jangan kirim dokumen dulu",
        body: "KTP, NPWP, nomor rekening, dan foto selfie dengan KTP adalah bahan untuk membuka rekening atau pinjaman atas nama Anda. Kirim hanya setelah perusahaan terbukti ada dan prosesnya jelas. Waspadai juga permintaan mengisi formulir di tautan pendek, karena bisa jadi halaman pengumpul data.",
      },
      {
        heading: "Jika sudah membayar",
        body: "Hubungi penyedia pembayaran atau bank melalui kanal resmi dan laporkan transaksi. Simpan percakapan, bukti transfer, nama penerima, dan nomor rekening tujuan. Laporkan juga lowongan tersebut ke platform tempat Anda menemukannya agar tidak menimpa pelamar lain.",
      },
      {
        heading: "Mengapa biayanya selalu diberi nama yang wajar",
        body: "Biaya administrasi, seragam, atau pelatihan terdengar seperti prosedur perusahaan pada umumnya. Pelaku meminjam istilah yang sudah familiar agar Anda tidak mempertanyakannya. Yang perlu diingat bukan nama biayanya, melainkan arah uangnya: pada rekrutmen sah, tidak ada uang yang mengalir dari pelamar ke perusahaan.",
      },
      {
        heading: "Dokumen mana yang wajar diminta",
        body: "Pada tahap awal, perusahaan hanya perlu CV dan portofolio. KTP dan NPWP biasanya diminta setelah Anda menerima penawaran kerja resmi, dan itu pun melalui sistem yang jelas. Foto selfie dengan KTP jarang diperlukan untuk melamar, dan justru sering dipakai membuka rekening atau pinjaman atas nama orang lain.",
        callout:
          "Jika dokumen sensitif diminta sebelum ada penawaran resmi, itu bukan proses rekrutmen yang wajar.",
      },
    ],
    checklist: [
      "Tidak ada biaya apa pun dari pelamar",
      "Email perekrut memakai domain resmi perusahaan",
      "Lowongan terdaftar di halaman karier resmi",
      "Jangan kirim KTP atau nomor rekening sebelum perusahaan terverifikasi",
    ],
    sources: [SOURCE_OJK, SOURCE_IASC, SOURCE_KONTAK157],
    related: ["tugas-online-dan-komisi", "setelah-transfer"],
  },
  {
    id: "tugas-online-dan-komisi",
    title: "Tugas online, rating, dan komisi yang harus ditebus",
    summary:
      "Modus ini membayar Anda di awal supaya percaya, lalu menahan uang Anda di langkah berikutnya. Pola angkanya sengaja dibuat.",
    category: "Kerja dan uang",
    tags: ["tugas online", "komisi", "deposit", "penipuan"],
    sections: [
      {
        heading: "Bagaimana urutannya",
        body: "Anda dihubungi lewat WhatsApp atau Telegram dan ditawari pekerjaan ringan: memberi rating produk, menyukai video, atau memesan tiket untuk menaikkan peringkat. Tugas pertama dibayar, biasanya Rp15.000 sampai Rp50.000, dan benar-benar masuk. Setelah Anda percaya, muncul tugas bernilai lebih besar yang mensyaratkan setoran.",
      },
      {
        heading: "Kenapa setoran terasa masuk akal",
        body: "Setoran disebut deposit jaminan, saldo tugas, atau biaya sistem. Pelaku menunjukkan tangkapan layar saldo Anda yang bertambah di sebuah aplikasi, sehingga terasa seperti uang nyata. Saat Anda ingin menariknya, muncul syarat baru: menyelesaikan paket berikutnya, membayar pajak, atau mencapai target tertentu.",
        bullets: [
          "Keuntungan awal dibayar untuk membangun kepercayaan.",
          "Angka saldo hanya tampilan, bukan dana yang benar-benar ada.",
          "Setiap penarikan memunculkan syarat baru yang tidak pernah selesai.",
        ],
      },
      {
        heading: "Sinyal yang menentukan",
        body: "Pekerjaan yang sah tidak meminta pekerja membayar lebih dulu. Tidak ada pekerjaan legal yang mensyaratkan Anda menyetor uang untuk bisa bekerja. Jika kata deposit, saldo tugas, atau upgrade level muncul, itu sudah cukup untuk berhenti tanpa perlu menyelidiki lebih jauh.",
        callout:
          "Pekerjaan yang meminta modal dari pekerja bukan pekerjaan. Itu investasi yang menyamar sebagai pekerjaan.",
      },
      {
        heading: "Kasus yang mirip tapi sah",
        body: "Beberapa program afiliasi atau platform riset memang membayar untuk tugas kecil. Perbedaannya: tidak ada setoran, pembayaran lewat platform resmi yang dikenal, syaratnya tertulis di halaman resmi, dan Anda tidak diminta mentransfer ke rekening pribadi.",
      },
      {
        heading: "Kalau sudah menyetor",
        body: "Hentikan semua pembayaran berikutnya, termasuk yang disebut biaya penarikan atau pajak. Pelaku akan terus meminta selama Anda masih membayar. Simpan bukti transfer dan percakapan, lalu laporkan ke bank atau penyedia e-wallet dan kanal pelaporan resmi.",
      },
      {
        heading: "Mengapa pembayaran awal benar-benar masuk",
        body: "Itu bagian dari biaya operasional pelaku. Membayar Rp25.000 untuk mendapatkan kepercayaan bernilai jauh lebih besar daripada itu. Uang awal bukan tanda kejujuran, melainkan investasi agar Anda mau menyetor lebih besar di langkah berikutnya.",
      },
      {
        heading: "Cara mengenali polanya lebih cepat",
        body: "Perhatikan urutannya, bukan besarannya. Jika sebuah tawaran pekerjaan bergerak dari tugas gratis ke tugas berbayar, itu sudah cukup. Semakin cepat Anda mengenali perubahan arah uang, semakin kecil kerugiannya.",
        callout:
          "Selama uang mengalir dari Anda ke mereka, itu bukan pekerjaan. Pekerjaan selalu membayar Anda.",
      },
    ],
    checklist: [
      "Tidak ada setoran, deposit, atau modal dari pekerja",
      "Pembayaran tidak lewat rekening pribadi",
      "Saldo di aplikasi bukan bukti dana nyata",
      "Hentikan pembayaran begitu syarat baru muncul",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157, SOURCE_OJK],
    related: ["lowongan-kerja-palsu", "investasi-palsu"],
  },
  {
    id: "phishing-domain-mirip",
    title: "Phishing dan domain yang menyerupai situs resmi",
    summary:
      "Halaman tiruan tidak perlu sempurna. Ia hanya perlu cukup mirip agar Anda mengetik kata sandi tanpa berpikir dua kali.",
    category: "Tautan dan akun",
    tags: ["phishing", "domain", "tautan", "login"],
    sections: [
      {
        heading: "Yang sebenarnya ditiru",
        body: "Pelaku menyalin tampilan halaman login resmi, termasuk logo dan warna. Yang berbeda hanya alamatnya. Karena itu memeriksa tampilan tidak berguna. Yang menentukan adalah alamat situs yang ada di bilah peramban.",
      },
      {
        heading: "Cara membaca alamat dengan benar",
        body: "Baca dari kanan sebelum garis miring pertama, bukan dari kiri. Pada alamat bca-verifikasi.akun-aman.net, domain sebenarnya adalah akun-aman.net, bukan bca. Bagian bca-verifikasi hanyalah subdomain yang bisa dibuat siapa saja.",
        bullets: [
          "Domain resmi berada tepat sebelum akhiran seperti .com, .id, atau .co.id.",
          "Tanda hubung dan angka sering dipakai untuk menyerupai merek.",
          "Alamat IP langsung atau tautan pendek menyembunyikan tujuan sebenarnya.",
        ],
      },
      {
        heading: "Kasus sah yang mirip",
        body: "Banyak perusahaan memakai subdomain, dan itu normal. Yang perlu diperiksa adalah domain utamanya. Situs dengan ejaan tidak lazim juga belum tentu jahat, karena bisa jadi usaha kecil dengan nama unik. Satu indikator saja tidak cukup untuk menyimpulkan.",
        callout:
          "Jangan pernah mengetik kata sandi pada halaman yang Anda buka dari tautan pesan. Ketik alamat resminya sendiri.",
      },
      {
        heading: "Kalau sudah mengetik kata sandi",
        body: "Segera buka aplikasi atau situs resmi, ganti kata sandi, lalu cabut sesi di perangkat lain. Periksa apakah email pemulihan berubah. Jika akun yang sama dipakai di layanan lain, ganti juga di sana, terutama email utama.",
      },
      {
        heading: "Mengapa tampilan tidak bisa dipercaya",
        body: "Seluruh isi halaman tiruan adalah berkas yang diunduh dari server pelaku. Logo, warna, dan tata letaknya bisa disalin persis dalam hitungan menit. Karena itu tidak ada satu pun elemen visual yang bisa dijadikan bukti. Yang tidak bisa disalin adalah alamat domain, karena itulah satu-satunya bagian yang harus mereka daftarkan sendiri.",
      },
      {
        heading: "Kebiasaan yang lebih efektif daripada menghafal ciri",
        body: "Alih-alih mencoba mengenali setiap modus baru, biasakan membuka layanan penting lewat penanda buku atau aplikasi resmi. Dengan begitu, tautan dari pesan tidak pernah menjadi jalan masuk Anda. Kebiasaan ini bekerja untuk semua jenis phishing, termasuk yang belum pernah Anda lihat. Anda juga tidak perlu menghafal daftar domain palsu, karena yang Anda ubah adalah jalur masuknya.",
        callout:
          "Jika Anda tidak pernah membuka akun dari tautan pesan, hampir seluruh halaman tiruan kehilangan sasarannya.",
      },
    ],
    checklist: [
      "Periksa domain dari kanan, sebelum garis miring pertama",
      "Jangan login lewat tautan dari pesan",
      "Ketik alamat resmi secara manual",
      "Ganti kata sandi bila sudah terlanjur mengisi",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157],
    related: ["setelah-klik-tautan", "otp-dan-pengambilalihan-akun"],
  },
  {
    id: "penipuan-paket-kurir",
    title: "Pesan paket gagal dikirim dan biaya yang diminta",
    summary:
      "Berawal dari notifikasi pengiriman yang wajar, lalu berujung pada permintaan data kartu atau biaya kecil. Nilai kecilnya justru yang membuat orang lengah.",
    category: "Tautan dan akun",
    tags: ["kurir", "paket", "phishing", "data kartu"],
    sections: [
      {
        heading: "Alur yang biasa dipakai",
        body: "Anda menerima pesan bahwa paket gagal dikirim karena alamat tidak lengkap. Ada tautan untuk mengonfirmasi alamat. Halaman yang terbuka meminta nama, alamat, nomor telepon, lalu berpindah ke permintaan data kartu untuk biaya pengiriman ulang sebesar beberapa ribu rupiah.",
      },
      {
        heading: "Kenapa biaya kecil berbahaya",
        body: "Nominal kecil terasa tidak sepadan untuk dicurigai, dan itulah tujuannya. Yang diambil bukan biaya pengiriman, melainkan data kartu. Dengan nomor kartu, masa berlaku, dan kode CVV, pelaku bisa melakukan transaksi lain atau menjual datanya.",
        bullets: [
          "Permintaan data kartu lengkap termasuk CVV adalah tanda paling jelas.",
          "Kode OTP yang muncul saat mengisi formulir bukan untuk verifikasi pengiriman.",
          "Biaya pengiriman resmi biasanya dibayar ke kurir atau lewat aplikasi, bukan halaman web acak.",
        ],
      },
      {
        heading: "Kasus yang mirip tapi sah",
        body: "Kurir asli memang kadang mengirim pesan berisi tautan pelacakan. Bedanya, tautan itu mengarah ke domain resmi kurir, tidak meminta data kartu, dan nomor resi bisa Anda cocokkan dengan pesanan di aplikasi belanja Anda.",
        callout:
          "Jika Anda tidak sedang menunggu paket, pesan apa pun tentang paket hampir pasti tidak relevan untuk Anda.",
      },
      {
        heading: "Kalau sudah mengisi data kartu",
        body: "Hubungi bank penerbit kartu melalui nomor di belakang kartu dan minta kartu diblokir. Periksa transaksi yang tidak Anda kenali. Jika kartu tersimpan di layanan lain, hapus dan minta kartu pengganti.",
      },
      {
        heading: "Mengapa pesan ini sulit dikenali",
        body: "Pesan kurir palsu meniru hal yang memang rutin terjadi: paket tertahan, alamat kurang lengkap, biaya kirim ulang. Karena penerima sering punya pesanan berjalan, premisnya terasa wajar. Pelaku juga sengaja memakai nominal kecil agar Anda tidak berpikir panjang.",
      },
      {
        heading: "Cara memastikan tanpa membuka tautan",
        body: "Buka aplikasi belanja tempat Anda memesan, lalu periksa status pengiriman di sana. Jika ada masalah alamat, informasi itu akan muncul di aplikasi. Nomor resi juga bisa dicocokkan dengan yang tertera pada pesanan Anda. Dengan begitu Anda tidak perlu menyentuh tautan sama sekali, dan tidak memberi pelaku kesempatan memuat halaman apa pun di perangkat Anda.",
        callout:
          "Status pengiriman yang sah selalu bisa dilihat dari aplikasi tempat Anda membeli, tanpa perlu tautan dari pesan.",
      },
    ],
    checklist: [
      "Cocokkan nomor resi dengan pesanan Anda sendiri",
      "Jangan memasukkan data kartu untuk biaya pengiriman",
      "Periksa domain tautan pelacakan",
      "Blokir kartu bila data sudah diisi",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157],
    related: ["phishing-domain-mirip", "setelah-klik-tautan"],
  },
  {
    id: "transaksi-luar-aplikasi",
    title: "Marketplace yang meminta bayar di luar aplikasi",
    summary:
      "Transaksi di luar sistem menghilangkan seluruh perlindungan yang seharusnya Anda bayar lewat biaya layanan aplikasi.",
    category: "Kerja dan uang",
    tags: ["marketplace", "rekening pribadi", "escrow"],
    sections: [
      {
        heading: "Kalimat yang dipakai penjual",
        body: "Alasannya selalu terdengar masuk akal: menghindari biaya admin, stok tinggal satu, atau sistem sedang error. Penjual meminta Anda transfer ke rekening pribadi, lalu berjanji mengirim barang setelah dana masuk.",
        bullets: [
          "“Bayar langsung ke rekening saya biar lebih murah, nanti saya kirim.”",
          "“Jangan lewat aplikasi ya, nanti dipotong admin.”",
          "“Sudah banyak yang transfer langsung, aman kok.”",
        ],
      },
      {
        heading: "Apa yang hilang",
        body: "Sistem marketplace menahan dana sampai barang diterima. Begitu Anda transfer langsung, tidak ada pihak yang menahan dana, tidak ada bukti transaksi yang diakui platform, dan tidak ada dasar untuk pengembalian. Anda juga kehilangan perlindungan pembeli yang biasanya berlaku.",
        callout:
          "Selama transaksi masih di dalam aplikasi, dana Anda ditahan sistem. Di luar aplikasi, dana itu sepenuhnya ada di tangan orang asing.",
      },
      {
        heading: "Kasus yang mirip tapi sah",
        body: "Beberapa penjual memang menawarkan transaksi langsung untuk pembeli langganan atau COD. Perbedaannya: barang diserahkan bersamaan dengan pembayaran, dan tidak ada permintaan transfer di muka sebelum barang diterima. COD adalah transaksi langsung yang aman karena tidak ada uang yang berpindah lebih dulu.",
      },
      {
        heading: "Kalau sudah transfer",
        body: "Laporkan ke platform marketplace meski transaksi terjadi di luar aplikasi, karena akun penjual bisa ditindak. Simpan percakapan dan bukti transfer. Hubungi bank atau penyedia e-wallet untuk melaporkan transaksi.",
      },
      {
        heading: "Kenapa penjual memilih cara ini",
        body: "Penjual yang berniat menipu ingin uang berpindah tanpa ada pihak yang menahannya. Sistem marketplace menahan dana sampai pembeli mengonfirmasi penerimaan, sehingga penipuan menjadi sulit. Dengan memindahkan transaksi ke rekening pribadi, mereka menghilangkan satu-satunya pengaman yang Anda punya.",
      },
      {
        heading: "Cara menolak tanpa berdebat",
        body: "Anda tidak perlu menuduh atau menjelaskan panjang. Kalimat seperti “maaf, saya hanya bisa lewat aplikasi” sudah cukup, dan penjual yang jujur akan menerimanya. Jika penjual tetap mendesak atau mulai menekan, itu sendiri sudah menjadi jawaban yang jelas.",
        callout:
          "Penjual yang menolak transaksi resmi biasanya menolak karena sistem resmi justru melindungi Anda, bukan dia.",
      },
    ],
    checklist: [
      "Tolak pembayaran ke rekening pribadi",
      "Gunakan metode pembayaran di dalam aplikasi",
      "COD lebih aman daripada transfer di muka",
      "Laporkan penjual yang meminta transaksi di luar aplikasi",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157],
    related: ["setelah-transfer", "penipuan-paket-kurir"],
  },
  {
    id: "investasi-palsu",
    title: "Investasi dengan untung pasti dan penggandaan uang",
    summary:
      "Yang ditawarkan bukan produk keuangan, melainkan kepastian. Padahal kepastian hasil adalah hal yang tidak bisa diberikan investasi mana pun.",
    category: "Kerja dan uang",
    tags: ["investasi", "ojk", "legalitas", "imbal hasil"],
    sections: [
      {
        heading: "Janji yang menjadi ciri utamanya",
        body: "Penawaran menyebut angka tetap: untung sekian persen per bulan, tanpa risiko, modal kembali dalam hitungan hari. Ada juga yang memakai istilah penggandaan uang atau money game dengan skema perekrutan anggota. Semua bentuk ini memiliki satu kesamaan: hasil dijanjikan, bukan diperkirakan.",
      },
      {
        heading: "Kenapa skema ini selalu runtuh",
        body: "Uang dari anggota baru dipakai untuk membayar anggota lama. Selama anggota baru terus bertambah, semua terlihat lancar dan testimoni berdatangan. Ketika pertambahan melambat, pembayaran berhenti, dan anggota terakhir kehilangan dananya. Karena itu skema seperti ini tidak pernah bertahan lama, hanya waktunya yang tidak bisa dipastikan.",
        bullets: [
          "Imbal hasil tetap dan dijamin.",
          "Tidak ada penjelasan jelas tentang sumber keuntungan.",
          "Ada insentif untuk merekrut anggota baru.",
          "Penarikan dipersulit dengan syarat tambahan.",
        ],
      },
      {
        heading: "Cara memeriksa legalitas",
        body: "Cek nama entitas dan nama produk di situs resmi OJK. Pastikan izinnya sesuai dengan kegiatan yang ditawarkan, bukan hanya nama perusahaan yang mirip. Waspadai penawaran yang menyebut sedang dalam proses perizinan, karena itu berarti belum berizin.",
        callout:
          "Tidak ada investasi sah yang menjamin keuntungan. Jika sebuah tawaran merasa perlu menjamin hasil, yang dijamin sebenarnya adalah kerugian Anda.",
      },
      {
        heading: "Kasus yang mirip tapi sah",
        body: "Reksa dana, saham, dan obligasi adalah instrumen sah, tetapi tetap memiliki risiko dan nilainya bisa turun. Yang membedakan bukan besar kecilnya imbal hasil, melainkan adanya izin, penjelasan risiko, dan tidak adanya jaminan hasil.",
      },
      {
        heading: "Kalau sudah menyetor dana",
        body: "Hentikan setoran berikutnya. Kumpulkan bukti transfer, tangkapan layar penawaran, dan identitas penerima dana. Laporkan melalui kanal pelaporan resmi. Pelaporan tidak menjamin dana kembali, tetapi diperlukan agar kasus tercatat dan penanganan bisa dilakukan.",
      },
      {
        heading: "Mengapa testimoni tidak membuktikan apa pun",
        body: "Pada skema seperti ini, anggota awal memang dibayar. Uang mereka berasal dari setoran anggota yang masuk belakangan. Testimoni yang bertebaran adalah pengalaman nyata dari orang yang belum tahu bahwa dirinya sedang berada di urutan awal. Ketika anggota baru berhenti masuk, pembayaran berhenti untuk semua orang di bawahnya.",
      },
      {
        heading: "Pertanyaan yang membongkar penawaran",
        body: "Tanyakan satu hal: dari mana keuntungannya berasal. Jika jawabannya tidak jelas, atau hanya berupa “dari transaksi anggota”, itu bukan penjelasan. Investasi yang sah bisa menjelaskan sumber imbal hasilnya, misalnya bunga, dividen, atau kenaikan nilai aset, dan selalu menyebut risiko.",
        callout:
          "Imbal hasil yang dijamin bukan tanda investasi yang aman. Itu tanda tidak ada investasi di dalamnya.",
      },
    ],
    checklist: [
      "Tidak ada imbal hasil yang dijamin",
      "Cek izin entitas dan produk di situs OJK",
      "Waspadai insentif merekrut anggota baru",
      "Simpan bukti sebelum melapor",
    ],
    sources: [SOURCE_OJK, SOURCE_IASC, SOURCE_KONTAK157],
    related: ["tugas-online-dan-komisi", "setelah-transfer"],
  },
  {
    id: "giveaway-palsu",
    title: "Giveaway dan biaya klaim hadiah",
    summary:
      "Anda tidak bisa menang undian yang tidak Anda ikuti. Premis sederhana ini membatalkan sebagian besar pesan hadiah yang masuk.",
    category: "Rekayasa sosial",
    tags: ["giveaway", "hadiah", "undian", "biaya klaim"],
    sections: [
      {
        heading: "Premis yang harus diuji lebih dulu",
        body: "Sebelum membaca detail apa pun, tanyakan satu hal: apakah Anda pernah mengikuti undian ini. Jika tidak, tidak ada mekanisme yang membuat nama Anda terpilih. Pelaku mengandalkan kegembiraan agar pertanyaan ini terlewat.",
      },
      {
        heading: "Bentuk biaya yang diminta",
        body: "Hadiah tidak pernah mensyaratkan pembayaran untuk dicairkan. Jika ada permintaan uang, itu bukan biaya administrasi hadiah, melainkan tujuan sebenarnya dari pesan.",
        bullets: [
          "Biaya administrasi atau pajak hadiah.",
          "Biaya pengiriman yang harus ditransfer lebih dulu.",
          "Biaya aktivasi rekening penerima hadiah.",
          "Setoran jaminan yang katanya akan dikembalikan.",
        ],
      },
      {
        heading: "Data yang ikut diminta",
        body: "Selain uang, pelaku meminta foto KTP, nomor rekening, atau kode OTP dengan alasan verifikasi pemenang. KTP dan selfie dengan KTP bisa dipakai untuk membuka rekening atau mengajukan pinjaman atas nama Anda.",
        callout:
          "Hadiah yang sah tidak meminta uang, tidak meminta KTP lewat chat, dan tidak meminta kode OTP.",
      },
      {
        heading: "Kasus yang mirip tapi sah",
        body: "Brand memang sering mengadakan giveaway, dan pemenangnya diumumkan lewat akun resmi. Perbedaannya: Anda benar-benar ikut, pengumuman ada di akun resmi yang terverifikasi, dan hadiah dikirim tanpa biaya dari pemenang.",
      },
      {
        heading: "Yang perlu dilakukan",
        body: "Abaikan dan blokir. Jika sudah mengirim uang atau dokumen, hubungi penyedia pembayaran dan laporkan. Untuk dokumen identitas, pantau apakah ada pembukaan rekening atau pinjaman yang tidak Anda ajukan.",
      },
      {
        heading: "Mengapa nominalnya selalu kecil",
        body: "Biaya klaim biasanya jauh lebih kecil daripada nilai hadiah yang dijanjikan. Angka kecil membuat calon korban merasa kerugiannya tidak sepadan untuk diperiksa, padahal tujuannya bukan uang itu. Yang mereka kejar adalah data identitas dan rekening, atau pembayaran lanjutan yang nilainya terus naik setelah Anda terlanjur membayar sekali.",
      },
      {
        heading: "Pola lanjutan setelah pembayaran pertama",
        body: "Sekali Anda membayar, akan muncul syarat berikutnya: biaya pajak, biaya pengiriman, atau biaya pencairan. Setiap langkah terasa sebagai langkah terakhir, dan itulah yang membuat orang terus membayar. Jika Anda menyadari sudah berada di pola ini, hentikan sepenuhnya tanpa mencoba menyelesaikan satu syarat lagi.",
        callout:
          "Tidak ada hadiah yang mensyaratkan Anda membayar lebih dulu. Jika sudah membayar sekali, jangan menambah pembayaran untuk menyelamatkan yang sebelumnya.",
      },
    ],
    checklist: [
      "Pastikan Anda benar-benar mengikuti undian",
      "Tolak biaya apa pun untuk klaim hadiah",
      "Jangan kirim KTP atau selfie dengan KTP",
      "Cek pengumuman di akun resmi penyelenggara",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157, SOURCE_OJK],
    related: ["nomor-baru-minta-uang", "investasi-palsu"],
  },
  {
    id: "qris-palsu",
    title: "QR code dan QRIS yang mencurigakan",
    summary:
      "Kode QR mudah dicetak ulang dan ditempel di atas kode asli. Yang Anda lihat sebagai satu gambar, sebenarnya adalah alamat tujuan pembayaran.",
    category: "Kerja dan uang",
    tags: ["qris", "qr code", "pembayaran", "merchant"],
    sections: [
      {
        heading: "Apa yang tersembunyi di balik kode",
        body: "Kode QR hanyalah cara menyimpan teks. Untuk pembayaran, teks itu berisi identitas merchant penerima. Siapa pun bisa membuat kode QR yang mengarah ke rekening berbeda, lalu menempelkannya di tempat yang sering dipindai orang.",
      },
      {
        heading: "Tempat yang sering dimodifikasi",
        body: "Stiker QRIS di meja warung, tempelan di dinding toko, atau kode yang dikirim lewat chat. Kode yang dikirim lewat chat paling berisiko, karena tidak ada cara membandingkan dengan kode asli yang biasa Anda gunakan.",
        bullets: [
          "Stiker yang terlihat ditempel di atas stiker lain.",
          "Kode dengan nama merchant yang tidak cocok dengan nama toko.",
          "Kode yang dikirim lewat pesan untuk pembayaran jarak jauh.",
        ],
      },
      {
        heading: "Cara memeriksa sebelum membayar",
        body: "Setelah memindai, aplikasi menampilkan nama merchant sebelum Anda menekan bayar. Bacalah. Jika nama yang muncul bukan nama toko atau bukan nama orang yang Anda maksud, batalkan. Untuk transaksi jarak jauh, minta nomor rekening dan cocokkan nama penerima secara manual.",
        callout:
          "Selalu baca nama penerima di layar konfirmasi. Satu detik membaca lebih murah daripada mengurus sengketa.",
      },
      {
        heading: "Kasus yang mirip tapi sah",
        body: "Merchant memang bisa memakai nama badan usaha yang berbeda dari nama toko, misalnya nama PT atau nama pemilik. Karena itu cocokkan dengan informasi yang Anda ketahui, atau tanyakan langsung ke kasir. Perbedaan nama saja belum tentu penipuan.",
      },
      {
        heading: "Kalau sudah membayar ke kode yang salah",
        body: "Simpan bukti transaksi dan tangkapan layar kode yang Anda pindai. Laporkan ke penyedia pembayaran melalui aplikasi resmi. Pelaporan tidak menjamin dana kembali, tetapi merupakan langkah yang diperlukan.",
      },
      {
        heading: "Mengapa kode QR mudah dimodifikasi",
        body: "Stiker QRIS yang ditempel di meja atau dinding adalah benda fisik yang bisa ditutup stiker lain dalam hitungan detik. Pemilik warung sering tidak menyadarinya sampai ada pembeli yang mengeluh. Karena itu memeriksa nama penerima di layar bukan sikap berlebihan, melainkan kebiasaan yang masuk akal.",
      },
      {
        heading: "Untuk transaksi jarak jauh",
        body: "Kode QR yang dikirim lewat chat paling berisiko, karena tidak ada pembanding fisik. Jika penjual mengirim kode QR untuk pembayaran, mintalah nomor rekening dan nama penerima, lalu cocokkan dengan nama yang Anda kenal. Untuk transaksi bernilai besar, transfer bank biasa dengan nama penerima yang jelas lebih mudah diperiksa.",
        callout:
          "Satu detik membaca nama penerima di layar konfirmasi mencegah sengketa yang bisa berlangsung berminggu-minggu.",
      },
    ],
    checklist: [
      "Baca nama merchant di layar sebelum menekan bayar",
      "Periksa apakah stiker QRIS ditempel di atas stiker lain",
      "Untuk jarak jauh, cocokkan nama penerima dengan yang Anda kenal",
      "Simpan bukti dan kode yang dipindai bila terjadi masalah",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157, SOURCE_OJK],
    related: ["transaksi-luar-aplikasi", "setelah-transfer"],
  },
  {
    id: "setelah-transfer",
    title: "Sudah terlanjur transfer: urutan langkah yang perlu diambil",
    summary:
      "Kecepatan menentukan. Namun tetap ada urutan yang masuk akal, dan tidak semua langkah bisa dilakukan bersamaan.",
    category: "Setelah kejadian",
    tags: ["transfer", "bank", "pelaporan", "bukti"],
    sections: [
      {
        heading: "Menit pertama",
        body: "Hubungi bank atau penyedia e-wallet melalui kanal resmi, bukan nomor yang ada di pesan pelaku. Laporkan transaksi dan minta penanganan secepat mungkin. Sebagian penyedia memiliki fitur pelaporan transaksi di dalam aplikasi yang bisa dipakai lebih cepat daripada menunggu call center.",
      },
      {
        heading: "Yang perlu disiapkan saat melapor",
        body: "Siapkan informasi berikut agar laporan bisa langsung diproses.",
        bullets: [
          "Bukti transfer atau mutasi rekening.",
          "Nomor rekening tujuan dan nama penerima.",
          "Waktu dan nominal transaksi.",
          "Tangkapan layar percakapan dengan pelaku.",
        ],
      },
      {
        heading: "Setelah laporan awal",
        body: "Laporkan melalui kanal pelaporan resmi untuk penipuan transaksi keuangan. Untuk entitas yang mengaku lembaga jasa keuangan, pengaduan bisa diajukan lewat portal pengaduan OJK. Jika nilai kerugian besar atau identitas Anda dipakai, pertimbangkan laporan kepolisian dengan membawa seluruh bukti.",
        callout:
          "Pelaporan tidak menjamin dana kembali. Yang bisa diharapkan adalah pencatatan kasus, pemblokiran rekening pelaku, dan penanganan sesuai prosedur yang berlaku.",
      },
      {
        heading: "Yang sebaiknya tidak dilakukan",
        body: "Jangan mentransfer uang tambahan dengan janji dana sebelumnya bisa dicairkan. Ini pola lanjutan yang umum: pelaku menawarkan jasa pemulihan dana atau biaya administrasi pencairan. Tidak ada pihak yang bisa menjamin pengembalian dana dengan pembayaran di muka.",
      },
      {
        heading: "Setelah semua langkah",
        body: "Ganti kata sandi akun keuangan Anda, aktifkan verifikasi dua langkah, dan periksa apakah ada perangkat lain yang masih login. Simpan seluruh dokumen laporan di satu tempat. Jika pelaku masih menghubungi, jangan menanggapi dan blokir nomornya.",
      },
      {
        heading: "Kenapa kecepatan menentukan",
        body: "Dana yang masih berada di rekening pelaku punya peluang lebih besar untuk ditahan daripada dana yang sudah berpindah beberapa kali. Karena itu menit pertama lebih berharga daripada jam pertama. Menunggu sampai besok, atau menunggu sampai Anda yakin, biasanya membuat pilihan penanganan menyempit.",
      },
      {
        heading: "Menyiapkan laporan dalam satu tempat",
        body: "Buat satu catatan berisi kronologi singkat: kapan pesan masuk, kapan transfer dilakukan, ke rekening mana, berapa nilainya, dan apa yang dijanjikan. Sertakan tangkapan layar percakapan dan bukti transfer. Catatan ini akan Anda pakai berulang kali, baik untuk bank, portal pengaduan, maupun laporan kepolisian.",
        callout:
          "Anda tidak perlu menceritakan ulang kejadian ini dari awal setiap kali melapor. Satu kronologi tertulis cukup untuk semua kanal.",
      },
    ],
    checklist: [
      "Hubungi bank lewat kanal resmi secepat mungkin",
      "Siapkan bukti transfer dan percakapan",
      "Laporkan ke kanal pelaporan resmi",
      "Tolak tawaran pemulihan dana berbayar",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157, SOURCE_OJK],
    related: ["setelah-kredensial-bocor", "nomor-baru-minta-uang"],
  },
  {
    id: "setelah-kredensial-bocor",
    title: "Sudah memberikan OTP atau kata sandi: mengamankan akun",
    summary:
      "Kredensial yang sudah bocor tidak bisa ditarik kembali. Yang bisa dilakukan adalah mempersempit akses dan memutus sesi yang sudah terbuka.",
    category: "Setelah kejadian",
    tags: ["kredensial", "pemulihan akun", "sesi", "kata sandi"],
    sections: [
      {
        heading: "Urutan yang penting",
        body: "Amankan email utama lebih dulu, karena email adalah jalur pemulihan untuk hampir semua akun lain. Setelah email aman, baru tangani akun lain yang memakai alamat email tersebut.",
      },
      {
        heading: "Langkah pada tiap akun",
        body: "Lakukan pada akun yang kredensialnya Anda berikan, lalu pada akun lain yang memakai kata sandi sama.",
        bullets: [
          "Buka situs atau aplikasi resmi dengan mengetik alamatnya sendiri.",
          "Ganti kata sandi dengan yang baru dan belum pernah dipakai.",
          "Cabut sesi di semua perangkat lain, bukan hanya keluar dari perangkat ini.",
          "Periksa email pemulihan dan nomor telepon, pastikan masih milik Anda.",
          "Aktifkan verifikasi dua langkah.",
        ],
      },
      {
        heading: "Jika akses sudah diambil alih",
        body: "Gunakan fitur pemulihan resmi penyedia layanan. Jika email pemulihan sudah diganti pelaku, proses pemulihan biasanya memerlukan verifikasi identitas tambahan. Hubungi dukungan resmi melalui kanal yang Anda cari sendiri, dan siapkan bukti kepemilikan akun.",
        callout:
          "Jangan memakai jasa pemulihan akun berbayar dari pihak ketiga. Mereka meminta kredensial atau biaya, dan tidak memiliki akses khusus apa pun.",
      },
      {
        heading: "Memeriksa kerusakan yang tersisa",
        body: "Periksa riwayat transaksi dan pesan terkirim. Pada akun media sosial, periksa apakah ada pesan yang dikirim ke kontak Anda. Pada akun keuangan, periksa apakah ada metode pembayaran baru yang ditambahkan. Periksa juga aplikasi pihak ketiga yang memiliki izin akses, lalu cabut yang tidak dikenal.",
      },
      {
        heading: "Memberi tahu orang lain",
        body: "Beri tahu kontak terdekat lewat kanal lain bahwa akun Anda sempat diambil alih, agar mereka tidak menanggapi permintaan uang yang mungkin dikirim dari akun Anda. Cukup satu pesan singkat, tidak perlu menjelaskan detail.",
      },
      {
        heading: "Mengapa email lebih dulu",
        body: "Hampir semua akun lain bisa dipulihkan lewat email. Jika email utama dikuasai orang lain, pelaku bisa meminta tautan reset untuk layanan lain dan mengunci Anda dari sana. Mengamankan email lebih dulu memutus jalur pemulihan yang paling sering dipakai.",
      },
      {
        heading: "Memeriksa kerusakan yang tidak terlihat",
        body: "Setelah akses kembali, luangkan beberapa menit untuk memeriksa hal yang jarang dilihat: aturan penerusan email otomatis, alamat pemulihan cadangan, aplikasi pihak ketiga yang punya izin, dan perangkat yang masih login. Pelaku sering meninggalkan jalur masuk cadangan agar bisa kembali lagi setelah Anda mengganti kata sandi.",
        callout:
          "Mengganti kata sandi saja tidak cukup jika pelaku masih memegang sesi aktif atau email pemulihan.",
      },
    ],
    checklist: [
      "Amankan email utama lebih dulu",
      "Ganti kata sandi dan cabut sesi lain",
      "Periksa email dan nomor pemulihan",
      "Beri tahu kontak lewat kanal terpisah",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157],
    related: ["otp-dan-pengambilalihan-akun", "setelah-klik-tautan"],
  },
  {
    id: "setelah-klik-tautan",
    title: "Sudah membuka tautan tapi belum mengisi apa pun",
    summary:
      "Membuka tautan saja umumnya tidak cukup untuk mencuri data. Yang menentukan adalah apa yang Anda lakukan di halaman itu.",
    category: "Setelah kejadian",
    tags: ["tautan", "phishing", "perangkat", "pencegahan"],
    sections: [
      {
        heading: "Apa yang sudah dan belum terjadi",
        body: "Membuka halaman memberi tahu pelaku bahwa nomor atau alamat Anda aktif, dan peramban Anda memuat halaman tersebut. Selama Anda tidak mengetik kata sandi, kode OTP, atau data kartu, belum ada kredensial yang berpindah. Ini menurunkan tingkat risikonya secara signifikan.",
      },
      {
        heading: "Langkah yang masuk akal",
        body: "Urutannya sederhana dan tidak perlu panik.",
        bullets: [
          "Tutup halaman tanpa mengisi formulir apa pun.",
          "Jangan mengunduh atau menjalankan berkas dari halaman itu.",
          "Hapus tautan dari riwayat bila perangkat dipakai bersama.",
          "Jika sempat diminta login, segera ganti kata sandi akun terkait.",
        ],
      },
      {
        heading: "Kapan perlu lebih waspada",
        body: "Jika halaman meminta Anda memasang aplikasi, memberikan izin akses, atau mengunduh dokumen, risikonya lebih tinggi daripada sekadar membuka halaman. Dalam kasus itu, periksa aplikasi yang terpasang dan cabut izin yang tidak Anda kenali.",
        callout:
          "Membuka halaman bukan kegagalan keamanan. Mengetik kredensial di halaman yang salah barulah masalah.",
      },
      {
        heading: "Pemeriksaan ringan",
        body: "Pindai perangkat dengan aplikasi keamanan yang Anda percaya bila Anda sempat mengunduh sesuatu. Periksa riwayat login akun penting untuk memastikan tidak ada akses dari perangkat asing. Untuk perangkat sehari-hari, langkah ini biasanya sudah cukup.",
      },
      {
        heading: "Belajar dari tautannya",
        body: "Simpan alamat lengkapnya, lalu periksa strukturnya di tab Periksa Tautan. Melihat domain sebenarnya membantu Anda mengenali pola serupa di kemudian hari, misalnya tanda hubung berlebihan atau subdomain yang meniru merek.",
      },
      {
        heading: "Apa yang sudah terbocor",
        body: "Membuka halaman mengirim informasi teknis dasar seperti alamat IP dan jenis perangkat, serta memberi tahu pelaku bahwa nomor atau alamat Anda aktif. Informasi ini berguna untuk menyusun pesan berikutnya yang lebih meyakinkan, tetapi belum cukup untuk mengambil alih akun.",
      },
      {
        heading: "Kapan sebaiknya lebih dari sekadar menutup halaman",
        body: "Jika halaman meminta Anda memasang aplikasi, memberikan izin akses, atau mengunduh dokumen, perlakukan sebagai insiden yang lebih serius. Periksa daftar aplikasi yang terpasang, cabut izin yang tidak Anda kenali, dan pertimbangkan memindai perangkat. Untuk halaman yang hanya menampilkan teks, menutupnya biasanya sudah cukup.",
        callout:
          "Perbedaan besar bukan pada halaman yang dibuka, melainkan pada apa yang Anda masukkan atau pasang di sana.",
      },
    ],
    checklist: [
      "Tutup halaman tanpa mengisi data",
      "Jangan mengunduh berkas dari halaman mencurigakan",
      "Ganti kata sandi bila sempat login",
      "Periksa riwayat login akun penting",
    ],
    sources: [SOURCE_IASC, SOURCE_KONTAK157],
    related: ["phishing-domain-mirip", "setelah-kredensial-bocor"],
  },









];
