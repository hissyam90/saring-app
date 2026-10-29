import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
     */
    env: {
      NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      CLOUDFLARE_TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    },
  },
});