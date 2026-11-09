import { describe, expect, it } from "vitest";
import { CATEGORY_LABELS } from "@/lib/analysis";
import { runEvaluation } from "../fixtures/eval-metrics";
import type { SubsetReport } from "../fixtures/eval-metrics";

/**
 * Pintu kualitas mesin analisis Saring.
 *
 * Menjalankan evaluasi terhadap tiga subset dataset (development / validation /
 * holdout) dan mencetak laporan metrik lengkap. Ambang di bawah menjaga agar
 * perbaikan di masa depan tidak menurunkan kualitas deteksi.
 *
 * Metodologi dijelaskan di `docs/EVALUASI-ANALISIS.md` dan
 * `tests/fixtures/eval-metrics.ts`. Jalankan:
 *
 *   npx vitest run tests/unit/analysisEval.test.ts --reporter=verbose
 */

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

function renderSubset(report: SubsetReport): string[] {
  const b = report.binary;
  const lines: string[] = [
    `=== SUBSET: ${report.name} (${report.size} contoh) ===`,
    `contoh scam=${b.positives}`,
    `contoh non-scam+edu=${b.negatives}`,
    `contoh ambigu=${report.ambiguous.total} (di-flag=${report.ambiguous.flagged})`,
    "",
    `confusion: TP=${b.tp} FP=${b.fp} FN=${b.fn} TN=${b.tn}`,
    `precision=${pct(b.precision)}`,
    `recall=${pct(b.recall)}`,
    `f1=${pct(b.f1)}`,
    `accuracy=${pct(b.accuracy)}`,
    "",
    "PER-CATEGORY (TP FP FN TN | P R F1 | N):",
    ...report.categories.map(
      (c) =>
        `${CATEGORY_LABELS[c.category]}: ${c.tp} ${c.fp} ${c.fn} ${c.tn} | ${pct(c.precision)} ${pct(c.recall)} ${pct(c.f1)} | ${c.positives}`,
    ),
    "",
    `FALSE-NEGATIF (${report.falseNegatives.length}):`,
    ...report.falseNegatives.map((x) => `  - ${x.id}: ${x.text}`),
    "",
    `FALSE-POSITIF (${report.falsePositives.length}):`,
    ...report.falsePositives.map((x) => `  - ${x.id}: ${x.text}`),
    "",
    `AMBIGU-DI-FLAG (${report.ambiguousFlagged.length}):`,
    ...report.ambiguousFlagged.map((x) => `  - ${x.id}: ${x.text}`),
  ];
  return lines;
}

describe("evaluasi mesin analisis", () => {
  it("memenuhi ambang kualitas deteksi", () => {
    const report = runEvaluation();
    const byName = Object.fromEntries(
      report.subsets.map((s) => [s.name, s]),
    ) as Record<SubsetReport["name"], SubsetReport>;

    // Laporan dibaca manusia (muncul saat `--reporter=verbose`).
    console.log(
      ["", "=== EVALUASI-MESIN-ANALISIS ===", ...renderSubset(byName.development),
        ...renderSubset(byName.validation), ...renderSubset(byName.holdout),
        "=== AKHIR EVALUASI ===",
      ].join("\n"),
    );

    // ── Ambang regresi pada subset DEVELOPMENT (n besar, dipakai untuk tuning) ──
    // Karena mesin sudah disetel berdasarkan dataset ini, angka di sini hanya
    // memastikan tidak ada regresi, BUKAN bukti generalisasi.
    expect(byName.development.binary.total).toBeGreaterThanOrEqual(80);
    expect(byName.development.binary.precision).toBeGreaterThanOrEqual(0.9);
    expect(byName.development.binary.recall).toBeGreaterThanOrEqual(0.9);
    expect(byName.development.binary.accuracy).toBeGreaterThanOrEqual(0.9);

    for (const category of byName.development.categories) {
      expect(
        category.recall,
        `recall ${CATEGORY_LABELS[category.category]} terlalu rendah`,
      ).toBeGreaterThanOrEqual(0.8);
    }

    // ── Ambang sanity pada subset VALIDATION & HOLDOUT (n kecil) ──
    // Ukurannya terlalu kecil untuk ambang per-kategori yang bermakna, dan
    // hasilnya merupakan pengukuran independen (bukan ambang kinerja yang
    // dituntut). Yang dijaga hanyalah lantai biner agar regresi parah (mis.
    // recall < 50%) tetap tertangkap. Nilai aktual serta keterbatasan ukuran
    // sampel dilaporkan di `docs/EVALUASI-ANALISIS.md`.
    for (const name of ["validation", "holdout"] as const) {
      const b = byName[name].binary;
      expect(
        b.total,
        `subset ${name} terlalu kecil untuk diuji`,
      ).toBeGreaterThanOrEqual(15);
      expect(
        b.recall,
        `recall biner ${name} di bawah lantai yang dapat diterima`,
      ).toBeGreaterThanOrEqual(0.5);
      expect(
        b.precision,
        `presisi biner ${name} di bawah lantai yang dapat diterima`,
      ).toBeGreaterThanOrEqual(0.7);
    }
  });
});