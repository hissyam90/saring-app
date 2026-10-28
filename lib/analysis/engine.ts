import type {
  AnalysisResult,
  Classification,
  DetectedUrl,
  Finding,
  FindingCategory,
  Severity,
} from "./types";
import { DISCLAIMER, SEVERITY_WEIGHT } from "./types";
import { extractUrls } from "./url";

export const MAX_INPUT_LENGTH = 2500;

const CLASSIFICATIONS: Record<
  Classification,
  { label: string; description: string }
> = {
  "many-signals": {
    label: "Banyak sinyal bahaya",
    description:
      "Beberapa indikator penipuan yang kuat ditemukan. Berhenti sejenak dan jangan bertindak sebelum memverifikasi melalui jalur resmi.",
  },
  "needs-review": {
    label: "Perlu diperiksa lebih lanjut",
    description:
      "Ada indikator yang perlu diwaspadai. Periksa kebenarannya melalui saluran resmi sebelum merespons.",
  },
  "limited-signals": {
    label: "Sinyal yang ditemukan masih terbatas",
    description:
      "Indikator bahaya yang dikenali masih sedikit. Ini bukan jaminan bahwa pesan aman — tetap waspada dan verifikasi bila ragu.",
  },
};

let idCounter = 0;

function makeFinding(
  category: FindingCategory,
  severity: Severity,
  title: string,
  explanation: string,
  nextStep: string,
  evidence: string | null = null,
): Finding {
  idCounter += 1;
  return {
    id: `f-${idCounter}`,
    category,
    severity,
    title,
    explanation,
    nextStep,
    evidence,
  };
}

function windowAround(
  text: string,
  index: number,
  length: number,
  radius = 60,
): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  return text.slice(start, end);
}

function evidenceSnippet(text: string, index: number, length: number): string {
  const back = Math.max(0, index - 80);
  const snippetBack = text.slice(back, index);
  const boundary = Math.max(
    snippetBack.lastIndexOf(". "),
    snippetBack.lastIndexOf("! "),
    snippetBack.lastIndexOf("? "),
    snippetBack.lastIndexOf("\n"),
  );
  const start = back + boundary + 1;
  let end = Math.min(text.length, Math.max(start + 180, index + length));
  if (end < text.length) {
    const snippet = text.slice(start, end);
    const positions = [
      snippet.indexOf(". "),
      snippet.indexOf("! "),
      snippet.indexOf("? "),
      snippet.indexOf("\n"),
    ].filter((i) => i >= 0);
    const first = positions.length > 0 ? Math.min(...positions) : -1;
    if (first >= 20) end = start + first;
  }
  const raw = text.slice(start, end).trim();
  if (raw.length > 200) return `${raw.slice(0, 197).trimEnd()}\u2026`;
  return raw;
}

function forEachMatch(
  text: string,
  patterns: RegExp[],
  onMatch: (match: RegExpExecArray) => void,
): void {
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      onMatch(match);
    }
  }
}

const CREDENTIAL_TERMS = [
  /kode\s*otp/,
  /\botp\b/,
  /one-?time\s*pass/,
  /kode\s*verif/,
  /kode\s*konfirmasi/,
  /kode\s*rahasia/,
  /kode\s*pemulihan/,
  /recovery\s*code/,
  /kata\s*sandi/,
  /password/,
  /\bpin\b/,
  /\bcvv\b/,
  /\bcvc\b/,
  /nomor\s*kartu/,
  /kode\s*aktivasi/,
  /kode\s*akses/,
];

const DEMAND_VERBS =
  /(kirim|berikan|beri(?:kan)?|bagikan|berbagi|sebutkan|masuk(?:kan)?|isi(?:kan)?|ketik(?:kan)?|konfirmasi|verifikasi|validasi|aktivasi|share|forward|send|give|enter|input|confirm|verify|type|reply|balas(?:kan)?)/i;

