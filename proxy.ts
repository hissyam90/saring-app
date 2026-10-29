import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (dahulu `middleware` sebelum Next.js 16) hanya melakukan pemeriksaan
 * awal: apakah cookie sesi ada. Tujuannya mempercepat pengalihan pengunjung
 * tanpa sesi, bukan menjadi lapisan otorisasi.
 *
 * Otorisasi sebenarnya tetap dilakukan di server (server component dan route
 * handler) dengan membaca ulang role dari database. Proxy tidak dipakai untuk
 * memutuskan role, sehingga cookie yang dipalsukan tidak membuka akses.
 */
const PROTECTED = ["/admin", "/akun", "/komunitas/baru", "/komunitas/artikel"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!needsAuth) return NextResponse.next();

  const hasSession = request.cookies.has("saring_session");
  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/masuk";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/akun/:path*", "/komunitas/baru", "/komunitas/artikel"],
};
