import {
  decodeSearchResponse,
  THREAT_TYPE_NAMES,
} from "./protobuf";

/**
 * Google Safe Browsing API v5. provider reputasi URL utama Saring.
 *
 * Kontrak sesuai dokumentasi resmi (diverifikasi 2026):
 *   GET https://safebrowsing.googleapis.com/v5/urls:search
 *   Query: urls[] (berulang, maks 50) dan key
 *   Body: HARUS kosong
 *   Respons: { threats: [{ url, threatTypes[] }], cacheDuration }
 *   Tanpa kecocokan: HTTP 200 dengan `threats` kosong, bukan 404.
 *
 * Catatan: API v5 berbeda dari v4 (v4 memakai POST + threatInfo).
 */

export const GSB_ENDPOINT = "https://safebrowsing.googleapis.com/v5/urls:search";
export const GSB_ATTRIBUTION = {
  text: "Advisory provided by Google",
  url: "https://developers.google.com/safe-browsing/",
} as const;

export type GsbStatus =
  | "threat"
  | "no-match"
  | "not-configured"
  | "unauthorized"
  | "quota-exceeded"
  | "timeout"
  | "http-error"
  | "invalid-response";

export type ThreatType =
  | "MALWARE"
  | "SOCIAL_ENGINEERING"
  | "UNWANTED_SOFTWARE"
  | "POTENTIALLY_HARMFUL_APPLICATION";

export interface GsbThreat {
  url: string;
  threatTypes: ThreatType[];
  labels: string[];
}

export interface GsbLookup {
  provider: "Google Safe Browsing";
  status: GsbStatus;
  matched: boolean;
  threats: GsbThreat[];
  checkedAt: string;
  message: string;
  /** True bila hasil ini tidak boleh dipakai menarik kesimpulan apa pun. */
  inconclusive: boolean;
  httpStatus?: number;
  cacheHit: boolean;
  /** Kapan hasil cache boleh dipakai ulang (mengikuti cacheDuration Google). */
  expiresAt?: string;
  /** Hanya ada bila ada kecocokan dari Google. */
  attribution?: { text: string; url: string };
}

const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_CACHE_SECONDS = 300;
const MAX_CACHE_SECONDS = 24 * 60 * 60;

const THREAT_LABELS: Record<ThreatType, string> = {
  MALWARE: "Malware",
  SOCIAL_ENGINEERING: "Penipuan atau phishing",
  UNWANTED_SOFTWARE: "Perangkat lunak tidak diinginkan",
  POTENTIALLY_HARMFUL_APPLICATION: "Aplikasi berpotensi merugikan",
};

function labelFor(type: string): string {
  return THREAT_LABELS[type as ThreatType] ?? type;
}

/** Cache di memori proses. Menghormati cacheDuration dari server. */
const cache = new Map<string, { expiresAt: number; result: GsbLookup }>();

function cacheKey(url: string): string {
  return url.toLowerCase();
}

function readCache(url: string): GsbLookup | null {
  const hit = cache.get(cacheKey(url));
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(cacheKey(url));
    return null;
  }
  return { ...hit.result, cacheHit: true };
}

function writeCache(url: string, result: GsbLookup, seconds: number): GsbLookup {
  const ttl = Math.min(Math.max(seconds, 30), MAX_CACHE_SECONDS);
  const expiresAt = Date.now() + ttl * 1000;
  cache.set(cacheKey(url), { expiresAt, result });
  // Batasi ukuran cache agar tidak tumbuh tanpa batas.
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return { ...result, cacheHit: false, expiresAt: new Date(expiresAt).toISOString() };
}

/** Label pendek untuk ditampilkan di antarmuka. */
export const GSB_STATUS_LABEL: Record<GsbStatus, string> = {
  threat: "Ancaman ditemukan",
  "no-match": "Tidak ada kecocokan",
  "not-configured": "Belum dikonfigurasi",
  unauthorized: "Akses ditolak",
  "quota-exceeded": "Kuota tercapai",
  timeout: "Waktu habis",
  "http-error": "Gagal dihubungi",
  "invalid-response": "Respons tidak valid",
};
export function __clearGsbCache(): void {
  cache.clear();
}

function base(
  status: GsbStatus,
  message: string,
  extra: Partial<GsbLookup> = {},
): GsbLookup {
  return {
    provider: "Google Safe Browsing",
    status,
    matched: false,
    threats: [],
    checkedAt: new Date().toISOString(),
    message,
    inconclusive: status !== "threat" && status !== "no-match",
    cacheHit: false,
    ...extra,
  };
}

function reasonFromBody(text: string): string | null {
  try {
    const parsed: unknown = JSON.parse(text);
    const details = (parsed as { error?: { details?: unknown } })?.error?.details;
    if (Array.isArray(details)) {
      for (const detail of details) {
        const reason = (detail as { reason?: unknown })?.reason;
        if (typeof reason === "string") return reason;
      }
    }
  } catch {
    /* bukan JSON, abaikan */
  }
  return null;
}

