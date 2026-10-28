/**
 * LEGACY. Adapter PhishTank tidak lagi dipakai di jalur runtime sejak
 * Google Safe Browsing v5 menjadi provider utama (`googleSafeBrowsing.ts`).
 *
 * Alasan ditinggalkan: endpoint checkurl menolak permintaan tanpa app key
 * dengan HTTP 403, sehingga lookup hampir selalu gagal bagi pengguna.
 *
 * File ini disimpan sebagai rujukan sejarah dan tidak diimpor oleh route
 * maupun komponen. Jangan menghidupkannya kembali tanpa credential valid.
 */
export type PhishTankStatus =
  | "match"
  | "no-match"
  | "rate-limited"
  | "unauthorized"
  | "http-error"
  | "timeout"
  | "invalid-response";

export interface PhishTankLookup {
  provider: "PhishTank";
  status: PhishTankStatus;
  matched: boolean;
  verified: boolean | null;
  valid: boolean | null;
  detailUrl?: string;
  checkedAt: string;
  message: string;
  /** Apakah permintaan dikirim dengan app key. Memengaruhi batas permintaan. */
  usedKey: boolean;
  /** Kode HTTP bila ada, untuk diagnosa. Tidak pernah berisi kredensial. */
  httpStatus?: number;
  /** True bila hasil ini tidak boleh dipakai menarik kesimpulan apa pun. */
  inconclusive: boolean;
}

const ENDPOINT = "https://checkurl.phishtank.com/checkurl/";
const USER_AGENT = "Saring/2.0 (MIT-WEEK 2026 digital safety utility)";
const TIMEOUT_MS = 8000;

function boolValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "y" || value === "yes" || value === "true") return true;
  if (value === "n" || value === "no" || value === "false") return false;
  return null;
}

function base(
  status: PhishTankStatus,
  message: string,
  usedKey: boolean,
  extra: Partial<PhishTankLookup> = {},
): PhishTankLookup {
  return {
    provider: "PhishTank",
    status,
    matched: false,
    verified: null,
    valid: null,
    checkedAt: new Date().toISOString(),
    message,
    usedKey,
    inconclusive: status !== "match" && status !== "no-match",
    ...extra,
  };
}

export async function lookupPhishTank(
  url: string,
  appKey?: string,
): Promise<PhishTankLookup> {
  const usedKey = Boolean(appKey);
  const body = new URLSearchParams({ url, format: "json" });
  if (appKey) body.set("app_key", appKey);

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return base(
        "timeout",
        "PhishTank tidak merespons dalam 8 detik. Ini bukan hasil “aman” — reputasi URL belum diperiksa.",
        usedKey,
      );
    }
    return base(
      "http-error",
      "Koneksi ke PhishTank gagal. Reputasi URL belum diperiksa.",
      usedKey,
    );
  }

  if (response.status === 509) {
    return base(
      "rate-limited",
      usedKey
        ? "PhishTank sedang membatasi permintaan (HTTP 509). Coba lagi beberapa saat lagi."
        : "PhishTank membatasi permintaan tanpa API key (HTTP 509). Coba lagi nanti, atau jalankan server dengan PHISHTANK_APP_KEY.",
      usedKey,
      { httpStatus: 509 },
    );
  }

  if (response.status === 401 || response.status === 403) {
    return base(
      "unauthorized",
      usedKey
        ? `PhishTank menolak permintaan (HTTP ${response.status}). App key yang dipakai mungkin tidak valid atau sudah tidak berlaku.`
        : `PhishTank menolak permintaan tanpa app key (HTTP ${response.status}). Endpoint ini memerlukan PHISHTANK_APP_KEY di sisi server agar pemeriksaan reputasi dapat berjalan.`,
      usedKey,
      { httpStatus: response.status },
    );
  }

  if (!response.ok) {
    return base(
      "http-error",
      `PhishTank mengembalikan respons gagal (HTTP ${response.status}). Reputasi URL belum diperiksa.`,
      usedKey,
      { httpStatus: response.status },
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return base(
      "invalid-response",
      "Respons PhishTank tidak dapat dibaca sebagai JSON. Hasil reputasi tidak dapat dipakai.",
      usedKey,
    );
  }

  const results = (payload as { results?: unknown } | null)?.results;
  if (typeof results !== "object" || results === null) {
    return base(
      "invalid-response",
      "Respons PhishTank tidak memuat data hasil yang diharapkan. Hasil reputasi tidak dapat dipakai.",
      usedKey,
    );
  }

  const record = results as Record<string, unknown>;
  const inDatabase = boolValue(record.in_database);

  // Kunci utama: tanpa `in_database` yang jelas, kita TIDAK boleh
  // menyimpulkan no-match. Itu akan salah dibaca sebagai "tidak ditemukan".
  if (inDatabase === null) {
    return base(
      "invalid-response",
      "PhishTank membalas tanpa status keanggotaan database yang jelas. Ini bukan hasil “tidak ditemukan”.",
      usedKey,
    );
  }

  const verified = boolValue(record.verified);
  const valid = boolValue(record.valid);
  const detailUrl =
    typeof record.phish_detail_page === "string"
      ? record.phish_detail_page
      : undefined;

  if (inDatabase) {
    return base(
      "match",
      verified === true && valid === true
        ? "URL cocok dengan catatan phishing terverifikasi yang masih valid."
        : "URL ada di database PhishTank. Status verifikasi/validitasnya perlu dibaca lebih hati-hati.",
      usedKey,
      { matched: true, verified, valid, detailUrl, inconclusive: false },
    );
  }

  return base(
    "no-match",
    "Tidak ada kecocokan di PhishTank. Ini bukan bukti bahwa URL aman.",
    usedKey,
    { verified, valid, inconclusive: false },
  );
}

/** Label pendek untuk ditampilkan di antarmuka. */
export const PHISHTANK_STATUS_LABEL: Record<PhishTankStatus, string> = {
  match: "Cocok dengan database",
  "no-match": "Tidak ada kecocokan",
  "rate-limited": "Dibatasi provider",
  unauthorized: "Kredensial ditolak",
  "http-error": "Gagal menghubungi",
  timeout: "Waktu habis",
  "invalid-response": "Respons tidak valid",
};
