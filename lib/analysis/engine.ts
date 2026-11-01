import type {
  AnalysisResult,
  Classification,
  DetectedUrl,
  Finding,
  FindingCategory,
  Severity,
  Verdict,
} from "./types";
import { DISCLAIMER, SEVERITY_WEIGHT } from "./types";
import { extractUrls } from "./url";
import { inspectLink } from "./link";
import type { LinkInspection } from "./link";
import { analyzeSocialEngineering } from "./socialEngineering";
import { buildVerdict } from "./verdict";
import {
  clauseContaining,
  hasDemandVerb,
  isPastNarrative,
  isProtective,
  isReportedSpeech,
  splitClauses,
} from "./context";
import type { Clause } from "./context";

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
      "Indikator bahaya yang dikenali masih sedikit. Ini bukan jaminan bahwa pesan aman. tetap waspada dan verifikasi bila ragu.",
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
  /\b0tp\b/,
  /\bo\s*t\s*p\b/,
  /one-?time\s*pass/,
  /kode\s*verif/,
  /kode\s*konfirmasi/,
  /kode\s*rahasia/,
  /kode\s*pemulihan/,
  /kode\s*pengaman/,
  /kode\s*unik/,
  /kode\s*(?:\d{1,2}\s*)?(?:digit|angka)\b/,
  /kode\s+(?:yang\s+)?(?:baru\s+)?(?:masuk|dikirim|datang|diterima)\b/,
  /recovery\s*code/,
  /kata\s*sandi/,
  /password/,
  /\bpin\b/,
  /\bcvv\b/,
  /\bcvc\b/,
  /(?:data|nomor|no\.?)\s*kartu/,
  /\bkartu\s*(?:kredit|debit|atm)\b/,
  /\bmasa\s*berlaku\b/,
  /kode\s*aktivasi/,
  /kode\s*akses/,
];

const PROTECTIVE_CREDENTIAL =
  /(?:jangan|jangan\s*pernah|hindari|waspada(?:i|lah)?|hati-?hati|awas|dilarang|tolak|tidak\s*(?:pernah|akan)\s*meminta|kami\s*tidak\s*meminta)/i;

