import { HttpError } from "@/lib/auth/guards";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...NO_STORE },
  });
}

export function fail(message: string, status: number): Response {
  return json({ error: message }, status);
}

/** Batas panjang pesan log agar stack/konteks besar tidak membanjiri log. */
const MAX_LOG_MESSAGE = 200;

/**
 * Menghapus pola sensitif dari pesan error sebelum ditulis ke log.
 *
 * Yang dicatat hanya nama error dan pesan yang sudah dibersihkan. Body
 * request, cookie, token CAPTCHA, kata sandi, dan API key tidak pernah
 * diteruskan ke fungsi ini.
 */
export function redactForLog(message: string): string {
  return message
    .replace(/(password|secret|token|key|apikey|api_key)=\S+/gi, "$1=[redacted]")
    .replace(/postgres(ql)?:\/\/\S+/gi, "postgres://[redacted]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted]")
    .slice(0, MAX_LOG_MESSAGE);
}

export function logServerError(scope: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const message = error instanceof Error ? error.message : "";
  console.error(`[saring:${scope}] ${name}: ${redactForLog(message)}`);
}

/**
 * Membungkus handler agar error internal tidak bocor ke klien.
 * Pesan HttpError aman ditampilkan; error lain diganti pesan umum dan hanya
 * dicatat di server dalam bentuk yang sudah diredaksi.
 */
export async function handle(
  fn: () => Promise<Response>,
  scope = "api",
): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) {
      return fail(error.message, error.status);
    }
    logServerError(scope, error);
    return fail("Permintaan tidak dapat diproses.", 500);
  }
}

/** Body JSON dibatasi ukurannya sebelum diurai. */
export const MAX_BODY_BYTES = 20_000;

/**
 * Membatasi nomor halaman agar `offset` query tidak bisa dibuat sangat besar
 * lewat parameter URL (biaya query dan potensi penyalahgunaan).
 */
export const MAX_PAGE = 500;

export function clampPage(value: unknown, max = MAX_PAGE): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(max, Math.max(1, Math.trunc(parsed)));
}

export async function readJson(
  request: Request,
): Promise<Record<string, unknown>> {
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_BODY_BYTES) {
    throw new HttpError(413, "Data yang dikirim terlalu besar.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new HttpError(413, "Data yang dikirim terlalu besar.");
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("bukan objek");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Permintaan tidak dapat dibaca.");
  }
}