const PROTECTIVE_CREDENTIAL =
  /(jangan|jangan\s*pernah|hindari|waspada(?:i|lah)?|hati-?hati|awas|dilarang|tolak|jangan\s*(?:bagikan|berikan|kirim|share|beri|balas))/i;

function credentialRule(text: string): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, CREDENTIAL_TERMS, (match) => {
    const span = windowAround(text, match.index, match[0].length);
    if (PROTECTIVE_CREDENTIAL.test(span)) return;
    if (!DEMAND_VERBS.test(span)) return;
    out.push(
      makeFinding(
        "credential-theft",
        "high",
        "Permintaan kode rahasia atau kredensial",
        "Pesan tampak meminta kode OTP, PIN, kata sandi, atau kode verifikasi. Institusi resmi tidak meminta kode rahasia kepada pengguna.",
        "Jangan berikan kode apa pun. Konfirmasi langsung ke layanan resmi melalui aplikasi atau situsnya.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  });
  return out;
}

const ACCOUNT_THREAT = [
  /(?:akun|rekening|account|dompet|sald[aou])[\s\S]{0,40}?(?:diblokir|dibekukan|dinonaktifkan|ditangguhkan|dihapus|ditutup|dibatasi|terblokir)/,
  /(?:diblokir|dibekukan|dinonaktifkan|ditangguhkan)[\s\S]{0,20}?(?:akun|rekening|dompet)/,
  /(?:dilaporkan|dituntut|diseret|dibawa)\s*ke\s*(?:polisi|pihak\s*berwajib|meja\s*hijau)/,
  /(?:ancaman|terancam)\s*(?:hukuman|denda|pidana|sanksi|penjara)/,
];

function accountThreatRule(text: string): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, ACCOUNT_THREAT, (match) => {
    out.push(
      makeFinding(
        "urgency-intimidation",
        "high",
        "Ancaman pemblokiran akun atau sanksi",
        "Pesan menggunakan ancaman pemblokiran akun atau akibat hukum untuk menekan Anda bertindak cepat tanpa memverifikasi.",
        "Jangan panik. Periksa status akun langsung melalui aplikasi atau situs resmi, bukan lewat tautan di pesan ini.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  });
  return out;
}

const DEADLINE_PRESSURE = [
  /kesempatan\s*terakhir/,
  /(?:batas\s*waktu|tenggat|deadline)\s*(?:terakhir|segera|besok|hari\s*ini)/,
  /segera\s*(?:sekarang|kirim|konfirmasi|verifikasi|aktivasi|transfer|bayar|balas)/,
  /(?:sekarang\s*juga|hari\s*ini\s*(?:juga|terakhir|saja))/,
  /sebelum\s*(?:besok|akhir\s*hari\s*ini)/,
  /(?:immediately|right\s*now|hurry|urgent)/,
];

function deadlinePressureRule(text: string): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, DEADLINE_PRESSURE, (match) => {
    out.push(
      makeFinding(
        "urgency-intimidation",
        "medium",
        "Tekanan waktu untuk bertindak",
        "Pesan menekan Anda untuk bertindak cepat atau sebelum batas waktu, tanpa memberi ruang untuk memverifikasi.",
        "Luangkan waktu. Klaim, promo, atau peringatan resmi tidak menuntut respons dalam hitungan menit.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  });
  return out;
}

const UPFRONT_PAYMENT = [
  /(?:biaya|fee|charge)\s*(?:administrasi|admin|pendaftaran|registrasi|rekrutmen|training|pelatihan|aktivasi|verifikasi|pengiriman|penanganan|klaim|seragam|materai|cetak\s*kartu|proses|seleksi)/,
  /(?:uang|dana|biaya)\s*(?:muka|pendaftaran|jaminan|deposit)/,
  /(?:bayar|transfer|kirim|setor)[\s\S]{0,30}?(?:biaya|fee)[\s\S]{0,20}?(?:administrasi|admin|pendaftaran|registrasi|rekrutmen|aktivasi|klaim|seragam|seleksi|proses)/,
  /(?:biaya|uang)\s*klaim\s*hadiah/,
  /(?:bayar|setor|transfer)\s*(?:dulu|terlebih\s*dahulu|sebelum\s*(?:diterima|diproses|diwawancara|dikirim|diklaim))/,
  /(?:admin\s*fee|biaya\s*admin)/,
];

const PROTECTIVE_PAYMENT =
  /(?:tidak\s*ada|tanpa|gratis|bebas\s*biaya|tidak\s*dipungut|tanpa\s*biaya|no\s*fee)/i;

function upfrontPaymentRule(text: string): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, UPFRONT_PAYMENT, (match) => {
    const span = windowAround(text, match.index, match[0].length);
    if (PROTECTIVE_PAYMENT.test(span)) return;
    out.push(
      makeFinding(
        "upfront-payment",
        "high",
        "Permintaan pembayaran di muka",
        "Pesan meminta biaya (administrasi, pendaftaran, aktivasi, atau klaim) sebelum proses berjalan. Ini pola umum lowongan palsu dan undian bodong.",
        "Loker resmi dan hadiah sah tidak meminta pembayaran di muka. Jangan transfer, dan laporkan jika sudah terlanjur.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  });
  return out;
}

const GUARANTEED_RETURNS = [
  /(?:dijamin|jaminan)[\s\S]{0,25}?(?:untung|profit|balik|menguntungkan|keuntungan|hasil)/,
  /(?:pasti|dijamin|jaminan)[\s\S]{0,15}?(?:untung|profit|balik\s*modal|cuan|menguntungkan)/,
  /(?:untung|profit|keuntungan|return|imbal\s*hasil)[\s\S]{0,15}?(?:pasti|tetap|dijamin|tinggi|besar)/,
  /(?:tanpa\s*risiko|bebas\s*risiko|nol\s*risiko|risk-?free|guaranteed)/,
  /berlipat\s*ganda|(?:dua|tiga|2x|3x|10x)\s*kali\s*lipat/,
  /bunga\s*(?:tinggi|pasti|tetap)\s*(?:%|persen)?/,
  /100%\s*(?:aman|dijamin|untung|balik\s*modal)/,
  /cuan\s*(?:besar|pasti|instan)/,
];

function guaranteeRule(text: string): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, GUARANTEED_RETURNS, (match) => {
    out.push(
      makeFinding(
        "unrealistic-promise",
        "high",
        "Janji keuntungan yang dijamin",
        "Pesan menjanjikan keuntungan, imbal hasil, atau pengembalian yang pasti dan tinggi. Tidak ada investasi sah yang bisa menjamin untung.",
        "Waspadai tawaran investasi yang menjanjikan keuntungan pasti. Cek legalitas di situs resmi OJK sebelum menaruh dana.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  });
  return out;
}

const PRIZE_LURE = [
  /selamat[\s\S]{0,25}?(?:menang|memenangkan|terpilih|mendapat(?:kan)?\s*hadiah)/,
  /(?:memenangkan|mendapatkan)[\s\S]{0,20}?(?:hadiah|undian|giveaway|prize)/,
  /hadiah\s*(?:mobil|motor|iphone|samsung|umroh|uang\s*tunai|emas|voucher|jutaan)/,
  /(?:klaim|ambil)\s*(?:hadiah|bonus|voucher)\s*(?:anda|kamu|mu)?/,
];

function prizeLureRule(text: string): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, PRIZE_LURE, (match) => {
    out.push(
      makeFinding(
        "unrealistic-promise",
        "medium",
        "Klaim hadiah atau undian",
        "Pesan mengumumkan kemenangan atau hadiah yang tidak Anda ikuti. Iming-iming hadiah sering dipakai untuk memancing korban memberi data atau membayar.",
        "Jika Anda tidak pernah mengikuti undian, abaikan. Jangan klik tautan atau membayar untuk mengklaim hadiah.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  });
  return out;
}

function linkRule(urls: DetectedUrl[]): Finding[] {
  const out: Finding[] = [];
  for (const url of urls) {
    if (url.signals.includes("ip-address")) {
      out.push(
        makeFinding(
          "suspicious-link",
          "medium",
          "Tautan memakai alamat IP langsung",
          `Tautan mengarah ke alamat IP numerik (${url.host}) alih-alih nama domain yang wajar. Ini sering dipakai untuk menyembunyikan tujuan sebenarnya.`,
          "Jangan klik. Jika perlu, ketik alamat resmi layanan secara manual di peramban.",
          url.url,
        ),
      );
    }
    if (url.signals.includes("shortened")) {
      out.push(
        makeFinding(
          "suspicious-link",
          "medium",
          "Tautan pendek (shortened URL)",
          `Tautan memakai layanan penyingkat (${url.host}) sehingga tujuan aslinya tersembunyi.`,
          "Jangan klik. Minta tautan asli kepada pengirim, atau ketik alamat resmi secara manual.",
          url.url,
        ),
      );
    }
    if (url.signals.includes("http")) {
      out.push(
        makeFinding(
          "suspicious-link",
          "low",
          "Tautan tidak memakai HTTPS",
          `Tautan memakai protokol http (bukan https): ${url.url}. Koneksinya tidak terenkripsi.`,
          "Gunakan situs https. Jangan memasukkan data sensitif pada halaman http.",
          url.url,
        ),
      );
    }
  }
  return out;
}

const BRAND_TOKENS =
  /\b(?:bank|bca|bri|bni|mandiri|cimb|bsi|danamon|ovo|gopay|dana|shopeepay|shopee|tokopedia|lazada|gojek|pln|bpjs|pajak|bea\s*cukai|ojk|kominfo|polri|polisi|jasa\s*raharja|telkomsel|indosat|xl|klikbca)\b/i;

const AUTHORITY_CLAIMS = [
  /(?:petugas|admin|pihak|perwakilan|staf|cs|official)[\s\S]{0,12}?(?:resmi\s*)?(?:dari\s*)?(?:bank|bca|bri|bni|mandiri|cimb|bsi|danamon|ovo|gopay|dana|shopeepay|shopee|tokopedia|lazada|gojek|pln|bpjs|pajak|ojk|kominfo|polri|polisi|jasa\s*raharja|telkomsel|indosat|xl)/,
  /(?:atas\s*nama|mewakili)[\s\S]{0,15}?(?:bank|bca|bri|bni|mandiri|cimb|bsi|danamon|ovo|gopay|dana|shopee|tokopedia|lazada|gojek|pln|bpjs|pajak|ojk|kominfo)/,
];

const SUSPICIOUS_MARKER =
  /verifikasi|konfirmasi|login|reset|update|keamanan|secure|hadiah|klaim|akun|bonus|dana/i;

function impersonationRule(text: string, urls: DetectedUrl[]): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, AUTHORITY_CLAIMS, (match) => {
    out.push(
      makeFinding(
        "impersonation",
        "medium",
        "Mengaku sebagai pihak resmi",
        "Pesan mengklaim berasal dari institusi atau petugas resmi. Penipu kerap menyamar sebagai bank, marketplace, atau lembaga pemerintah.",
        "Hindari mengikuti instruksi dari pesan ini. Hubungi institusi melalui nomor atau kanal resmi yang Anda cari sendiri.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  });

  for (const url of urls) {
    if (!BRAND_TOKENS.test(url.host)) continue;
    if (!SUSPICIOUS_MARKER.test(url.host)) continue;
    out.push(
      makeFinding(
        "impersonation",
        "low",
        "Domain menyerupai layanan resmi",
        `Domain ${url.host} memuat nama layanan populer beserta kata kunci keamanan/klaim. Periksa dengan saksama apakah ini alamat resmi.`,
        "Bandingkan dengan alamat situs resmi sebelum memasukkan data apa pun.",
        url.url,
      ),
    );
  }
  return out;
}

const RISKY_INSTRUCTIONS = [
  /(?:pindah|lanjut(?:kan)?|hubungi|chat|balas)\s*(?:ke|via|melalui|di)\s*(?:whatsapp|wa\b|telegram|line|dm|pesan\s*pribadi|nomor\s*pribadi|akun\s*pribadi|luar\s*aplikasi|di\s*luar\s*aplikasi|link\s*di\s*bawah|jalur\s*pribadi)/,
  /(?:bayar|transfer|kirim)\s*(?:langsung|dana)?\s*ke\s*(?:rekening|no\.?\s*rek|nomor\s*rekening)\s*(?:pribadi|perorangan|atas\s*nama)/,
  /(?:bayar|transfer|kirim)[\s\S]{0,20}?(?:di|dari)\s*luar\s*(?:aplikasi|sistem|platform)/,
  /(?:lewati|abaikan|skip|bypass)[\s\S]{0,15}?(?:verifikasi|escrow|rekber|rekening\s*bersama|proses\s*verifikasi)/,
  /jangan\s*(?:lewat|pakai|gunakan|melalui)\s*(?:aplikasi|sistem|platform|escrow|rekber|verifikasi)/,
];

const PROTECTIVE_RISKY =
  /(?:jangan\s*pernah|hindari|waspadai|waspadalah|ingatlah|selalu\s*verifikasi|tips\s*aman|edukasi)/i;

function riskyInstructionRule(text: string): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, RISKY_INSTRUCTIONS, (match) => {
    const span = windowAround(text, match.index, match[0].length);
    if (PROTECTIVE_RISKY.test(span)) return;
    out.push(
      makeFinding(
        "risky-instruction",
        "high",
        "Instruksi mengalihkan transaksi atau memotong verifikasi",
        "Pesan mengarahkan Anda pindah ke kanal tidak resmi atau melewati verifikasi/escrow — langkah yang menyulitkan pelacakan dan pengembalian.",
        "Tetap bertransaksi di dalam aplikasi/sistem resmi. Jangan pindah ke percakapan pribadi atas permintaan pengirim.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  });
  return out;
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const finding of findings) {
    const key = `${finding.category}::${finding.evidence ?? finding.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(finding);
  }
  return out;
}

function classify(score: number): Classification {
  if (score >= 70) return "many-signals";
  if (score >= 35) return "needs-review";
  return "limited-signals";
}

function buildResult(
  isValid: boolean,
  errors: string[],
  score: number,
  findings: Finding[],
  detectedUrls: DetectedUrl[],
): AnalysisResult {
  const classification = classify(score);
  const meta = CLASSIFICATIONS[classification];
  return {
    isValid,
    errors,
    classification,
    classificationLabel: meta.label,
    classificationDescription: meta.description,
    score,
    findings,
    detectedUrls,
  };
}

export function analyzeText(text: string): AnalysisResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return buildResult(
      false,
      ["Masukkan pesan yang ingin diperiksa terlebih dahulu."],
      0,
      [],
      [],
    );
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return buildResult(
      false,
      [`Pesan melebihi batas ${MAX_INPUT_LENGTH} karakter.`],
      0,
      [],
      [],
    );
  }

  idCounter = 0;
  const urls = extractUrls(trimmed);
  const findings: Finding[] = [
    ...credentialRule(trimmed),
    ...accountThreatRule(trimmed),
    ...deadlinePressureRule(trimmed),
    ...upfrontPaymentRule(trimmed),
    ...guaranteeRule(trimmed),
    ...prizeLureRule(trimmed),
    ...linkRule(urls),
    ...impersonationRule(trimmed, urls),
    ...riskyInstructionRule(trimmed),
  ];

  const deduped = dedupeFindings(findings);
  const score = Math.min(
    100,
    deduped.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0),
  );

  return buildResult(true, [], score, deduped, urls);
}

export { DISCLAIMER };