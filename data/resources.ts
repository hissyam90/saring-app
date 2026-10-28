export interface ResourceSection {
  heading: string;
  body: string;
}

export interface ResourceLink {
  label: string;
  url: string;
}

export interface ResourceArticle {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  sections: ResourceSection[];
  checklist?: string[];
  externalLinks?: ResourceLink[];
}

export const LIBRARY: ResourceArticle[] = [
  {
    id: "manipulative-language",
    title: "Mengenali bahasa manipulatif",
    summary:
      "Penipu memakai rasa takut, desakan, dan janji berlebihan agar korban bertindak tanpa berpikir.",
    tags: ["manipulasi", "urgensi", "intimidasi"],
    sections: [
      {
        heading: "Apa yang harus diperhatikan",
        body:
          "Perhatikan pesan yang menciptakan rasa takut (akun diblokir, dituntut), desakan waktu (segera, hari ini juga), atau janji yang terlalu bagus (untung pasti, hadiah besar). Emosi itu dirancang untuk mematikan nalar kritis.",
      },
      {
        heading: "Cara menanggapinya",
        body:
          "Berhenti sejenak sebelum membalas. Tulis ulang inti pesan dengan tenang, lalu tanyakan: apakah ini masuk akal? Apakah pihak resmi benar-benar berkomunikasi seperti ini?",
      },
    ],
    checklist: [
      "Pesan memanfaatkan rasa takut atau ancaman",
      "Ada tenggat waktu pendek yang dibuat-buat",
      "Menjanjikan hasil yang tidak realistis",
      "Memaksa agar tidak sempat bertanya ke orang lain",
    ],
  },
  {
    id: "verify-through-channel",
    title: "Verifikasi lewat saluran terpisah",
    summary:
      "Jangan percaya begitu saja pada identitas pengirim — cek ulang lewat kanal yang kamu cari sendiri.",
    tags: ["verifikasi", "identitas", "impersonasi"],
    sections: [
      {
        heading: "Prinsip saluran terpisah",
        body:
          "Jika seseorang mengaku dari bank, marketplace, atau temanmu, konfirmasi lewat jalur resmi yang kamu ketahui sendiri — bukan nomor/akun yang ada di pesan tersebut.",
      },
      {
        heading: "Praktiknya",
        body:
          "Misalnya, hubungi nomor layanan resmi di situs web, atau hubungi temanmu lewat nomor lamanya. Penipu bergantung pada kamu membalas lewat kanal yang mereka kendalikan.",
      },
    ],
    checklist: [
      "Cari sendiri kontak resmi, jangan pakai yang dikirim pengirim",
      "Tanya hal yang hanya orang aslinya yang tahu",
      "Waspadai panggilan balik dari 'nomor resmi' yang justru diberikan penipu",
    ],
  },
  {
    id: "fake-jobs",
    title: "Mengenali lowongan kerja palsu",
    summary:
      "Lowongan palsu kerap meminta biaya, menjanjikan gaji besar, dan prosesnya terburu-buru.",
    tags: ["lowongan", "rekrutmen", "pembayaran"],
    sections: [
      {
        heading: "Ciri umum",
        body:
          "Perusahaan resmi tidak memungut biaya pendaftaran, seragam, atau pelatihan dari pelamar. Waspadai lowongan yang menghubungi duluan tanpa kamu melamar, atau yang meminta data pribadi berlebihan.",
      },
      {
        heading: "Langkah aman",
        body:
          "Cek lowongan di situs karier resmi perusahaan. Cari ulasan perusahaan dan konfirmasi email rekrutmen menggunakan domain resmi.",
      },
    ],
    checklist: [
      "Meminta biaya apa pun di muka",
      "Menjanjikan gaji tidak wajar untuk posisi biasa",
      "Proses seleksi sangat singkat dan mendesak",
      "Menggunakan email/domain tidak resmi",
    ],
  },
  {
    id: "protect-credentials",
    title: "Melindungi kredensial (OTP, PIN, kata sandi)",
    summary:
      "Kode rahasia adalah kunci akunmu. Tidak ada pihak resmi yang memintanya.",
    tags: ["kredensial", "otp", "kata sandi"],
    sections: [
      {
        heading: "Aturan emas",
        body:
          "OTP, PIN, password, dan kode pemulihan hanya untuk kamu. Bank, marketplace, dan layanan resmi tidak akan pernah memintanya lewat telepon, chat, atau tautan.",
      },
      {
        heading: "Kebiasaan sederhana",
        body:
          "Gunakan kata sandi unik per akun dan aktifkan verifikasi dua langkah. Jangan menulis kode di tempat yang mudah diakses.",
      },
    ],
    checklist: [
      "Jangan bagikan OTP/PIN/password kepada siapa pun",
      "Gunakan kata sandi berbeda untuk tiap akun penting",
      "Aktifkan verifikasi dua langkah",
      "Periksa halaman login sebelum memasukkan kredensial",
    ],
  },
  {
    id: "inspect-urls",
    title: "Memeriksa URL tanpa membuka tautan mencurigakan",
    summary:
      "Kenali struktur tautan sebelum mengklik. Tautan pendek dan alamat tidak lazim perlu diwaspadai.",
    tags: ["tautan", "phishing", "url"],
    sections: [
      {
        heading: "Yang bisa diamati dari teks",
        body:
          "Perhatikan apakah tautan memakai layanan penyingkat (mis. bit.ly, s.id), alamat IP numerik, atau domain dengan ejaan mirip situs resmi. Arahkan kursor (tanpa mengklik) untuk melihat tujuan pada pratinjau peramban.",
      },
      {
        heading: "Yang tidak boleh dilakukan",
        body:
          "Jangan mengklik untuk 'mengecek'. Memeriksa cukup dari tampilan teksnya saja. Bila perlu ke situs resmi, ketik alamatnya secara manual.",
      },
    ],
    checklist: [
      "Periksa domain secara manual, jangan mengklik",
      "Waspadai tautan pendek dan alamat IP",
      "Perhatikan ejaan domain yang mirip merek resmi",
      "Hindari memasukkan data di halaman http (tanpa gembok)",
    ],
  },
  {
    id: "verify-investment",
    title: "Memverifikasi tawaran investasi dan keuangan",
    summary:
      "Cek legalitas sebelum menaruh dana. Tawaran untung pasti hampir selalu ilegal.",
    tags: ["investasi", "keuangan", "legalitas"],
    sections: [
      {
        heading: "Sinyal bahaya",
        body:
          "Janji untung tetap, tanpa risiko, atau imbal hasil jauh di atas pasar adalah tanda penawaran ilegal. Penawaran resmi selalu menyertakan risiko.",
      },
      {
        heading: "Cara memeriksa",
        body:
          "Cek daftar entitas berizin dan produk keuangan di situs resmi OJK. Tanyakan legalitas sebelum menaruh dana, dan waspadai tekanan untuk segera setor.",
      },
    ],
    checklist: [
      "Menjanjikan keuntungan pasti atau tanpa risiko",
      "Tidak jelas izin/legalitasnya",
      "Menekan untuk segera transfer",
      "Cek legalitas di situs resmi OJK",
    ],
    externalLinks: [
      {
        label: "OJK — Otoritas Jasa Keuangan",
        url: "https://www.ojk.go.id/",
      },
    ],
  },
  {
    id: "preserve-evidence",
    title: "Menyimpan bukti saat melaporkan insiden",
    summary:
      "Bukti yang rapi mempercepat pelaporan dan penanganan. Amankan tanpa menghapus percakapan.",
    tags: ["bukti", "pelaporan", "evidensi"],
    sections: [
      {
        heading: "Apa yang disimpan",
        body:
          "Tangkapan layar percakapan, profil pengirim, bukti transfer, mutasi, dan catatan waktu kejadian. Jangan menghapus pesan sebelum dilaporkan.",
      },
      {
        heading: "Ke mana melapor",
        body:
          "Untuk penipuan keuangan, gunakan Indonesia Anti-Scam Centre (IASC). Untuk lembaga jasa keuangan, ajukan lewat Kontak 157 OJK. Bila melibatkan pidana, laporkan ke kepolisian dengan membawa seluruh bukti.",
      },
    ],
    checklist: [
      "Screenshot percakapan dan profil",
      "Simpan bukti transfer/mutasi",
      "Catat waktu dan tanggal kejadian",
      "Jangan hapus percakapan sebelum dilaporkan",
    ],
    externalLinks: [
      {
        label: "Indonesia Anti-Scam Centre (IASC)",
        url: "https://iasc.ojk.go.id/",
      },
      {
        label: "Kontak 157 OJK — Portal Pengaduan",
        url: "https://kontak157.ojk.go.id/appkpublicportal/Pengaduan",
      },
    ],
  },
];