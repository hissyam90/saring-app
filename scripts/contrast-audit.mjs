/**
 * Pengukur kontras WCAG 2.2 untuk token warna Saring.
 *
 * Jalankan: node scripts/contrast-audit.mjs
 *
 * Skrip ini membaca nilai token dari `app/globals.css` (light dan dark) lalu
 * menghitung rasio kontras pasangan foreground/background yang benar-benar
 * dipakai komponen. Tujuannya menemukan pasangan yang gagal sebelum/sesudah
 * perbaikan, bukan menebak dari nama warna.
 */

import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");

function parseBlock(block) {
  const tokens = {};
  for (const match of block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

const themeStart = css.indexOf("@theme");
const themeEnd = css.indexOf("}", themeStart);
const light = parseBlock(css.slice(themeStart, themeEnd));

// Blok dark berada di dalam @media (prefers-color-scheme: dark).
const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const dark = darkStart === -1 ? {} : parseBlock(css.slice(darkStart));

const resolve = (mode, name) => {
  const tokens = mode === "dark" ? { ...light, ...dark } : light;
  return tokens[name];
};

function toRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Mencampur warna dengan latar (meniru opacity Tailwind `text-x/70`). */
function blend(fgHex, bgHex, alpha) {
  const fg = toRgb(fgHex);
  const bg = toRgb(bgHex);
  const mixed = fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Pasangan yang diuji: [label, teks, latar, ambang, jenis]. */
const PAIRS = [
  // Teks isi & sekunder
  ["teks utama / halaman", "ink", "paper", 4.5, "teks"],
  ["teks utama / kartu", "ink", "surface", 4.5, "teks"],
  ["teks sekunder / halaman", "ink-soft", "paper", 4.5, "teks"],
  ["teks sekunder / kartu", "ink-soft", "surface", 4.5, "teks"],
  ["teks muted / halaman", "ink-muted", "paper", 4.5, "teks"],
  ["teks muted / kartu", "ink-muted", "surface", 4.5, "teks"],
  ["teks muted / blok kutipan", "ink-soft", "paper", 4.5, "teks"],

  // Permukaan gelap (navbar, footer, kartu langkah)
  ["teks di atas graphite", "graphite-ink", "graphite", 4.5, "teks"],

  // Aksen & teks di atasnya
  ["teks tombol primary (lime)", "on-lime", "lime", 4.5, "teks"],
  ["teks tombol primary hover", "on-lime", "lime-deep", 4.5, "teks"],
  ["teks tombol danger", "on-coral", "coral", 4.5, "teks"],
  ["teks badge warn", "on-amber", "amber", 4.5, "teks"],
  ["teks badge success", "on-safe", "safe", 4.5, "teks"],
  ["teks di atas ink", "on-ink", "ink", 4.5, "teks"],
  ["teks hero", "ink", "hero", 4.5, "teks"],

  // Placeholder
  ["placeholder / kartu", "placeholder", "surface", 4.5, "teks"],
  ["placeholder / halaman", "placeholder", "paper", 4.5, "teks"],

  // Batas kontrol interaktif (WCAG 1.4.11 -> 3:1)
  ["batas kontrol / kartu", "line-strong", "surface", 3, "ui"],
  ["batas kontrol / halaman", "line-strong", "paper", 3, "ui"],
  ["batas kontrol / input paper", "line-strong", "paper", 3, "ui"],
  ["border ink / kartu", "ink", "surface", 3, "ui"],
  ["border ink / halaman", "ink", "paper", 3, "ui"],

  // Pemisah dekoratif: dicatat, bukan batas kontrol yang wajib 3:1.
  ["pemisah dekoratif / halaman", "line", "paper", 1.2, "dekoratif"],
  ["pemisah dekoratif / kartu", "line", "surface", 1.2, "dekoratif"],

  // Permukaan lembut (notice, badge latar)
  ["teks di lime-soft", "ink", "lime-soft", 4.5, "teks"],
  ["teks di amber-soft", "ink", "amber-soft", 4.5, "teks"],
  ["teks di coral-soft", "ink", "coral-soft", 4.5, "teks"],
  ["teks di safe-soft", "ink", "safe-soft", 4.5, "teks"],
  ["teks muted di kartu (editor hint)", "ink-muted", "surface", 4.5, "teks"],
];

const rows = [];
let failures = 0;

for (const mode of ["light", "dark"]) {
  for (const [label, fgToken, bgToken, threshold, kind] of PAIRS) {
    const fg = resolve(mode, fgToken);
    const bg = resolve(mode, bgToken);
    if (!fg || !bg) {
      rows.push({ mode, label, ratio: "token tidak ada", status: "SKIP" });
      failures += 1;
      continue;
    }
    const ratio = contrast(fg, bg);
    const pass = ratio >= threshold;
    if (!pass) failures += 1;
    rows.push({
      mode,
      label,
      fg,
      bg,
      ratio: ratio.toFixed(2),
      ambang: threshold,
      jenis: kind,
      status: pass ? "PASS" : "FAIL",
    });
  }
}

// Teks dengan opacity (dipakai di navbar/footer di atas graphite).
for (const mode of ["light", "dark"]) {
  const graphite = resolve(mode, "graphite");
  const fgBase = resolve(mode, "graphite-ink") ?? resolve(mode, "paper");
  if (!graphite || !fgBase) continue;
  for (const alpha of [0.9, 0.75, 0.6]) {
    const blended = blend(fgBase, graphite, alpha);
    const ratio = contrast(blended, graphite);
    const pass = ratio >= 4.5;
    if (!pass) failures += 1;
    rows.push({
      mode,
      label: `teks graphite ${Math.round(alpha * 100)}%`,
      fg: blended,
      bg: graphite,
      ratio: ratio.toFixed(2),
      threshold: 4.5,
      status: pass ? "PASS" : "FAIL",
    });
  }
}

console.table(rows);
console.log(
  failures === 0
    ? "SEMUA PASANGAN LOLOS ambang yang diuji."
    : `${failures} pasangan GAGAL ambang.`,
);
process.exitCode = failures === 0 ? 0 : 1;
