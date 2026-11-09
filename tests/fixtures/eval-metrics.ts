import { analyzeText } from "@/lib/analysis";
import type { FindingCategory } from "@/lib/analysis";
import {
  DEVELOPMENT_DATASET,
  HOLDOUT_DATASET,
  VALIDATION_DATASET,
} from "../fixtures/analysis-dataset";
import type { EvalCase } from "../fixtures/analysis-dataset";

/**
 * Evaluasi mesin analisis terhadap tiga subset dataset:
 *
 * - `development` — seluruh 88 contoh lama (pernah dipakai untuk tuning; bukan
 *   validasi independen),
 * - `validation` — contoh baru untuk memantau regresi saat tuning berlanjut,
 * - `holdout` — dimaksudkan sebagai uji independen, tetapi **tidak sepenuhnya
 *   blind**: satu aturan `upfront-payment` menyerap kosakata khas `hold-prize-01`
 *   (lihat `docs/EVALUASI-ANALISIS.md` §4.3).
 *
 * Metodologi (dijelaskan juga di `docs/EVALUASI-ANALISIS.md`):
 *
 * 1. **Deteksi risiko biner** (metrik utama). Kelas positif = `scam`; kelas
 *    negatif = `non-scam` + `educational`.
 *    - Prediksi positif (mesin "menandai bahaya") disatukan menjadi **adanya
 *      setidaknya satu temuan ber-keparahan sedang/tinggi**
 *      (`hasSeriousFinding`), persis ambang yang dipakai antarmuka untuk
 *      menampilkan peringatan. Temuan ber-keparahan **rendah** saja dianggap
 *      belum cukup untuk "menandai bahaya" (mis. pengumuman hadiah tanpa
 *      tautan/biaya, atau desakan waktu tunggal), sehingga contoh scam yang
 *      hanya memicu temuan rendah tercatat sebagai *false negative* — sebuah
 *      batasan nyata, bukan angka yang dipoles.
 *    - Contoh `ambiguous` tidak masuk confusion matrix biner.
 *
 * 2. **Deteksi per kategori** (multi-label). Untuk tiap dari 10 kategori,
 *    kebenaran dasar = kategori ada pada `expectedCategories`; prediksi =
 *    mesin memunculkan temuan kategori itu (apa pun keparahannya). Dihitung
 *    TP/FP/FN/TN, presisi, recall, dan F1 atas contoh non-ambiguous. Karena
 *    anotasi kini **multi-label penuh**, temuan kategori tambahan yang benar
 *    tidak lagi tercatat sebagai *false positive*.
 */

export const ALL_CATEGORIES: FindingCategory[] = [
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

export interface BinaryMetrics {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  /** Jumlah contoh non-ambiguous yang ikut confusion matrix biner. */
  total: number;
  /** Jumlah contoh scam (kelas positif). */
  positives: number;
  /** Jumlah contoh non-scam + educational (kelas negatif). */
  negatives: number;
}

export interface CategoryMetrics {
  category: FindingCategory;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
  /** Jumlah contoh dengan kategori ini sebagai kebenaran dasar. */
  positives: number;
}

export interface SubsetReport {
  name: "development" | "validation" | "holdout";
  /** Total contoh pada subset (termasuk ambiguous). */
  size: number;
  binary: BinaryMetrics;
  categories: CategoryMetrics[];
  ambiguous: { total: number; flagged: number };
  ambiguousFlagged: EvalCase[];
  falsePositives: EvalCase[];
  falseNegatives: EvalCase[];
}

export interface EvalReport {
  subsets: SubsetReport[];
}

/** Prediksi positif biner: ada temuan dengan keparahan bukan "low". */
function hasSeriousFinding(text: string): boolean {
  return analyzeText(text).findings.some(
    (finding) => finding.severity !== "low",
  );
}

function emitsCategory(text: string, category: FindingCategory): boolean {
  return analyzeText(text).findings.some(
    (finding) => finding.category === category,
  );
}

function ratio(tp: number, fp: number, fn: number) {
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

interface BinaryCounts {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

function evaluateSubset(
  name: SubsetReport["name"],
  dataset: EvalCase[],
): SubsetReport {
  const binary: BinaryCounts = { tp: 0, fp: 0, fn: 0, tn: 0 };
  const falsePositives: EvalCase[] = [];
  const falseNegatives: EvalCase[] = [];
  const ambiguousFlagged: EvalCase[] = [];
  let ambiguousTotal = 0;

  const catCounts: Record<FindingCategory, BinaryCounts> = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, { tp: 0, fp: 0, fn: 0, tn: 0 }]),
  ) as Record<FindingCategory, BinaryCounts>;

  for (const item of dataset) {
    const predictedCategories = new Set(
      ALL_CATEGORIES.filter((c) => emitsCategory(item.text, c)),
    );
    const expected = new Set(item.expectedCategories);
    const serious = hasSeriousFinding(item.text);

    if (item.risk === "ambiguous") {
      ambiguousTotal += 1;
      if (serious) ambiguousFlagged.push(item);
      continue;
    }

    const positive = item.risk === "scam";

    if (positive && serious) binary.tp += 1;
    else if (positive && !serious) {
      binary.fn += 1;
      falseNegatives.push(item);
    } else if (!positive && serious) {
      binary.fp += 1;
      falsePositives.push(item);
    } else binary.tn += 1;

    for (const category of ALL_CATEGORIES) {
      const exp = expected.has(category);
      const pred = predictedCategories.has(category);
      if (exp && pred) catCounts[category].tp += 1;
      else if (exp && !pred) catCounts[category].fn += 1;
      else if (!exp && pred) catCounts[category].fp += 1;
      else catCounts[category].tn += 1;
    }
  }

  const { precision, recall, f1 } = ratio(binary.tp, binary.fp, binary.fn);
  const total = binary.tp + binary.fp + binary.fn + binary.tn;

  const categories: CategoryMetrics[] = ALL_CATEGORIES.map((category) => {
    const c = catCounts[category];
    const r = ratio(c.tp, c.fp, c.fn);
    return { category, ...c, ...r, positives: c.tp + c.fn };
  });

  return {
    name,
    size: dataset.length,
    binary: {
      ...binary,
      precision,
      recall,
      f1,
      accuracy: total === 0 ? 0 : (binary.tp + binary.tn) / total,
      total,
      positives: binary.tp + binary.fn,
      negatives: binary.fp + binary.tn,
    },
    categories,
    ambiguous: { total: ambiguousTotal, flagged: ambiguousFlagged.length },
    ambiguousFlagged,
    falsePositives,
    falseNegatives,
  };
}

export function runEvaluation(): EvalReport {
  return {
    subsets: [
      evaluateSubset("development", DEVELOPMENT_DATASET),
      evaluateSubset("validation", VALIDATION_DATASET),
      evaluateSubset("holdout", HOLDOUT_DATASET),
    ],
  };
}