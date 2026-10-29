import { getStore } from "@/lib/db";

export interface RateLimitRule {
  /** Nama bucket, mis. "login". */
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

/** Aturan per endpoint. Ambang dibuat cukup longgar untuk pengguna normal. */
export const RATE_LIMITS = {
  login: { name: "login", limit: 8, windowSeconds: 300 },
  register: { name: "register", limit: 5, windowSeconds: 3600 },
  threadCreate: { name: "thread-create", limit: 5, windowSeconds: 600 },
  replyCreate: { name: "reply-create", limit: 20, windowSeconds: 600 },
  submissionCreate: { name: "submission-create", limit: 4, windowSeconds: 3600 },
  submissionUpdate: { name: "submission-update", limit: 10, windowSeconds: 3600 },
  reportCreate: { name: "report-create", limit: 10, windowSeconds: 3600 },
  urlCheck: { name: "url-check", limit: 40, windowSeconds: 300 },
  moderate: { name: "admin-moderate", limit: 60, windowSeconds: 300 },
} satisfies Record<string, RateLimitRule>;

/** Hanya menerima bentuk IPv4/IPv6 yang wajar agar bucket tidak bisa dipalsukan. */
function normalizeIp(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 45) return null;
  if (!/^[0-9a-fA-F:.]+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Menentukan IP klien hanya dari header yang ditulis oleh proxy tepercaya.
 *
 * `SARING_TRUST_PROXY` menentukan hop mana yang boleh dipercaya:
 * - `cloudflare`: `cf-connecting-ip`. Cloudflare menimpa header ini di edge,
 *   sehingga nilainya tidak bisa dipalsukan klien yang melewati proxy.
 * - `heroku`: entri **terakhir** `x-forwarded-for`. Router Heroku menambahkan
 *   IP koneksi di ujung kanan, jadi entri sebelumnya (yang bisa dikirim klien)
 *   diabaikan.
 * - tidak diset: tidak ada header yang dipercaya. Semua request masuk ke satu
 *   bucket `unknown` (fail-safe, tetapi harus dikonfigurasi di production).
 */
export function clientKey(request: Request, scope: string): string {
  const mode = process.env.SARING_TRUST_PROXY;
  let ip: string | null = null;

  if (mode === "cloudflare") {
    ip = normalizeIp(request.headers.get("cf-connecting-ip"));
  } else if (mode === "heroku") {
    const header = request.headers.get("x-forwarded-for");
    if (header) {
      const hops = header
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      ip = normalizeIp(hops[hops.length - 1] ?? null);
    }
  }

  return `${scope}:${ip ?? "unknown"}`;
}

/**
 * Menambah penghitung di backend bersama (PostgreSQL pada produksi).
 *
 * Fail-safe: jika penyimpanan gagal, request ditolak untuk endpoint sensitif
 * agar kegagalan backend tidak membuka pintu penyalahgunaan.
 */
export async function checkRateLimit(
  rule: RateLimitRule,
  key: string,
): Promise<RateLimitResult> {
  try {
    const count = await getStore().incrementRateLimit(
      key,
      rule.windowSeconds,
    );
    const allowed = count <= rule.limit;
    return {
      allowed,
      remaining: Math.max(0, rule.limit - count),
      retryAfter: allowed ? 0 : rule.windowSeconds,
    };
  } catch {
    return { allowed: false, remaining: 0, retryAfter: rule.windowSeconds };
  }
}

export function tooManyRequests(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
        "Cache-Control": "no-store",
      },
    },
  );
}