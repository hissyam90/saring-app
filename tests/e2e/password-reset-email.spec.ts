import { expect, test, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import {
  createTestmailInbox,
  emailE2ESkipReason,
  extractResetLink,
  waitForTestmailEmail,
} from "./helpers/testmail";
import {
  RESET_TOKEN_TTL_MINUTES,
  hashResetToken,
} from "../../lib/auth/password-reset";

/**
 * E2E email: registrasi → forgot password → email sungguhan lewat Resend →
 * Testmail → reset kata sandi → verifikasi sesi & token.
 *
 * Hanya dijalankan lewat `npm run test:e2e:email`. Bila Testmail atau Resend
 * belum dikonfigurasi, seluruh test DILEWATI dengan alasan yang jelas — tidak
 * pernah dianggap lulus.
 */

loadEnvConfig(process.cwd(), true);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const OLD_PASSWORD = "sandi-lama-uji-yang-panjang-1";
const NEW_PASSWORD = "sandi-baru-uji-yang-panjang-2";
const RESET_SUBJECT = "Reset kata sandi akun Saring";

const skipReason = emailE2ESkipReason();
test.skip(skipReason !== null, skipReason ?? "");

function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

function pool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "disable"
        ? false
        : { rejectUnauthorized: process.env.DATABASE_SSL === "verify-full" },
  });
}

/**
 * Mengosongkan penghitung rate limit alur ini pada database UJI. Tanpa ini,
 * beberapa run berturut-turut dalam satu jam akan kena 429 (register 5/jam),
 * sehingga kegagalan test tidak lagi mencerminkan kondisi aplikasi.
 * Hanya bucket yang dipakai test ini yang disentuh.
 */
async function resetRateLimits(): Promise<void> {
  const db = pool();
  try {
    await db.query(
      `delete from rate_limits
        where bucket like 'register:%'
           or bucket like 'login:%'
           or bucket like 'forgot-password:%'
           or bucket like 'password-reset-email:%'
           or bucket like 'reset-password:%'`,
    );
  } finally {
    await db.end();
  }
}

/** Menunggu token Turnstile tersedia sebelum submit. */
async function submitWithCaptcha(page: Page, buttonName: string): Promise<void> {
  await page.waitForFunction(
    () => {
      const input = document.querySelector<HTMLInputElement>(
        'input[name="cf-turnstile-response"]',
      );
      return Boolean(input?.value && input.value.length > 10);
    },
    undefined,
    { timeout: 25_000 },
  );
  await page.getByRole("button", { name: buttonName }).click();
}

async function registerViaUi(
  page: Page,
  email: string,
  displayName: string,
  password: string,
): Promise<void> {
  await page.goto("/daftar");
  await page.getByLabel("Nama tampilan").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await submitWithCaptcha(page, "Buat akun");
  await expect(page).toHaveURL(/\/akun/, { timeout: 20_000 });
}

async function loginViaUi(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await submitWithCaptcha(page, "Masuk");
}

async function requestResetLink(page: Page, email: string): Promise<void> {
  await page.goto("/lupa-sandi");
  await page.getByLabel("Email akun").fill(email);
  await submitWithCaptcha(page, "Kirim tautan reset");
  await expect(
    page.getByText(/Jika alamat email itu terdaftar/),
  ).toBeVisible({ timeout: 15_000 });
}

