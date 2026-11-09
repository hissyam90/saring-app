#!/usr/bin/env node
/**
 * Pembekuan dataset evaluasi (frozen evaluation) — murni Node.js.
 *
 * Menghasilkan manifest + checksum sehingga dataset yang dipakai pengujian
 * dapat diverifikasi tidak berubah setelah dibekukan. Evaluator independen
 * membekukan dataset SETELAH anotasi selesai dan SEBELUM mesin dijalankan,
 * lalu menyimpan `freeze.lock.json` sebagai bukti integritas.
 *
 * Pemakaian:
 *   node scripts/evaluation/freeze.mjs <dataset.jsonl> [engine-version] [git-commit]
 *
 * Keluaran: `scripts/evaluation/freeze.lock.json` (atau ditimpa) berisi:
 *   - sha256 dataset,
 *   - jumlah contoh,
 *   - versi mesin & commit (bila diberikan),
 *   - waktu pembekuan (ISO).
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const LOCKFILE = fileURLToPath(
  new URL("./freeze.lock.json", import.meta.url),
);

function checksum(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function main() {
  const [datasetPath, engineVersion, gitCommit] = process.argv.slice(2);
  if (!datasetPath) {
    console.error(
      "Pemakaian: node scripts/evaluation/freeze.mjs <dataset.jsonl> [engine-version] [git-commit]",
    );
    process.exitCode = 1;
    return;
  }

  const buf = readFileSync(datasetPath);
  const lines = buf
    .toString("utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const count = lines.length;

  const lock = {
    dataset: path.basename(datasetPath),
    sha256: checksum(buf),
    examples: count,
    engineVersion: engineVersion || null,
    gitCommit: gitCommit || null,
    frozenAt: new Date().toISOString(),
  };

  writeFileSync(LOCKFILE, JSON.stringify(lock, null, 2) + "\n", "utf8");
  console.log("Dataset dibekukan:");
  console.log(JSON.stringify(lock, null, 2));
  console.log(`Lockfile: ${LOCKFILE}`);
}

main();