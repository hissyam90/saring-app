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

const URL_PATTERN = /(?:(?:https?:\/\/)|(?:www\.))[^\s<>"'\u00AB\u00BB`)\]]+/gi;

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

export function inspectUrl(raw: string): DetectedUrl {
  const hasScheme = /^https?:\/\//i.test(raw);
  const scheme = hasScheme
    ? (raw.match(/^(https?):\/\//i)?.[1].toLowerCase() ?? "")
    : "";
  const remainder = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const host = (remainder.split(/[/?#]/)[0] ?? "").toLowerCase();
  const signals: UrlSignal[] = [];
  if (isIpHost(host)) signals.push("ip-address");
  if (isShortener(host)) signals.push("shortened");
  if (scheme === "http") signals.push("http");
  return { url: raw, host, displayHint: host || raw, signals };
}

export function extractUrls(text: string): DetectedUrl[] {
  const seen = new Set<string>();
  const results: DetectedUrl[] = [];
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = stripTrailingPunctuation(match[0]);
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(inspectUrl(url));
  }
  return results;
}