import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Penjaga regresi nilai token gelap untuk dua keadaan kontrol tema.
 *
 * `tests/components/theme-toggle.test.tsx` memastikan kelas *yang dipakai*
 * (aktif = `bg-lime text-on-lime`, nonaktif = `bg-surface text-ink`), namun
 * tidak memeriksa *nilai warna* di balik token tersebut. Bila nilai dark
 * `--color-on-lime`, `--color-lime`, `--color-surface`, atau `--color-ink`
 * diubah, kontras kontrol bisa regres tanpa tertangkap oleh test komponen.
 * Test ini membaca token asli dari `app/globals.css` dan menghitung rasio
 * kontras WCAG untuk kedua pasangan, sehingga `npm test` (bukan hanya
 * `npm run audit:contrast`) ikut menjaga keterbacaan kontrol tema di dark mode.
 */

function readCss(): string {
  return readFileSync("app/globals.css", "utf8");
}

/** Isi blok setelah kurung kurawal pembuka pada posisi `braceIndex`. */
function blockAfter(css: string, braceIndex: number): string {
  let depth = 0;
  for (let i = braceIndex; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(braceIndex + 1, i);
    }
  }
  return "";
}

/** Token `--color-*` pada blok gelap manual. */
function parseDarkTokens(): Record<string, string> {
  const css = readCss();
  const start = css.lastIndexOf(':root[data-theme="dark"]');
  if (start === -1) throw new Error('Blok :root[data-theme="dark"] tidak ditemukan.');
  const brace = css.indexOf("{", start);
  const block = blockAfter(css, brace);

  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

function toRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const tokens = parseDarkTokens();

describe("Kontras token kontrol tema (dark)", () => {
  it("kontrol aktif (bg-lime + text-on-lime) lolos 4.5:1 di dark mode", () => {
    const onLime = tokens["on-lime"];
    const lime = tokens["lime"];
    expect(onLime, "token --color-on-lime harus ada").toBeTruthy();
    expect(lime, "token --color-lime harus ada").toBeTruthy();
    expect(contrast(onLime, lime)).toBeGreaterThanOrEqual(4.5);
  });

  it("kontrol nonaktif (bg-surface + text-ink) lolos 4.5:1 di dark mode", () => {
    const ink = tokens["ink"];
    const surface = tokens["surface"];
    expect(ink, "token --color-ink harus ada").toBeTruthy();
    expect(surface, "token --color-surface harus ada").toBeTruthy();
    expect(contrast(ink, surface)).toBeGreaterThanOrEqual(4.5);
  });
});