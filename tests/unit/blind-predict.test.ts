import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { analyzeText } from "@/lib/analysis";
import type { FindingCategory } from "@/lib/analysis";

/**
 * Pembangkit prediksi untuk evaluasi blind.
 *
 * Ini bukan test biasa: ia membaca dataset yang telah DIBEKUKAN dan menulis
 * prediksi mesin ke berkas terpisah, sehingga `blind-eval.mjs` bisa menghitung
 * metrik tanpa menyentuh aturan mesin. Dipicu hanya bila env diset:
 *
 *   SARING_BLIND_DATASET=/path/dataset.jsonl
 *   SARING_BLIND_PREDICTIONS=/path/predictions.jsonl
 *   npx vitest run tests/unit/blind-predict.test.ts
 *
 * Tanpa env, test ini dilewati (tidak menggangu `npm run test`).
 */

const CATEGORIES: FindingCategory[] = [
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

const datasetPath = process.env.SARING_BLIND_DATASET;
const predictionsPath = process.env.SARING_BLIND_PREDICTIONS;

const enabled = Boolean(datasetPath && predictionsPath);

describe.skipIf(!enabled)("pembangkit prediksi blind", () => {
  it("menulis prediksi untuk dataset yang dibekukan", () => {
    const dataset = readFileSync(datasetPath!, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    const lines = dataset.map((item) => {
      const result = analyzeText(item.text);
      const serious = result.findings.some((f) => f.severity !== "low");
      const categories = CATEGORIES.filter(
        (c) => result.findings.some((f) => f.category === c),
      );
      return `${JSON.stringify({ id: item.id, serious, categories })}\n`;
    });

    writeFileSync(predictionsPath!, lines.join(""), "utf8");
    expect(dataset.length).toBeGreaterThan(0);
  });
});