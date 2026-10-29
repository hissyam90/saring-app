/**
 * Pemeriksaan asal request untuk mencegah CSRF pada operasi yang mengubah data.
 *
 * Semua endpoint mutasi memakai cookie sesi `SameSite=Lax`, sehingga request
 * lintas situs tidak membawa cookie pada POST. Pemeriksaan Origin menambah
 * lapisan kedua.
 */
/**
 * Pemeriksaan asal request untuk mencegah CSRF pada operasi yang mengubah data.
 *
 * Semua endpoint mutasi memakai cookie sesi `SameSite=Lax`, sehingga request
 * lintas situs tidak membawa cookie pada POST. Pemeriksaan Origin menambah
 * lapisan kedua.
 *
 * **Penting:** host pembanding diambil dari header `Host` (dan `X-Forwarded-Host`
 * bila berada di belakang proxy tepercaya), **bukan** dari `request.url`.
 * Next.js dapat mengisi `request.url` dengan host internal server (mis.
 * `http://localhost:3000/...`) walaupun request datang lewat domain lain.
 * Membandingkan dengan `request.url` membuat setiap POST dari browser ditolak
 * 403 begitu aplikasi tidak diakses lewat `localhost`.
 *
 * Skema (http/https) sengaja tidak dibandingkan karena di produksi TLS sering
 * diterminasi di proxy (Cloudflare/Heroku), sehingga `Origin` memakai https
 * sementara koneksi ke aplikasi memakai http.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");

  // Browser modern mengirim Sec-Fetch-Site; nilainya harus same-origin.
  if (site && site !== "same-origin" && site !== "none") return false;

  if (!origin) {
    // Tanpa Origin: izinkan hanya bila Sec-Fetch-Site juga tidak ada
    // (mis. klien non-browser dengan cookie jar sendiri). Cookie SameSite=Lax
    // tetap menjadi pertahanan utama.
    return true;
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  if (!originHost) return false;

  const allowed = new Set<string>();

  const host = request.headers.get("host");
  if (host) allowed.add(host.trim().toLowerCase());

  // `X-Forwarded-Host` hanya dipercaya bila proxy memang dikonfigurasi.
  if (process.env.SARING_TRUST_PROXY) {
    const forwarded = request.headers.get("x-forwarded-host");
    const first = forwarded?.split(",")[0]?.trim();
    if (first) allowed.add(first.toLowerCase());
  }

  return allowed.has(originHost);
}
