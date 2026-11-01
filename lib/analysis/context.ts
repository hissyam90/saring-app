/**
 * Utilitas konteks tingkat klausa.
 *
 * Mesin lama memeriksa jendela ±60 karakter di sekitar kata kunci. Cara itu
 * membuat satu kata "jangan" menetralkan seluruh pesan, atau satu kata kerja
 * permintaan menyeret kalimat naratif. Di sini aturan dinilai per klausa:
 * satu kalimat/pernyataan yang dipisahkan tanda baca atau kata sambung
 * pertentangan ("tapi", "namun", dst.).
 */

export interface Clause {
  text: string;
  start: number;
  end: number;
}

const BOUNDARY =
  /(?:[.!?;]+|\n+|:\s+|\s*,\s*(?:tapi|namun|tetapi|padahal|sedangkan|sementara\s+itu|walaupun|meskipun|kecuali)\b)/gi;

function pushClause(out: Clause[], text: string, start: number, end: number): void {
  const raw = text.slice(start, end);
  const leading = raw.length - raw.trimStart().length;
  const trimmed = raw.trim();
  if (!trimmed) return;
  out.push({
    text: trimmed,
    start: start + leading,
    end: start + leading + trimmed.length,
  });
}

export function splitClauses(text: string): Clause[] {
  const clauses: Clause[] = [];
  let start = 0;
  BOUNDARY.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BOUNDARY.exec(text)) !== null) {
    pushClause(clauses, text, start, match.index);
    start = match.index + match[0].length;
  }
  pushClause(clauses, text, start, text.length);
  return clauses;
}

/** Klausa yang memuat posisi tertentu; jatuh ke seluruh teks bila tidak ketemu. */
export function clauseContaining(clauses: Clause[], index: number): string {
  for (const clause of clauses) {
    if (index >= clause.start && index < clause.end) return clause.text;
  }
  return clauses.length === 1 ? clauses[0].text : "";
}

/**
 * Penanda protektif: perintah untuk tidak melakukan sesuatu, atau penyangkalan
 * bahwa pihak resmi meminta data. Hanya berlaku pada klausa yang sama.
 */
const PROTECTIVE =
  /(?:\bjangan(?:\s+pernah)?\b|\bhindari\b|\bwaspada(?:i|lah)?\b|\bhati-?hati\b|\bawas\b|\bdilarang\b|\btolak\b|\btidak\s+(?:pernah|akan)\s+meminta\b|\bkami\s+tidak\s+meminta\b|\btidak\s+perlu\s+(?:memberikan|membagikan|mengirim|mengisi)\b|\btanpa\s+biaya\b|\btidak\s+dipungut\b)/i;

/**
 * Penanda kalimat yang membicarakan penipuan (bukan melakukan), mis.
 * "pelaku biasanya bilang…", "contoh modus", "menurut artikel".
 */
const REPORTED =
  /(?:\bbilang\b|\bberkata\b|\bmengatakan\b|\bkatanya\b|\bcontoh\b|\bmodus\b|\bedukasi\b|\bartikel\b|\btips\b|\bbiasanya\b|\bsering\b|\bmenurut\b|\bpenjelasan\b|\bmenceritakan\b|\bkasus\b)/i;

/** Narasi lampau orang pertama: "kemarin saya kirim kode OTP…". */
const PAST_FIRST_PERSON =
  /\b(?:saya|aku|gue|gw|sy)\s+(?:sudah|udah|telah|pernah|sempat|baru\s+saja)?\s*(?:kirim|beri|kasih|bagikan|isi|ketik|konfirmasi|verifikasi|transfer|bayar|ambil|klaim)\b/i;

const PAST_TIME =
  /\b(?:kemarin|tadi|semalam|minggu\s+lalu|bulan\s+lalu|tahun\s+lalu|sebelumnya|dulu)\b/i;

export function isProtective(clause: string): boolean {
  return PROTECTIVE.test(clause);
}

export function isReportedSpeech(clause: string): boolean {
  return REPORTED.test(clause);
}

export function isPastNarrative(clause: string): boolean {
  if (PAST_FIRST_PERSON.test(clause)) return true;
  return (
    PAST_TIME.test(clause) &&
    /(?:kirim|beri|kasih|bagikan|transfer|bayar|ambil|klaim|isi)/i.test(clause)
  );
}

/** Kata kerja/permintaan yang meminta pembaca melakukan sesuatu. */
export const DEMAND_VERBS =
  /\b(?:kirim(?:kan)?|berikan|beri|bagikan|berbagi|sebutkan|sebut|infokan|info|kasih\s*(?:tau|tahu)|masukkan|isikan|isi|ketik(?:kan)?|konfirmasi|verifikasi|validasi|aktivasi|share|forward|send|give|enter|input|confirm|verify|type|reply|balas(?:kan)?|minta|diminta|butuh|berapa(?:kah)?)\b/i;

export function hasDemandVerb(clause: string): boolean {
  return DEMAND_VERBS.test(clause);
}