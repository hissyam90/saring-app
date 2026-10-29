const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 6000;

export type TurnstileOutcome =
  | { ok: true; skipped: boolean }
  | { ok: false; reason: string };

export const TURNSTILE_ERROR =
  "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.";

export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || null;
}

export function turnstileConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY &&
      process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
  );
}

/**
 * Apakah CAPTCHA dilewati. Hanya berlaku bila keduanya benar:
 * bukan production, dan flag eksplisit dinyalakan.
 */
function bypassAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.SARING_TURNSTILE_BYPASS === "1"
  );
}

interface SiteverifyResponse {
  success?: unknown;
  hostname?: unknown;
  action?: unknown;
  "error-codes"?: unknown;
}

/**
 * Verifikasi token Turnstile di sisi server. Tidak pernah mempercayai
 * klaim sukses dari browser.
 */
export async function verifyTurnstile(
  token: unknown,
  expectedAction?: string,
): Promise<TurnstileOutcome> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (bypassAllowed()) return { ok: true, skipped: true };
    // Fail closed: tanpa secret, operasi sensitif ditolak.
    return { ok: false, reason: "captcha-not-configured" };
  }

  if (typeof token !== "string" || token.trim().length === 0) {
    return { ok: false, reason: "missing-token" };
  }
  if (token.length > 4096) {
    return { ok: false, reason: "token-too-long" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return { ok: false, reason: "provider-error" };

    const payload = (await response.json()) as SiteverifyResponse;
    if (payload.success !== true) return { ok: false, reason: "not-successful" };

    if (expectedAction && payload.action !== undefined) {
      if (payload.action !== expectedAction) {
        return { ok: false, reason: "action-mismatch" };
      }
    }

    return { ok: true, skipped: false };
  } catch {
    return { ok: false, reason: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}