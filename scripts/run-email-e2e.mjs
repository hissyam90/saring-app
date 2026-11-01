/**
 * Menjalankan E2E email (Testmail + Resend) hanya bila konfigurasi lengkap.
 *
 * Perintah ini sengaja berhenti dengan kode 1 ketika variabel lingkungan belum
 * diset: pengujian email tidak boleh "lulus" tanpa benar-benar mengirim dan
 * menerima email.
 */
import { spawn } from "node:child_process";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

const REQUIRED = [
  "TESTMAIL_APIKEY",
  "TESTMAIL_NAMESPACE",
  "RESEND_API_KEY",
  "RESEND_FROM",
];

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error("E2E email belum dapat dijalankan.");
  console.error("Variabel lingkungan berikut belum diset:");
  for (const key of missing) console.error(`  - ${key}`);
  console.error("");
  console.error("Panduan lengkap: docs/TESTING.md bagian \"E2E email (Testmail)\".");
  console.error(
    "Tidak ada request ke Testmail yang dilakukan, dan pengujian ini TIDAK dianggap berhasil.",
  );
  process.exit(1);
}

console.log(
  `Menjalankan E2E email dengan namespace ${process.env.TESTMAIL_NAMESPACE}.`,
);

const child = spawn(
  "npx",
  ["playwright", "test", "tests/e2e/password-reset-email.spec.ts"],
  {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, SARING_EMAIL_E2E: "1" },
  },
);

child.on("exit", (code) => process.exit(code ?? 1));