import type { DetectedUrl, UrlSignal } from "./types";

export const SHORTENER_HOSTS = new Set([
  "bit.ly",
  "tinyurl.com",
  "tiny.cc",
  "s.id",
  "gg.gg",
  "rb.gy",
  "cutt.ly",
  "is.gd",
  "ow.ly",
  "t.co",
  "shorturl.at",
  "rebrand.ly",
  "qrs.ly",
  "shor.by",
]);

/**
 * TLD yang cukup umum agar domain tanpa skema tetap dikenali di dalam pesan.
 * Daftar ini bukan daftar hitam: tujuannya menemukan URL, bukan menilai isinya.
 */
export const COMMON_TLDS = [
  "com", "net", "org", "id", "co", "io", "app", "site", "online", "xyz",
  "top", "shop", "store", "info", "biz", "me", "cc", "tv", "link", "click",
  "live", "club", "vip", "win", "icu", "buzz", "quest", "monster", "rest",
  "racing", "stream", "gdn", "work", "my", "sg", "ly", "to", "ws", "tk",
  "ml", "ga", "cf", "gq", "dev", "asia", "pro", "name", "space", "website",
  "fun", "today", "life", "world", "digital", "support", "services", "page",
  "news", "mobi",
] as const;

const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";

function schemePattern(): RegExp {
  return /https?:\/\/[^\s<>"'`)\]]+/gi;
}

/** Domain tanpa "http://" atau "www.", mis. `bca-verifikasi.xyz/login`. */
function bareDomainPattern(): RegExp {
  return new RegExp(
    `(?:${LABEL}\\.)+(?:${COMMON_TLDS.join("|")})(?![a-z0-9-])(?::\\d{1,5})?(?:\\/[^\\s<>"'\`)\\]]*)?`,
    "gi",
  );
}

function stripTrailingPunctuation(raw: string): string {
  return raw.replace(/[.,;:!?\u2014\u2026\u201c\u201d)\]}]+$/g, "");
}

export function isIpHost(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

function isShortener(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  return SHORTENER_HOSTS.has(normalized);
}

/**
 * Host dinormalisasi lewat `URL` agar port, kredensial di depan host
 * (`user:pass@host`), huruf besar, dan titik di akhir tidak salah dibaca.
 */
function parseHost(value: string): string {
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;
  try {
    return new URL(candidate).hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  } catch {
    const remainder = value
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
      .replace(/^www\./i, "");
    return (remainder.split(/[/?#]/)[0] ?? "")
      .toLowerCase()
      .replace(/\.$/, "");
  }
}

export function inspectUrl(raw: string): DetectedUrl {
  const url = stripTrailingPunctuation(raw.trim());
  const hasScheme = /^https?:\/\//i.test(url);
  const scheme = hasScheme
    ? url.slice(0, url.indexOf("//")).replace(/:$/, "").toLowerCase()
    : "";
  const host = parseHost(url);
  const signals: UrlSignal[] = [];
  if (isIpHost(host)) signals.push("ip-address");
  if (isShortener(host)) signals.push("shortened");
  if (scheme === "http") signals.push("http");
  return { url, host, displayHint: host || url, signals };
}

/** Kunci pembanding: "https://www.bit.ly/x" dan "bit.ly/x" bukan dua URL. */
function dedupeKey(url: DetectedUrl): string {
  return url.url
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

export function extractUrls(text: string): DetectedUrl[] {
  const seen = new Set<string>();
  const results: DetectedUrl[] = [];

  const add = (raw: string) => {
    const url = stripTrailingPunctuation(raw.trim());
    if (!url) return;
    const inspected = inspectUrl(url);
    if (!inspected.host) return;
    const key = dedupeKey(inspected);
    if (!key || seen.has(key)) return;
    seen.add(key);
    results.push(inspected);
  };

  for (const match of text.matchAll(schemePattern())) add(match[0]);

  for (const match of text.matchAll(bareDomainPattern())) {
    const index = match.index ?? 0;
    // Lewati domain yang bagian dari alamat lain atau alamat email.
    const before = index > 0 ? text[index - 1] : "";
    if (before && /[a-z0-9@._\-/]/i.test(before)) continue;
    add(match[0]);
  }

  return results;
}