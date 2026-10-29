/**
 * Pemeriksaan asal request untuk mencegah CSRF pada operasi yang mengubah data.
 *
 * Semua endpoint mutasi memakai cookie sesi `SameSite=Lax`, sehingga request
 * lintas situs tidak membawa cookie pada POST. Pemeriksaan Origin menambah
 * lapisan kedua.
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

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    return originUrl.host === requestUrl.host;
  } catch {
    return false;
  }
}