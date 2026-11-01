/**
 * Origin publik aplikasi untuk tautan di dalam email.
 *
 * Urutan penentuan:
 * 1. `SARING_APP_ORIGIN` bila diset (wajib di production).
 * 2. Pada production **tanpa** nilai tersebut, fungsi mengembalikan `null`
 *    (fail closed): header `Host` tidak boleh menentukan domain tautan reset.
 * 3. Di luar production (dev/test), host diambil dari header `Host` dan
 *    `X-Forwarded-Proto` agar pengujian lokal tetap berjalan.
 */
export function appOrigin(request: Request): string | null {
  const configured = process.env.SARING_APP_ORIGIN?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") return null;

  const url = new URL(request.url);
  const host = request.headers.get("host")?.trim() || url.host;
  const forwarded = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwarded === "http" || forwarded === "https"
      ? forwarded
      : url.protocol.replace(":", "");

  return `${protocol === "http" ? "http" : "https"}://${host}`;
}