function credentialRule(text: string, clauses: Clause[]): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, CREDENTIAL_TERMS, (match) => {
    const clause = clauseContaining(clauses, match.index) || text;
    // Protektif diperiksa pada klausa yang sama, bukan seluruh pesan:
    // "Jangan bagikan OTP." tidak boleh menetralkan "kirim OTP kamu" di
    // kalimat berikutnya.
    if (PROTECTIVE_CREDENTIAL.test(clause)) return;
    if (isReportedSpeech(clause)) return;
    if (isPastNarrative(clause)) return;
    if (!hasDemandVerb(clause)) return;
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

function accountThreatRule(
  text: string,
  clauses: Clause[],
  escalate: boolean,
): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, ACCOUNT_THREAT, (match) => {
    const clause = clauseContaining(clauses, match.index) || text;
    // Edukasi ("penipu biasanya bilang akun Anda diblokir") bukan ancaman.
    if (isProtective(clause) || isReportedSpeech(clause)) return;
    out.push(
      makeFinding(
        "urgency-intimidation",
        escalate ? "high" : "medium",
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

function deadlinePressureRule(text: string, clauses: Clause[]): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, DEADLINE_PRESSURE, (match) => {
    const clause = clauseContaining(clauses, match.index) || text;
    if (isProtective(clause) || isReportedSpeech(clause)) return;
    out.push(
      makeFinding(
        "urgency-intimidation",
        "low",
        "Tekanan waktu untuk bertindak",
        "Pesan menekan Anda untuk bertindak cepat atau sebelum batas waktu, tanpa memberi ruang untuk memverifikasi.",
        "Luangkan waktu. Klaim, promo, atau peringatan resmi tidak menuntut respons dalam hitungan menit.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  });
  return out;
}

const UPFRONT_STRONG = [
  /(?:biaya|fee|charge)\s*(?:administrasi|pendaftaran|registrasi|rekrutmen|training|pelatihan|aktivasi|verifikasi|pengiriman|penanganan|klaim|seragam|materai|cetak\s*kartu|proses|seleksi)/,
  /(?:uang|dana|biaya)\s*(?:muka|pendaftaran|jaminan|deposit)/,
  /(?:biaya|uang)\s*klaim\s*hadiah/,
  /(?:bayar|setor|transfer)\s*(?:dulu|terlebih\s*dahulu|sebelum\s*(?:diterima|diproses|diwawancara|dikirim|diklaim))/,
];

/** "Biaya admin" saja terlalu umum (mis. informasi biaya transfer bank). */
const UPFRONT_WEAK = [/(?:\badmin\s*fee\b|\bbiaya\s*admin\b)/];

const PAYMENT_DEMAND =
  /(?:bayar|setor|transfer|kirim)\s*(?:biaya|fee|dana|uang|rp\s*\d)|(?:bayar|setor|transfer)\s*(?:ke|dulu|sekarang|sebelum)\b/i;

const PROTECTIVE_PAYMENT =
  /(?:tidak\s*ada|tanpa|gratis|bebas\s*biaya|tidak\s*dipungut|tidak\s*memungut|tanpa\s*biaya|no\s*fee)/i;

function upfrontPaymentRule(text: string, clauses: Clause[]): Finding[] {
  const out: Finding[] = [];
  const add = (match: RegExpExecArray, severity: Severity) => {
    out.push(
      makeFinding(
        "upfront-payment",
        severity,
        "Permintaan pembayaran di muka",
        "Pesan meminta biaya (administrasi, pendaftaran, aktivasi, atau klaim) sebelum proses berjalan. Ini pola umum lowongan palsu dan undian bodong.",
        "Loker resmi dan hadiah sah tidak meminta pembayaran di muka. Jangan transfer, dan laporkan jika sudah terlanjur.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  };

  forEachMatch(text, UPFRONT_STRONG, (match) => {
    const clause = clauseContaining(clauses, match.index) || text;
    if (PROTECTIVE_PAYMENT.test(clause) || isReportedSpeech(clause)) return;
    add(match, "high");
  });

  forEachMatch(text, UPFRONT_WEAK, (match) => {
    const clause = clauseContaining(clauses, match.index) || text;
    if (PROTECTIVE_PAYMENT.test(clause) || isReportedSpeech(clause)) return;
    // "Biaya admin" baru menjadi sinyal bila ada perintah membayar.
    if (!PAYMENT_DEMAND.test(clause)) return;
    add(match, "medium");
  });

  return out;
}

const GUARANTEED_RETURNS = [
  /(?:dijamin|jaminan)[\s\S]{0,25}?(?:untung|profit|balik|menguntungkan|keuntungan|hasil)/,
  /(?:pasti|dijamin|jaminan)[\s\S]{0,15}?(?:untung|profit|balik\s*modal|cuan|menguntungkan)/,
  /(?:untung|profit|keuntungan|return|imbal\s*hasil)[\s\S]{0,15}?(?:pasti|tetap|dijamin|tinggi|besar)/,
  /(?:tanpa\s*risiko|bebas\s*risiko|nol\s*risiko|risk-?free|guaranteed)/,
  /berlipat\s*ganda|(?:dua|tiga|2x|3x|10x)\s*kali\s*lipat/,
  /100%\s*(?:aman|dijamin|untung|balik\s*modal)/,
  /cuan\s*(?:besar|pasti|instan)/,
];

/** Konteks investasi membuat klaim "untung pasti" jauh lebih relevan. */
const INVESTMENT_CONTEXT =
  /(?:investasi|invest|saham|crypto|kripto|trading|deposit|modal|profit|imbal\s*hasil|reksadana|forex|robot\s*trading|passive\s*income)/i;

const RETURN_WORDS =
  /(?:untung|profit|keuntungan|return|imbal\s*hasil|cuan|balik\s*modal)/i;

function guaranteeRule(text: string, clauses: Clause[]): Finding[] {
  const out: Finding[] = [];
  const investment = INVESTMENT_CONTEXT.test(text);
  forEachMatch(text, GUARANTEED_RETURNS, (match) => {
    const clause = clauseContaining(clauses, match.index) || text;
    if (isProtective(clause) || isReportedSpeech(clause)) return;
    // Satu frasa "tanpa risiko" pada konteks non-investasi tidak cukup
    // untuk dinilai sama seriusnya dengan janji imbal hasil.
    const severity: Severity = investment
      ? "high"
      : RETURN_WORDS.test(clause)
        ? "medium"
        : "low";
    out.push(
      makeFinding(
        "unrealistic-promise",
        severity,
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

function prizeLureRule(
  text: string,
  clauses: Clause[],
  comboSinyal: boolean,
): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, PRIZE_LURE, (match) => {
    const clause = clauseContaining(clauses, match.index) || text;
    if (isProtective(clause) || isReportedSpeech(clause)) return;
    // "Aku ambil hadiahnya besok" adalah cerita, bukan tawaran.
    if (isPastNarrative(clause)) return;
    out.push(
      makeFinding(
        "unrealistic-promise",
        comboSinyal ? "medium" : "low",
        "Klaim hadiah atau undian",
        "Pesan mengumumkan kemenangan atau hadiah yang tidak Anda ikuti. Iming-iming hadiah sering dipakai untuk memancing korban memberi data atau membayar.",
        "Jika Anda tidak pernah mengikuti undian, abaikan. Jangan klik tautan atau membayar untuk mengklaim hadiah.",
        evidenceSnippet(text, match.index, match[0].length),
      ),
    );
  });
  return out;
}

const SEVERITY_STEPS: Severity[] = ["low", "medium", "high"];

function escalate(severity: Severity): Severity {
  const index = SEVERITY_STEPS.indexOf(severity);
  return SEVERITY_STEPS[Math.min(index + 1, SEVERITY_STEPS.length - 1)];
}

/**
 * Pemeriksaan tautan pada pesan memakai inspeksi struktural yang sama dengan
 * mode Periksa Tautan (`inspectLink`), sehingga domain mirip layanan resmi,
 * subdomain menyesatkan, dan userinfo ikut terdeteksi. Tautan tidak pernah
 * dibuka atau diikuti redirect.
 */
function linkRule(
  inspections: Array<{ url: DetectedUrl; inspection: LinkInspection }>,
  escalateSeverity: boolean,
): Finding[] {
  const out: Finding[] = [];
  for (const { url, inspection } of inspections) {
    for (const finding of inspection.findings) {
      out.push(
        makeFinding(
          "suspicious-link",
          escalateSeverity ? escalate(finding.severity) : finding.severity,
          finding.title,
          finding.explanation,
          finding.nextStep,
          finding.evidence || url.url,
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

function impersonationRule(
  text: string,
  urls: DetectedUrl[],
  clauses: Clause[],
): Finding[] {
  const out: Finding[] = [];
  forEachMatch(text, AUTHORITY_CLAIMS, (match) => {
    const clause = clauseContaining(clauses, match.index) || text;
    // "Penipu sering mengaku sebagai petugas bank" adalah edukasi.
    if (isProtective(clause) || isReportedSpeech(clause)) return;
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
        "Pesan mengarahkan Anda pindah ke kanal tidak resmi atau melewati verifikasi/escrow. langkah yang menyulitkan pelacakan dan pengembalian.",
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
  verdict: Verdict,
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
    verdict,
  };
}

const EMPTY_VERDICT: Verdict = {
  title: "Belum ada pesan untuk diperiksa",
  summary: "Masukkan isi pesan terlebih dahulu.",
  tone: "neutral",
  actionSteps: [],
  uncertainties: [],
};

export function analyzeText(text: string): AnalysisResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return buildResult(
      false,
      ["Masukkan pesan yang ingin diperiksa terlebih dahulu."],
      0,
      [],
      [],
      EMPTY_VERDICT,
    );
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return buildResult(
      false,
      [`Pesan melebihi batas ${MAX_INPUT_LENGTH} karakter.`],
      0,
      [],
      [],
      {
        ...EMPTY_VERDICT,
        title: "Pesan terlalu panjang",
        summary: `Pangkas pesan hingga di bawah ${MAX_INPUT_LENGTH} karakter.`,
      },
    );
  }

  idCounter = 0;
  const clauses = splitClauses(trimmed);
  const urls = extractUrls(trimmed);
  const inspections = urls.map((url) => ({
    url,
    inspection: inspectLink(url.url),
  }));
  const social = analyzeSocialEngineering(trimmed);

  const credentialFindings = credentialRule(trimmed, clauses);
  const hasCredentials = credentialFindings.length > 0;
  const suspiciousLinks = inspections.some(
    (item) => item.inspection.findings.length > 0,
  );

  // Ancaman akun saja tidak dinilai setinggi ancaman yang menyertai permintaan
  // kredensial, uang, atau tautan mencurigakan.
  const threatFindings = accountThreatRule(
    trimmed,
    clauses,
    hasCredentials || social.moneyPattern || suspiciousLinks,
  );
  const upfrontFindings = upfrontPaymentRule(trimmed, clauses);

  const findings: Finding[] = [
    ...social.findings,
    ...credentialFindings,
    ...threatFindings,
    ...deadlinePressureRule(trimmed, clauses),
    ...upfrontFindings,
    ...guaranteeRule(trimmed, clauses),
    ...prizeLureRule(
      trimmed,
      clauses,
      suspiciousLinks || hasCredentials || upfrontFindings.length > 0,
    ),
    ...linkRule(
      inspections,
      hasCredentials || threatFindings.length > 0 || social.moneyPattern,
    ),
    ...impersonationRule(trimmed, urls, clauses),
    ...riskyInstructionRule(trimmed),
  ];

  const deduped = dedupeFindings(findings);
  const score = Math.min(
    100,
    deduped.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0),
  );
  const classification = classify(score);
  const verdict = buildVerdict(deduped, social, classification);

  return buildResult(true, [], score, deduped, urls, verdict);
}

export { DISCLAIMER };