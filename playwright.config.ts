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

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100;

if (!process.env.DATABASE_URL) {
  throw new Error(
    [
      "E2E memerlukan PostgreSQL sungguhan, tetapi DATABASE_URL tidak diset.",
      "",
      "Seluruh test E2E memakai database nyata (bukan mock/in-memory) karena",
      "yang diuji adalah persistensi artikel, revisi, draf, bookmark, dan",
      "notifikasi. Siapkan database uji terpisah, lalu jalankan:",
      "",
      "  DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/saring_test \\",
      "  DATABASE_SSL=disable npm run db:migrate && npm run test:e2e",
      "",
      "Jangan mengarahkan DATABASE_URL ke database produksi.",
    ].join("\n"),
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
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
    },
  },
});
