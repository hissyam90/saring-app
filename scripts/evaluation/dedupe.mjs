#!/usr/bin/env node
/**
 * Deteksi duplikat & near-duplicate pada dataset evaluasi — murni Node.js.
 *
 * Membantu menjaga kemandirian subset: contoh yang sama (atau hampir sama)
 * yang muncul di dua subset akan "membocorkan" jawaban dari development ke
 * holdout. Skrip ini menormalkan teks lalu membandingkan kemiripan.
 *
 * Pemakaian:
 *   node scripts/evaluation/dedupe.mjs <dataset.jsonl> [batas-kemiripan]
 *
 * Normalisasi yang dilakukan (agar variasi kecil tidak lolos):
 *   - huruf kecil, hapus tanda baca/angka yang bukan bagian kata,
 *   - seragamkan spasi,
 *   - seragamkan ejaan umum (uang→duit, gak→tidak, dsb.),
 *   - menyimpan hanya token unik berturut-turut (menghapus pengulangan).
 *
 * Keluaran: pasangan id dengan kemiripan ≥ batas (default 0.8), memakai
 * koefisien Jaccard atas token, plus daftar kemiripan teks persis.
 */

import { readFileSync } from "node:fs";

const EJAAN = [
  [/\buang\b/g, "duit"],
  [/\bduid\b/g, "duit"],
  [/\bgak\b/g, "tidak"],
  [/\bnggak\b/g, "tidak"],
  [/\bga\b/g, "tidak"],
  [/\bgue\b/g, "saya"],
  [/\bgw\b/g, "saya"],
  [/\bsy\b/g, "saya"],
  [/\bnih\b/g, "ini"],
  [/\bsih\b/g, ""],
  [/\bdr\b/g, "dari"],
  [/\btrs\b/g, "terus"],
  [/\bdgn\b/g, "dengan"],
  [/\byg\b/g, "yang"],
  [/\bno\.?\b/g, "nomor"],
  [/\brek\b/g, "rekening"],
];

function normalize(text) {
  let t = text.toLowerCase();
  for (const [re, rep] of EJAAN) t = t.replace(re, rep);
  t = t.replace(/[^a-z0-9\s]/g, " "); // tanda baca jadi spasi
  t = t.replace(/\b\d+\b/g, " "); // angka umum dihilangkan (nomor beda ≠ konten beda)
  t = t.replace(/\s+/g, " ").trim();
  const tokens = t.split(" ").filter(Boolean);
  // Hapus pengulangan beruntun (mis. "cepat cepat bayar").
  const dedup = tokens.filter((w, i) => i === 0 || w !== tokens[i - 1]);
  return dedup;
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function main() {
  const [path, thresholdRaw] = process.argv.slice(2);
  if (!path) {
    console.error("Pemakaian: node scripts/evaluation/dedupe.mjs <dataset.jsonl> [batas]");
    process.exitCode = 1;
    return;
  }
  const threshold = thresholdRaw ? Number(thresholdRaw) : 0.8;

  const rows = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const norm = rows.map((r) => ({ id: r.id, tokens: normalize(r.text) }));
  const exact = [];
  const near = [];

  for (let i = 0; i < norm.length; i++) {
    for (let j = i + 1; j < norm.length; j++) {
      const sim = jaccard(norm[i].tokens, norm[j].tokens);
      if (sim === 1) exact.push(`${norm[i].id} ~ ${norm[j].id} (identik)`);
      else if (sim >= threshold) near.push(`${norm[i].id} ~ ${norm[j].id} (${sim.toFixed(2)})`);
    }
  }

  console.log(`Dataset: ${rows.length} contoh. Batas kemiripan: ${threshold}`);
  console.log(`\nIDENTIK (${exact.length}):`);
  console.log(exact.join("\n") || "-");
  console.log(`\nNEAR-DUPLICATE (${near.length}):`);
  console.log(near.join("\n") || "-");
}

main();