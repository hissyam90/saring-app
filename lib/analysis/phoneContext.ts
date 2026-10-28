export type PhoneBehaviorId =
  | "money"
  | "otp"
  | "fee"
  | "link"
  | "threat"
  | "prize"
  | "normal";

export interface PhoneBehavior {
  id: PhoneBehaviorId;
  label: string;
  hint: string;
  weight: number;
}

export const PHONE_BEHAVIORS: PhoneBehavior[] = [
  {
    id: "otp",
    label: "Meminta OTP, PIN, atau kata sandi",
    hint: "Termasuk kode verifikasi atau kode pemulihan",
    weight: 40,
  },
  {
    id: "money",
    label: "Meminta uang atau pinjaman",
    hint: "Transfer, pinjam, atau talangin",
    weight: 30,
  },
  {
    id: "fee",
    label: "Meminta biaya administrasi atau pendaftaran",
    hint: "Biaya agar proses atau hadiah bisa dilanjutkan",
    weight: 30,
  },
  {
    id: "threat",
    label: "Mengancam atau menekan",
    hint: "Akun diblokir, dilaporkan, atau tenggat mendesak",
    weight: 30,
  },
  {
    id: "link",
    label: "Mengirim tautan untuk dibuka",
    hint: "Terutama tautan pendek atau alamat tidak lazim",
    weight: 20,
  },
  {
    id: "prize",
    label: "Mengabarkan menang hadiah",
    hint: "Padahal Anda tidak mengikuti undian",
    weight: 20,
  },
  {
    id: "normal",
    label: "Percakapan biasa, pengirim sudah saya kenal",
    hint: "Tidak ada permintaan data, uang, atau tautan",
    weight: 0,
  },
];

export type VerificationLevel = "high" | "medium" | "low";

export interface PhoneIndicator {
  id: PhoneBehaviorId;
  label: string;
  explanation: string;
  step: string;
}

export interface PhoneAssessment {
  level: VerificationLevel;
  levelLabel: string;
  summary: string;
  indicators: PhoneIndicator[];
  actionSteps: string[];
  uncertainties: string[];
}

const INDICATOR_COPY: Record<
  PhoneBehaviorId,
  { explanation: string; step: string }
> = {
  otp: {
    explanation:
      "Permintaan OTP, PIN, atau kata sandi adalah pola pencurian akun yang paling langsung. Kode tersebut setara kunci akun Anda.",
    step: "Jangan pernah memberikan kode apa pun. Tutup percakapan, lalu hubungi layanan resmi melalui aplikasi atau nomor yang Anda cari sendiri.",
  },
  money: {
    explanation:
      "Permintaan uang dari nomor yang tidak Anda kenal perlu dipastikan lebih dulu. Identitas pemilik nomor belum terbukti dari percakapan.",
    step: "Verifikasi lewat panggilan suara/video ke nomor lama atau akun yang sudah dikenal sebelum mengirim dana.",
  },
  fee: {
    explanation:
      "Biaya di muka untuk pencairan, pendaftaran, atau klaim hadiah adalah pola umum penipuan. Layanan resmi tidak memungut biaya seperti ini lewat pesan pribadi.",
    step: "Jangan membayar. Cek keberadaan program di situs resmi instansi yang disebut.",
  },
  threat: {
    explanation:
      "Ancaman atau desakan waktu dipakai agar Anda bertindak sebelum sempat memeriksa. Ini teknik tekanan, bukan bukti sah mengenai status akun Anda.",
    step: "Jangan panik dan jangan menuruti tenggat. Periksa status akun langsung di aplikasi resmi.",
  },
  link: {
    explanation:
      "Tautan dari nomor tak dikenal bisa mengarah ke halaman tiruan. Struktur tautannya dapat diperiksa lebih dulu tanpa membukanya.",
    step: "Jangan membuka tautan. Salin tautannya dan periksa strukturnya di tab Periksa Tautan.",
  },
  prize: {
    explanation:
      "Kabar menang hadiah untuk undian yang tidak Anda ikuti adalah pola undian bodong yang umum.",
    step: "Abaikan dan blokir. Hadiah sah tidak meminta biaya atau data sensitif lewat pesan pribadi.",
  },
  normal: {
    explanation: "Tidak ada permintaan berisiko yang Anda laporkan.",
    step: "Tidak ada tindakan khusus.",
  },
};

