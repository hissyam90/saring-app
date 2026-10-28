export type Severity = "high" | "medium" | "low";

export type FindingCategory =
  | "credential-theft"
  | "urgency-intimidation"
  | "upfront-payment"
  | "unrealistic-promise"
  | "suspicious-link"
  | "impersonation"
  | "risky-instruction"
  | "acquaintance-impersonation"
  | "money-request"
  | "verification-blocking";

export type Classification =
  | "many-signals"
  | "needs-review"
  | "limited-signals";

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  explanation: string;
  evidence: string | null;
  nextStep: string;
}

/** Arahan utama hasil: apa yang sebaiknya dilakukan pengguna sekarang. */
export interface Verdict {
  /** Judul tindakan, mis. "Perlu verifikasi sebelum mengirim uang". */
  title: string;
  /** Satu-dua kalimat alasan yang bisa dibaca tanpa keahlian teknis. */
  summary: string;
  tone: "critical" | "caution" | "neutral";
  /** Langkah konkret dan terurut, diturunkan dari sinyal yang benar-benar ada. */
  actionSteps: string[];
  /** Hal yang tidak dapat dipastikan dari teks saja. */
  uncertainties: string[];
}

export type UrlSignal = "shortened" | "ip-address" | "http";

export interface DetectedUrl {
  url: string;
  host: string;
  displayHint: string;
  signals: UrlSignal[];
}

export interface AnalysisResult {
  isValid: boolean;
  errors: string[];
  classification: Classification;
  classificationLabel: string;
  classificationDescription: string;
  score: number;
  findings: Finding[];
  detectedUrls: DetectedUrl[];
  verdict: Verdict;
}

export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  "credential-theft": "Pencurian kredensial",
  "urgency-intimidation": "Desakan & intimidasi",
  "upfront-payment": "Permintaan pembayaran di muka",
  "unrealistic-promise": "Janji yang tidak realistis",
  "suspicious-link": "Tautan mencurigakan",
  impersonation: "Peniruan pihak resmi",
  "risky-instruction": "Instruksi percakapan berisiko",
  "acquaintance-impersonation": "Penyamaran teman/keluarga",
  "money-request": "Permintaan uang mendadak",
  "verification-blocking": "Upaya menghalangi verifikasi",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  high: 40,
  medium: 25,
  low: 15,
};

export const DISCLAIMER =
  "Tidak ditemukannya sinyal bahaya bukan berarti pesan ini aman. Analisis ini menggunakan aturan heuristik dan dapat melewatkan pola penipuan maupun menandai pesan yang sebenarnya sah.";