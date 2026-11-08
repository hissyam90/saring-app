import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

/**
 * Muat `.env.local` **sebelum** konfigurasi dibaca.
 *
 * Alasannya: proses web server Playwright mewarisi `process.env` (Playwright
 * menggabungkan `{ ...process.env, ...webServer.env }`). Dengan memuat env di
 * sini, server produksi yang diuji menerima `DATABASE_URL`, `SESSION_SECRET`,
 * dan konfigurasi lain yang **sama persis** dengan yang dipakai berkas test.
 *
 * Sebelumnya hal ini tidak dilakukan sehingga di CI tidak ada `DATABASE_URL`
 * sama sekali: `new Pool({ connectionString: undefined })` lalu mencoba
 * `localhost:5432`, dan test gagal dengan `ECONNREFUSED ::1:5432` /
 * `127.0.0.1:5432` yang tidak menjelaskan penyebabnya.
 *
 * Di CI, `.env.local` tidak ada; nilai datang dari `env:` pada job workflow,
 * dan `loadEnvConfig` tidak menimpa variabel yang sudah diset proses induk.
 */
loadEnvConfig(process.cwd(), true);

/**
 * Pengaman database untuk E2E: hanya database uji lokal yang boleh dipakai.
 * `SARING_E2E_DATABASE_URL` adalah sumber kebenaran untuk pengujian lokal
 * (`npm run test:e2e:local`); bila diset, ia menggantikan `DATABASE_URL` agar
 * server produksi yang diuji, berkas test, dan migration memakai database yang
 * sama. Database produksi tidak pernah bisa terpilih hanya karena `DATABASE_URL`
 * dari `.env.local` ditemukan.
 */
if (process.env.SARING_E2E_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SARING_E2E_DATABASE_URL;
}

function validateE2eDatabaseUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0) return "DATABASE_URL kosong.";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "DATABASE_URL bukan URL yang valid.";
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    return `Host database harus localhost/127.0.0.1 (ditemukan "${host}").`;
  }
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!dbName.endsWith("_test")) {
    return `Nama database harus berakhiran "_test" (ditemukan "${dbName}").`;
  }
  return null;
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100;

/**
 * E2E email (Resend + Testmail) bersifat opt-in. Hanya run inilah yang boleh
 * memakai kredensial Resend asli; run E2E lain (termasuk
 * `password-reset-security.spec.ts`) mengosongkan kredensial tersebut sehingga
 * server tidak mungkin mengirim email keluar.
 */
const EMAIL_E2E = process.env.SARING_EMAIL_E2E === "1";
const APP_ORIGIN = `http://127.0.0.1:${PORT}`;

if (!process.env.DATABASE_URL) {
  throw new Error(
    [
      "E2E memerlukan PostgreSQL sungguhan, tetapi DATABASE_URL tidak diset.",
      "",
      "Seluruh test E2E memakai database nyata (bukan mock/in-memory) karena",
      "yang diuji adalah persistensi artikel, revisi, draf, bookmark, dan",
      "notifikasi. Siapkan database uji terpisah, lalu jalankan:",
      "",
      "  npm run test:e2e:local",
      "",
      "Jangan mengarahkan DATABASE_URL ke database produksi.",
    ].join("\n"),
  );
}

const dbProblem = validateE2eDatabaseUrl(process.env.DATABASE_URL);
if (dbProblem) {
  throw new Error(
    [
      "E2E menolak database yang tidak aman:",
      `  ${dbProblem}`,
      "",
      "DATABASE_URL wajib menunjuk database uji lokal (host localhost/127.0.0.1",
      'dengan nama berakhiran "_test"). E2E tidak boleh berjalan ke database',
      "produksi. Gunakan `npm run test:e2e:local` untuk menyiapkan PostgreSQL uji.",
    ].join("\n"),
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  /**
   * Spec email memakai layanan eksternal (Testmail + Resend) dan hanya
   * dijalankan lewat `npm run test:e2e:email`. E2E biasa tidak boleh
   * bergantung pada layanan itu.
   */
  testIgnore: EMAIL_E2E ? [] : ["**/password-reset-email.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /**
   * Di CI, batasi jumlah worker: setiap worker memegang pool PostgreSQL sendiri
   * (`pg` default 10 koneksi) dan server Next.js memegang pool terpisah
   * (`DATABASE_POOL_MAX`). Membatasi worker mencegah habisnya `max_connections`
   * pada service container.
   */
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    /**
     * Kunci uji resmi Cloudflare Turnstile ("always passes").
     *
     * Nilainya publik dan memang disediakan Cloudflare untuk pengujian
     * otomatis di domain apa pun. Dipakai di sini supaya alur pengajuan artikel
     * benar-benar melewati verifikasi Siteverify di server saat pengujian,
     * bukan melewatinya. Konfigurasi produksi (`.env.local` / Heroku Config
     * Vars) sama sekali tidak diubah.
     *
     * `DATABASE_URL` dan variabel lain tidak ditulis ulang di sini: keduanya
     * diwarisi dari `process.env` (lihat `loadEnvConfig` di atas), sehingga
     * server yang diuji memakai database yang sama dengan berkas test.
     */
    env: {
      NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      CLOUDFLARE_TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      /**
       * Server berjalan dengan NODE_ENV=production, sehingga `appOrigin()`
       * menolak memakai header Host. Origin eksplisit ini menggantikan
       * konfigurasi produksi selama pengujian.
       */
      SARING_APP_ORIGIN: APP_ORIGIN,
      /**
       * Isolasi email: hanya `npm run test:e2e:email` yang mengirim email
       * sungguhan. Run lain memakai nilai kosong sehingga
       * `sendPasswordResetEmail` berhenti sebagai "not-configured" dan tidak
       * pernah memanggil Resend. Ini bukan mock: spec email tetap memakai
       * Resend + Testmail asli.
       */
      ...(EMAIL_E2E ? {} : { RESEND_API_KEY: "", RESEND_FROM: "" }),
    },
  },
});