function parseThreatsJson(payload: unknown): {
  ok: boolean;
  threats: GsbThreat[];
  cacheSeconds: number | null;
} {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, threats: [], cacheSeconds: null };
  }
  const record = payload as { threats?: unknown; cacheDuration?: unknown };

  if (record.threats !== undefined && !Array.isArray(record.threats)) {
    return { ok: false, threats: [], cacheSeconds: null };
  }

  const raw = (record.threats as unknown[] | undefined) ?? [];
  const threats: GsbThreat[] = [];

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      return { ok: false, threats: [], cacheSeconds: null };
    }
    const item = entry as { url?: unknown; threatTypes?: unknown };
    if (typeof item.url !== "string") {
      return { ok: false, threats: [], cacheSeconds: null };
    }
    const types = Array.isArray(item.threatTypes) ? item.threatTypes : [];
    const threatTypes = types.filter(
      (t): t is ThreatType => typeof t === "string",
    );
    threats.push({
      url: item.url,
      threatTypes,
      labels: threatTypes.map(labelFor),
    });
  }

  // cacheDuration berformat "3.5s".
  let cacheSeconds: number | null = null;
  if (typeof record.cacheDuration === "string") {
    const parsed = Number.parseFloat(record.cacheDuration.replace(/s$/, ""));
    if (Number.isFinite(parsed) && parsed > 0) cacheSeconds = parsed;
  }

  return { ok: true, threats, cacheSeconds };
}

export async function lookupGoogleSafeBrowsing(
  rawUrl: string,
  apiKey?: string,
): Promise<GsbLookup> {
  const key = apiKey?.trim();

  if (!key) {
    return base(
      "not-configured",
      "Google Safe Browsing belum dikonfigurasi di server ini, jadi reputasi URL tidak diperiksa. Hasil inspeksi lokal tetap berlaku.",
    );
  }

  const cached = readCache(rawUrl);
  if (cached) return cached;

  const params = new URLSearchParams();
  params.append("urls", rawUrl);
  params.set("key", key);

  let response: Response;
  try {
    response = await fetch(`${GSB_ENDPOINT}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return base(
        "timeout",
        "Google Safe Browsing tidak merespons dalam 8 detik. Reputasi URL belum diperiksa, dan ini bukan hasil aman.",
      );
    }
    return base(
      "http-error",
      "Koneksi ke Google Safe Browsing gagal. Reputasi URL belum diperiksa.",
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const bodyText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

  if (response.status === 400) {
    const reason = reasonFromBody(bodyText);
    if (reason === "API_KEY_INVALID" || reason === "API_KEY_EXPIRED") {
      return base(
        "unauthorized",
        "Google menolak API key yang dipakai server. Periksa nilai GOOGLE_SAFE_BROWSING_API_KEY.",
        { httpStatus: 400 },
      );
    }
    return base(
      "http-error",
      `Google menolak permintaan (HTTP 400${reason ? `, ${reason}` : ""}). Reputasi URL belum diperiksa.`,
      { httpStatus: 400 },
    );
  }

  if (response.status === 401 || response.status === 403) {
    const reason = reasonFromBody(bodyText);
    return base(
      "unauthorized",
      `Akses ke Google Safe Browsing ditolak (HTTP ${response.status}${reason ? `, ${reason}` : ""}). Pastikan API Safe Browsing sudah diaktifkan untuk key tersebut.`,
      { httpStatus: response.status },
    );
  }

  if (response.status === 429) {
    return base(
      "quota-exceeded",
      "Kuota atau batas permintaan Google Safe Browsing tercapai (HTTP 429). Coba lagi nanti.",
      { httpStatus: 429 },
    );
  }

  if (!response.ok) {
    return base(
      "http-error",
      `Google Safe Browsing mengembalikan respons gagal (HTTP ${response.status}). Reputasi URL belum diperiksa.`,
      { httpStatus: response.status },
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  let threats: GsbThreat[] = [];
  let cacheSeconds = DEFAULT_CACHE_SECONDS;

  try {
    if (contentType.includes("json")) {
      // Jalur JSON: dipakai mock pengujian dan bila transcoding mengirim JSON.
      const parsedJson: unknown = bytes.length === 0 ? {} : JSON.parse(bodyText);
      const parsed = parseThreatsJson(parsedJson);
      if (!parsed.ok) {
        return base(
          "invalid-response",
          "Struktur respons Google Safe Browsing tidak sesuai dokumentasi. Hasil reputasi tidak dapat dipakai.",
          { httpStatus: response.status },
        );
      }
      threats = parsed.threats;
      cacheSeconds = parsed.cacheSeconds ?? DEFAULT_CACHE_SECONDS;
    } else {
      // Jalur nyata: application/x-protobuf.
      // Body kosong berarti tidak ada ancaman dan cacheDuration tidak dikirim.
      if (bytes.length > 0) {
        const decoded = decodeSearchResponse(bytes);
        threats = decoded.threats.map((entry) => {
          const names = entry.threatTypeIds
            .map((id) => THREAT_TYPE_NAMES[id])
            .filter((name): name is string => Boolean(name));
          return {
            url: entry.url,
            threatTypes: names as ThreatType[],
            labels: names.map(labelFor),
          };
        });
        if (decoded.cacheSeconds && decoded.cacheSeconds > 0) {
          cacheSeconds = decoded.cacheSeconds;
        }
      }
    }
  } catch {
    return base(
      "invalid-response",
      "Respons Google Safe Browsing tidak dapat dibaca (format tidak sesuai). Hasil reputasi tidak dapat dipakai.",
      { httpStatus: response.status },
    );
  }

  if (threats.length === 0) {
    return writeCache(
      rawUrl,
      base(
        "no-match",
        "Tidak ada kecocokan pada pemeriksaan Google Safe Browsing saat ini. Ini bukan jaminan bahwa tautan aman.",
        { matched: false, httpStatus: response.status },
      ),
      cacheSeconds,
    );
  }

  const labels = [...new Set(threats.flatMap((t) => t.labels))];
  const result = base(
    "threat",
    `Google Safe Browsing menandai tautan ini sebagai ancaman: ${labels.join(", ")}.`,
    {
      matched: true,
      threats,
      httpStatus: response.status,
      attribution: { ...GSB_ATTRIBUTION },
    },
  );

  return writeCache(rawUrl, result, cacheSeconds);
}