const LEVEL_META: Record<VerificationLevel, { label: string; summary: string }> = {
  high: {
    label: "Perlu verifikasi tinggi sebelum bertindak",
    summary:
      "Perilaku yang Anda pilih termasuk pola yang paling sering dipakai pada penipuan. Jangan menuruti permintaan apa pun sebelum identitas pengirim dipastikan.",
  },
  medium: {
    label: "Sebaiknya diperiksa lebih dulu",
    summary:
      "Ada perilaku yang perlu diwaspadai. Belum tentu penipuan, tetapi sebaiknya Anda memastikan identitas pengirim sebelum melanjutkan.",
  },
  low: {
    label: "Belum ada perilaku berisiko yang menonjol",
    summary:
      "Dari perilaku yang Anda pilih, belum ada indikasi kuat. Ini bukan penilaian reputasi nomor dan bukan jaminan bahwa nomor tersebut aman.",
  },
};

export function assessPhoneBehavior(
  behaviors: PhoneBehaviorId[],
): PhoneAssessment {
  const selected: PhoneBehaviorId[] = behaviors.filter((id) => id !== "normal");
  const score = PHONE_BEHAVIORS.filter((b) => selected.includes(b.id)).reduce(
    (sum, b) => sum + b.weight,
    0,
  );

  const level: VerificationLevel =
    score >= 60 ? "high" : score >= 20 ? "medium" : "low";
  const meta = LEVEL_META[level];

  const indicators: PhoneIndicator[] = selected.map((id) => {
    const behavior = PHONE_BEHAVIORS.find((b) => b.id === id);
    const copy = INDICATOR_COPY[id];
    return {
      id,
      label: behavior?.label ?? id,
      explanation: copy.explanation,
      step: copy.step,
    };
  });

  const actionSteps: string[] = [];
  if (selected.includes("otp")) {
    actionSteps.push(
      "Jangan memberikan OTP, PIN, atau kata sandi — sekarang maupun nanti.",
      "Jika kode sudah terlanjur dikirim, segera ganti kata sandi dan cabut sesi perangkat lain di aplikasi resmi.",
    );
  }
  if (selected.includes("money") || selected.includes("fee")) {
    actionSteps.push(
      "Jangan mentransfer uang sebelum identitas pemilik nomor dipastikan.",
      "Konfirmasi lewat nomor lama atau akun resmi yang Anda cari sendiri, bukan nomor yang mengirim pesan.",
    );
  }
  if (selected.includes("threat")) {
    actionSteps.push(
      "Abaikan tenggat yang dibuat pengirim, lalu periksa status akun Anda di aplikasi resmi.",
    );
  }
  if (selected.includes("link")) {
    actionSteps.push(
      "Jangan membuka tautan; periksa strukturnya lebih dulu di tab Periksa Tautan.",
    );
  }
  if (selected.includes("prize")) {
    actionSteps.push("Abaikan klaim hadiah dan blokir pengirim.");
  }
  actionSteps.push(
    "Simpan tangkapan layar percakapan dan nomor pengirim bila nanti perlu dilaporkan.",
  );

  return {
    level,
    levelLabel: meta.label,
    summary: meta.summary,
    indicators,
    actionSteps,
    uncertainties: [
      "Penilaian ini berdasarkan perilaku yang Anda laporkan, bukan pencarian reputasi nomor.",
      "Saring tidak memiliki data laporan atas nomor ini dan tidak menyatakan nomor tersebut terlapor, bersih, atau aman.",
      "Pemilik nomor bisa berganti; perilaku satu percakapan belum tentu menggambarkan nomor secara keseluruhan.",
    ],
  };
}
