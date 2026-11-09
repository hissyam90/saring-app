#!/usr/bin/env node
/**
 * Penilaian evaluasi independen (blind) — murni Node.js, tanpa dependensi.
 *
 * Tujuan: memisahkan (1) DATASET yang disegel dari (2) PREDIKSI yang dihasilkan
 * mesin yang dibekukan, sehingga metrik dihitung tanpa menyentuh aturan mesin.
 *
 * Pemakaian:
 *   node scripts/evaluation/blind-eval.mjs <dataset.jsonl> <predictions.jsonl>
 *
 * Format <dataset.jsonl> (satu objek per baris):
 *   {"id":"s-001","text":"…","risk":"scam|non-scam|educational|ambiguous",
 *    "categories":["impersonation", …]}
 *
 * Format <predictions.jsonl>:
 *   {"id":"s-001","serious":true|false,"categories":["impersonation", …]}
 *
 * Keluaran: confusion matrix biner, precision/recall/F1/accuracy biner, lalu
 * metrik per-label (multi-label), dan daftar FN/FP. Ambiguous dikeluarkan dari
 * metrik biner tetapi tetap dilaporkan terpisah.
 */

import { readFileSync } from "node:fs";

const CATEGORIES = [
  "credential-theft",
  "urgency-intimidation",
  "upfront-payment",
  "unrealistic-promise",
  "suspicious-link",
  "impersonation",
  "risky-instruction",
  "acquaintance-impersonation",
  "money-request",
  "verification-blocking",
];

function readJsonl(path) {
  const text = readFileSync(path, "utf8");
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function pct(n) {
  return (n * 100).toFixed(1) + "%";
}

function ratio(tp, fp, fn) {
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

function main() {
  const [datasetPath, predictionsPath] = process.argv.slice(2);
  if (!datasetPath || !predictionsPath) {
    console.error(
      "Pemakaian: node scripts/evaluation/blind-eval.mjs <dataset.jsonl> <predictions.jsonl>",
    );
    process.exitCode = 1;
    return;
  }

  const dataset = readJsonl(datasetPath);
  const preds = new Map(readJsonl(predictionsPath).map((p) => [p.id, p]));
  if (preds.size === 0) {
    console.error("Berkas prediksi kosong — tidak ada yang dinilai.");
    process.exitCode = 1;
    return;
  }

  const binary = { tp: 0, fp: 0, fn: 0, tn: 0 };
  const catCounts = Object.fromEntries(
    CATEGORIES.map((c) => [c, { tp: 0, fp: 0, fn: 0, tn: 0 }]),
  );
  const falsePositives = [];
  const falseNegatives = [];
  const ambiguous = [];
  const missing = [];

  for (const item of dataset) {
    const p = preds.get(item.id);
    if (!p) {
      missing.push(item.id);
      continue;
    }
    const predicted = new Set(Array.isArray(p.categories) ? p.categories : []);
    const expected = new Set(Array.isArray(item.categories) ? item.categories : []);

    if (item.risk === "ambiguous") {
      ambiguous.push({ id: item.id, serious: p.serious });
      continue;
    }
    const positive = item.risk === "scam";
    if (positive && p.serious) binary.tp += 1;
    else if (positive && !p.serious) {
      binary.fn += 1;
      falseNegatives.push(item.id);
    } else if (!positive && p.serious) {
      binary.fp += 1;
      falsePositives.push(item.id);
    } else binary.tn += 1;

    for (const c of CATEGORIES) {
      const a = expected.has(c);
      const b = predicted.has(c);
      if (a && b) catCounts[c].tp += 1;
      else if (a && !b) catCounts[c].fn += 1;
      else if (!a && b) catCounts[c].fp += 1;
      else catCounts[c].tn += 1;
    }
  }

  const revs = ratio(binary.tp, binary.fp, binary.fn);
  const total = binary.tp + binary.fp + binary.fn + binary.tn;
  const accuracy = total === 0 ? 0 : (binary.tp + binary.tn) / total;

  console.log("=== EVALUASI BLIND (biner) ===");
  console.log(`confusion: TP=${binary.tp} FP=${binary.fp} FN=${binary.fn} TN=${binary.tn}`);
  console.log(`precision=${pct(revs.precision)}`);
  console.log(`recall=${pct(revs.recall)}`);
  console.log(`f1=${pct(revs.f1)}`);
  console.log(`accuracy=${pct(accuracy)}`);
  console.log(`total non-ambiguous=${total} (positif=${binary.tp + binary.fn}, negatif=${binary.fp + binary.tn})`);

  console.log("\n=== PER-KATEGORI (multi-label) ===");
  console.log("kategori\tTP\tFP\tFN\tTN\tP\tR\tF1");
  for (const c of CATEGORIES) {
    const k = catCounts[c];
    const r = ratio(k.tp, k.fp, k.fn);
    console.log(
      `${c}\t${k.tp}\t${k.fp}\t${k.fn}\t${k.tn}\t${pct(r.precision)}\t${pct(r.recall)}\t${pct(r.f1)}`,
    );
  }

  console.log("\n=== RINCIAN ===");
  console.log(`FALSE-POSITIF (${falsePositives.length}): ${falsePositives.join(", ") || "-"}`);
  console.log(`FALSE-NEGATIF (${falseNegatives.length}): ${falseNegatives.join(", ") || "-"}`);
  console.log(`AMBIGUOUS di-flag (${ambiguous.filter((a) => a.serious).length}/${ambiguous.length})`);
  if (missing.length) console.log(`ID tanpa prediksi (dilewati): ${missing.join(", ")}`);
}

main();