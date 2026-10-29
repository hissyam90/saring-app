import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/**
 * CSP produksi.
 *
 * `unsafe-inline` pada script masih diperlukan karena Next.js menyisipkan
 * skrip inline untuk bootstrap data halaman. `frame-src` dan `script-src`
 * mengizinkan Cloudflare Turnstile karena widget-nya dimuat dari domain
 * Cloudflare. Tanpa izin itu, form yang dilindungi CAPTCHA tidak dapat
 * dirender.
 */
const cspHeader = {
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
};

const hstsHeader = {
  key: "Strict-Transport-Security",
  value: "max-age=31536000; includeSubDomains",
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const headers = [...securityHeaders];
    if (process.env.NODE_ENV === "production") {
      headers.push(cspHeader);
      // HSTS hanya dikirim bila situs memang sudah berjalan di HTTPS.
      // Tanpa flag ini, deployment HTTP sementara tidak akan terkunci.
      if (process.env.SARING_ENABLE_HSTS === "1") headers.push(hstsHeader);
    }
    return [
      {
        source: "/(.*)",
        headers,
      },
      {
        // Halaman privat tidak boleh disimpan cache bersama.
        source: "/(admin|akun|komunitas|api)/(.*)",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