async function fillNewPassword(page: Page, password: string): Promise<void> {
  // `exact` penting: label "Ulangi kata sandi baru" juga memuat substring
  // "Kata sandi baru", sehingga tanpa exact locator menjadi ambigu.
  await page.getByLabel("Kata sandi baru", { exact: true }).fill(password);
  await page.getByLabel("Ulangi kata sandi baru", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Simpan kata sandi baru" }).click();
}

function expectedFromAddress(): string {
  const raw = process.env.RESEND_FROM ?? "";
  const match = raw.match(/[^<>\s]+@[^<>\s]+/);
  return match ? match[0].toLowerCase() : raw.toLowerCase();
}

test.describe("Reset kata sandi lewat email", () => {
  test("registrasi, forgot password, email, reset, dan revokasi sesi", async ({
    browser,
    page,
  }) => {
    test.setTimeout(300_000);

    const suffix = uniqueSuffix();
    const inbox = createTestmailInbox(`saring-reset-${suffix}`);
    const db = pool();
    let userId: string | null = null;

    try {
      // Pastikan batas percobaan tidak tersisa dari run sebelumnya.
      await resetRateLimits();

      // A. Akun testing memakai alamat Testmail unik.
      await registerViaUi(page, inbox.email, `Uji Reset ${suffix}`, OLD_PASSWORD);

      // Sesi kedua yang diterbitkan SEBELUM reset, untuk menguji revokasi.
      const oldSession = await browser.newContext();
      const oldPage = await oldSession.newPage();
      await loginViaUi(oldPage, inbox.email, OLD_PASSWORD);
      await expect(oldPage).toHaveURL(/\/akun/, { timeout: 20_000 });

      // /lupa-sandi mengalihkan pengguna yang sudah masuk ke /akun, jadi alur
      // reset dijalankan dari konteks anonim — sama seperti pengguna sungguhan
      // yang membuka tautan reset dari perangkat/browser lain.
      const anonSession = await browser.newContext();
      const anonPage = await anonSession.newPage();

      // B. Forgot password — respons publik tidak menyebut status akun.
      await requestResetLink(anonPage, inbox.email);

      // C. Email benar-benar diterima lewat Testmail.
      const mail = await waitForTestmailEmail({
        tag: inbox.tag,
        since: inbox.startedAt,
        predicate: (candidate) => candidate.subject === RESET_SUBJECT,
      });

      const from = expectedFromAddress();
      expect(from, "RESEND_FROM harus berisi alamat pengirim").toContain("@");
      expect(mail.from.toLowerCase()).toContain(from);
      expect(mail.text ?? "").toMatch(/kata sandi/i);
      expect(`${mail.html ?? ""}${mail.text ?? ""}`).toContain("/reset-sandi?token=");

      const resetLink = extractResetLink(mail);
      expect(resetLink.origin).toBe(new URL(BASE_URL).origin);
      expect(resetLink.pathname).toBe("/reset-sandi");
      const token = resetLink.searchParams.get("token") ?? "";
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

      // D. Reset kata sandi (dari konteks anonim yang membuka tautan email).
      await anonPage.goto(`/reset-sandi?token=${encodeURIComponent(token)}`);
      await expect(
        anonPage.getByRole("heading", { name: "Buat kata sandi baru" }),
      ).toBeVisible();
      await fillNewPassword(anonPage, NEW_PASSWORD);
      await expect(
        anonPage.getByText(/Kata sandi berhasil diperbarui/),
      ).toBeVisible({ timeout: 20_000 });

      // Token disimpan sebagai hash SHA-256 dengan masa berlaku terbatas.
      const stored = await db.query(
        `select token_hash, expires_at, created_at, used_at
           from password_reset_tokens
          where token_hash = $1`,
        [hashResetToken(token)],
      );
      expect(stored.rowCount, "hash token harus tersimpan").toBe(1);
      const row = stored.rows[0];
      expect(row.token_hash).toBe(
        createHash("sha256").update(token, "utf8").digest("hex"),
      );
      expect(row.token_hash).not.toBe(token);
      const ttlMinutes =
        (new Date(row.expires_at).getTime() -
          new Date(row.created_at).getTime()) /
        60_000;
      expect(ttlMinutes).toBeLessThanOrEqual(RESET_TOKEN_TTL_MINUTES + 1);
      expect(row.used_at).not.toBeNull();

      // Kata sandi lama tidak berlaku lagi.
      const checkContext = await browser.newContext();
      const checkPage = await checkContext.newPage();
      await loginViaUi(checkPage, inbox.email, OLD_PASSWORD);
      await expect(
        checkPage.getByRole("alert").filter({ hasText: /tidak cocok/i }),
      ).toBeVisible({ timeout: 15_000 });

      // Kata sandi baru berhasil dipakai.
      await loginViaUi(checkPage, inbox.email, NEW_PASSWORD);
      await expect(checkPage).toHaveURL(/\/akun/, { timeout: 20_000 });

      // Token tidak dapat dipakai dua kali.
      await anonPage.goto(`/reset-sandi?token=${encodeURIComponent(token)}`);
      await fillNewPassword(anonPage, "sandi-ketiga-uji-yang-panjang");
      await expect(
        anonPage.getByRole("alert").filter({
          hasText: /tidak valid atau sudah kedaluwarsa/i,
        }),
      ).toBeVisible({ timeout: 15_000 });

      // Sesi yang diterbitkan sebelum reset tidak lagi memberi akses.
      await oldPage.goto("/akun");
      await expect(oldPage).toHaveURL(/\/masuk/, { timeout: 20_000 });

      await anonSession.close();
      await oldSession.close();
      await checkContext.close();
    } finally {
      const found = await db
        .query(`select id from users where lower(email) = lower($1)`, [
          inbox.email,
        ])
        .catch(() => null);
      userId = found?.rows[0]?.id ?? userId;
      if (userId) {
        await db.query(`delete from users where id = $1`, [userId]).catch(() => {});
      }
      await db.end().catch(() => {});
    }
  });
});