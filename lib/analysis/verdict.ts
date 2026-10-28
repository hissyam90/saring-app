import type { Finding, Verdict } from "./types";
import type { SocialAnalysis } from "./socialEngineering";

const IDENTITY_UNCERTAIN = [
  "Isi pesan tidak dapat membuktikan identitas pengirim.",
  "Saring tidak memeriksa nomor pengirim maupun riwayatnya.",
  "Niat pengirim tidak dapat dinilai hanya dari teks. yang bisa dinilai hanyalah pola pesannya.",
];

const FRIEND_MONEY_STEPS = [
  "Hubungi nomor lama yang sudah tersimpan di kontak Anda.",
  "Telepon atau video call lewat kanal yang sudah Anda kenal, bukan lewat nomor baru ini.",
  "Tanyakan sesuatu yang hanya diketahui orang tersebut.",
  "Konfirmasi lewat teman bersama bila identitas masih belum pasti.",
  "Jangan transfer sebelum identitas terverifikasi.",
  "Jika sudah terlanjur transfer, simpan percakapan dan bukti transaksi, lalu gunakan prosedur pelaporan yang sesuai.",
];

function has(findings: Finding[], category: Finding["category"]): boolean {
  return findings.some((f) => f.category === category);
}

export function buildVerdict(
  findings: Finding[],
  social: SocialAnalysis,
  classification: "many-signals" | "needs-review" | "limited-signals",
): Verdict {
  const credential = has(findings, "credential-theft");
  const upfront = has(findings, "upfront-payment");

  if (social.impersonationPattern) {
    return {
      title: "Perlu verifikasi sebelum mengirim uang",
      summary:
        "Pengirim mengaku sebagai orang yang Anda kenal tetapi memakai nomor baru, sekaligus meminta uang. Pola ini memerlukan verifikasi identitas lebih dulu. bukan berarti pengirim pasti penipu.",
      tone: "critical",
      actionSteps: FRIEND_MONEY_STEPS,
      uncertainties: IDENTITY_UNCERTAIN,
    };
  }

  if (credential) {
    return {
      title: "Jangan bagikan kode rahasia apa pun",
      summary:
        "Pesan meminta kode atau kredensial yang seharusnya hanya Anda ketahui. Pihak resmi tidak pernah meminta OTP, PIN, atau kata sandi melalui pesan.",
      tone: "critical",
      actionSteps: [
        "Jangan membalas dengan kode, PIN, atau kata sandi apa pun.",
        "Buka aplikasi atau situs resmi dengan mengetik alamatnya sendiri, lalu periksa notifikasi di sana.",
        "Jika kode sudah terlanjur dikirim, segera ganti kata sandi dan cabut sesi perangkat lain.",
        "Laporkan pesan tersebut melalui fitur lapor di aplikasi yang Anda gunakan.",
      ],
      uncertainties: [
        "Saring tidak dapat memastikan siapa pengirim sebenarnya.",
        "Kode yang sudah dikirim tidak dapat ditarik kembali oleh aplikasi ini.",
      ],
    };
  }

  if (social.moneyPattern) {
    return {
      title: "Pastikan identitas sebelum mengirim uang",
      summary:
        "Ada permintaan uang dalam pesan ini. Permintaan seperti ini belum tentu penipuan, tetapi sebaiknya identitas pengirim dipastikan lebih dulu.",
      tone: "caution",
      actionSteps: [
        "Hubungi orang tersebut lewat nomor atau akun yang sudah Anda kenal.",
        "Minta panggilan suara atau video sebelum mengirim dana.",
        "Jangan gunakan nomor atau tautan baru dari pesan ini sebagai satu-satunya dasar.",
        "Simpan percakapan bila nanti diperlukan untuk pelaporan.",
      ],
      uncertainties: IDENTITY_UNCERTAIN.slice(0, 2),
    };
  }

  if (upfront) {
    return {
      title: "Jangan bayar biaya apa pun di muka",
      summary:
        "Pesan meminta pembayaran sebelum ada proses atau hadiah yang jelas. Loker resmi dan hadiah sah tidak memungut biaya di muka.",
      tone: "critical",
      actionSteps: [
        "Jangan mentransfer uang atau mengisi data pembayaran.",
        "Cek keberadaan lowongan/penawaran di situs resmi instansi terkait.",
        "Blokir dan laporkan pengirim bila memang tidak Anda kenal.",
        "Bila sudah membayar, segera hubungi penyedia pembayaran melalui kanal resminya.",
      ],
      uncertainties: [
        "Saring tidak dapat memverifikasi legalitas perusahaan atau penyelenggara yang disebut.",
      ],
    };
  }

  if (classification === "many-signals") {
    return {
      title: "Berhenti dulu, ada beberapa sinyal bahaya",
      summary:
        "Beberapa indikator muncul bersamaan. Sebaiknya tidak menindaklanjuti pesan ini sebelum Anda memeriksanya lewat jalur resmi.",
      tone: "critical",
      actionSteps: [
        "Jangan klik tautan, jangan balas, dan jangan mengirim data apa pun.",
        "Periksa informasi lewat situs atau aplikasi resmi yang Anda cari sendiri.",
        "Simpan tangkapan layar pesan ini sebagai bukti.",
        "Blokir dan laporkan pengirim melalui aplikasi yang digunakan.",
      ],
      uncertainties: IDENTITY_UNCERTAIN.slice(0, 2),
    };
  }

  if (classification === "needs-review") {
    return {
      title: "Periksa dulu lewat jalur resmi",
      summary:
        "Ada indikator yang perlu diwaspadai. Verifikasi melalui kanal resmi sebelum merespons atau membuka apa pun.",
      tone: "caution",
      actionSteps: [
        "Jangan gunakan tautan atau nomor dari pesan ini untuk memverifikasi.",
        "Cari kanal resmi organisasi yang disebut, lalu hubungi dari sana.",
        "Simpan pesan ini bila nanti perlu dilaporkan.",
      ],
      uncertainties: IDENTITY_UNCERTAIN.slice(0, 2),
    };
  }

  return {
    title: "Sinyal bahaya yang dikenali masih sedikit",
    summary:
      "Tidak banyak pola bahaya yang cocok dengan pesan ini. Tetap waspada: hasil ini bukan jaminan pesan aman.",
    tone: "neutral",
    actionSteps: [
      "Periksa kembali apakah Anda mengenal pengirim dan apakah pesan ini Anda tunggu.",
      "Jika ada permintaan uang, data, atau tautan, verifikasi lewat kanal yang sudah dikenal.",
      "Bila ragu, jangan bertindak dulu.",
    ],
    uncertainties: [
      "Pesan yang tidak memicu aturan bisa tetap merupakan penipuan dengan pola baru.",
      "Saring tidak dapat memastikan identitas maupun niat pengirim.",
    ],
  };
}