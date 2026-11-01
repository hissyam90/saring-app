import { expect, test, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { sealData } from "iron-session";
import { hashResetToken } from "../../lib/auth/password-reset";

/**
 * Keamanan reset kata sandi yang tidak memerlukan layanan email eksternal:
 * kesetaraan respons, penolakan token, pencabutan sesi, dan kebocoran kunci.
 */

loadEnvConfig(process.cwd(), true);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7Vd0Mz1uZ1VZ3r0lQ8bO5aQ0Wq6y0Ku";
const OLD_PASSWORD = "sandi-lama-secure-uji-456";
const NEW_PASSWORD = "sandi-baru-secure-uji-123";

function pool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "disable"
        ? false
        : { rejectUnauthorized: process.env.DATABASE_SSL === "verify-full" },
  });
}

async function insertUser(
  email: string,
  passwordHash: string = PASSWORD_HASH,
): Promise<string> {
  const db = pool();
  try {
    const result = await db.query(
      `insert into users (email, display_name, password_hash)
       values (lower($1), $2, $3) returning id`,
      [email, `Uji ${email.slice(0, 12)}`, passwordHash],
    );
    return String(result.rows[0].id);
  } finally {
    await db.end();
  }
}

async function deleteUser(id: string): Promise<void> {
  const db = pool();
  try {
    await db.query(`delete from users where id = $1`, [id]);
  } finally {
    await db.end();
  }
}

async function insertResetToken(
  userId: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  const db = pool();
  try {
    await db.query(
      `insert into password_reset_tokens (user_id, token_hash, expires_at)
       values ($1, $2, $3)`,
      [userId, hashResetToken(token), expiresAt.toISOString()],
    );
  } finally {
    await db.end();
  }
}

/**
 * Mengosongkan penghitung rate limit khusus alur ini pada database UJI, agar
 * hasil test tidak bergantung pada run sebelumnya dalam jendela 15 menit.
 * Hanya menyentuh bucket yang memang dipakai test ini.
 */
async function resetRateLimits(): Promise<void> {
  const db = pool();
  try {
    await db.query(
      `delete from rate_limits
        where bucket like 'reset-password:%'
           or bucket like 'forgot-password:%'
           or bucket like 'password-reset-email:%'
           or bucket like 'login:%'`,
    );
  } finally {
    await db.end();
  }
}

/**
 * Menunggu token Turnstile benar-benar tersedia. Widget (kunci uji Cloudflare)
 * menaruh token pada input tersembunyi `cf-turnstile-response`.
 */
async function waitForTurnstileToken(page: Page): Promise<void> {
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
}

/**
 * Mengirim permintaan reset lewat UI (termasuk widget Turnstile) dan
 * mengembalikan status, pesan publik, serta body mentah untuk pemeriksaan
 * kebocoran data.
 */
async function requestReset(
  page: Page,
  address: string,
): Promise<{ status: number; message: string; raw: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/lupa-sandi");
    await page.getByLabel("Email akun").fill(address);
    await waitForTurnstileToken(page);

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/auth/forgot-password"),
    );
    await page.getByRole("button", { name: "Kirim tautan reset" }).click();
    const response = await responsePromise;
    const raw = await response.text();
    let message = "";
    try {
      message = (JSON.parse(raw) as { message?: string }).message ?? "";
    } catch {
      message = "";
    }

    if (response.status() === 200) {
      return { status: 200, message, raw };
    }
  }
  throw new Error("Permintaan reset tidak berhasil dikirim (CAPTCHA gagal?).");
}

/** Login lewat UI dengan menunggu token Turnstile lebih dulu. */
async function loginViaUi(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await waitForTurnstileToken(page);
  await page.getByRole("button", { name: "Masuk" }).click();
}

test.describe("Reset kata sandi — keamanan", () => {
  test.beforeEach(async () => {
    await resetRateLimits();
  });

  test("respons forgot password setara untuk email terdaftar dan tidak", async ({
    page,
  }) => {
    const email = `pwreset-enum-${randomUUID().slice(0, 8)}@contoh.test`;
    const userId = await insertUser(email);

    try {
      const known = await requestReset(page, email);
      const unknown = await requestReset(
        page,
        `pwreset-missing-${randomUUID().slice(0, 8)}@contoh.test`,
      );

      expect(known.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(known.message).toBe(unknown.message);
      expect(known.message.length).toBeGreaterThan(10);
    } finally {
      await deleteUser(userId);
    }
  });

  test("token tidak valid, kedaluwarsa, dan dipakai ulang ditolak", async ({
    request,
  }) => {
    const email = `pwreset-token-${randomUUID().slice(0, 8)}@contoh.test`;
    const userId = await insertUser(email);
    const validToken = randomBytes(32).toString("base64url");

    try {
      const malformed = await request.post("/api/auth/reset-password", {
        data: { token: "short", password: NEW_PASSWORD },
      });
      expect(malformed.status()).toBe(400);

      const unknown = await request.post("/api/auth/reset-password", {
        data: {
          token: randomBytes(32).toString("base64url"),
          password: NEW_PASSWORD,
        },
      });
      expect(unknown.status()).toBe(400);

      await insertResetToken(userId, validToken, new Date(Date.now() - 60_000));
      const expired = await request.post("/api/auth/reset-password", {
        data: { token: validToken, password: NEW_PASSWORD },
      });
      expect(expired.status()).toBe(400);

      const freshToken = randomBytes(32).toString("base64url");
      await insertResetToken(
        userId,
        freshToken,
        new Date(Date.now() + 10 * 60_000),
      );
      const first = await request.post("/api/auth/reset-password", {
        data: { token: freshToken, password: NEW_PASSWORD },
      });
      expect(first.status()).toBe(200);

      const second = await request.post("/api/auth/reset-password", {
        data: { token: freshToken, password: "sandi-lain-lagi-123456" },
      });
      expect(second.status()).toBe(400);
    } finally {
      await deleteUser(userId);
    }
  });

  test("reset kata sandi mencabut sesi yang sudah diterbitkan", async ({
    browser,
    request,
  }) => {
    const email = `pwreset-session-${randomUUID().slice(0, 8)}@contoh.test`;
    const userId = await insertUser(email);
    const token = randomBytes(32).toString("base64url");

    try {
      await insertResetToken(userId, token, new Date(Date.now() + 10 * 60_000));

      const context = await browser.newContext();
      const sealed = await sealData(
        { userId, role: "user", issuedAt: Date.now(), version: 0 },
        { password: process.env.SESSION_SECRET as string, ttl: 60 * 60 },
      );
      await context.addCookies([
        {
          name: "saring_session",
          value: sealed,
          url: BASE_URL,
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);

      const page = await context.newPage();
      await page.goto("/akun");
      await expect(page).toHaveURL(/\/akun/);

      const reset = await request.post("/api/auth/reset-password", {
        data: { token, password: NEW_PASSWORD },
      });
      expect(reset.status()).toBe(200);

      // Cookie lama masih dikirim browser, tetapi versinya tidak lagi cocok.
      const me = await context.request.get("/api/auth/me");
      expect(me.status()).toBe(200);
      expect((await me.json()) as { user: unknown }).toEqual({ user: null });

      await page.goto("/akun");
      await expect(page).toHaveURL(/\/masuk/);
      await context.close();
    } finally {
      await deleteUser(userId);
    }
  });

  test("kunci layanan tidak dikirim ke browser", async ({ page, request }) => {
    const secrets = [process.env.RESEND_API_KEY, process.env.TESTMAIL_APIKEY]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value && value.length >= 8));

    for (const path of ["/masuk", "/lupa-sandi", "/reset-sandi?token=tidak-valid"]) {
      await page.goto(path);
      const html = await page.content();
      for (const secret of secrets) {
        expect(html).not.toContain(secret);
      }

      const sources = await page
        .locator("script[src]")
        .evaluateAll((nodes) =>
          nodes.map((node) => (node as HTMLScriptElement).src),
        );
      for (const src of sources) {
        const response = await request.get(src);
        const body = await response.text();
        for (const secret of secrets) {
          expect(body, `kunci bocor di ${src}`).not.toContain(secret);
        }
      }
    }
  });

  test("kata sandi lama ditolak dan kata sandi baru berhasil setelah reset", async ({
    page,
    request,
  }) => {
    const email = `pwreset-rotate-${randomUUID().slice(0, 8)}@contoh.test`;
    const oldHash = await bcrypt.hash(OLD_PASSWORD, 12);
    const userId = await insertUser(email, oldHash);
    const token = randomBytes(32).toString("base64url");

    try {
      await insertResetToken(userId, token, new Date(Date.now() + 10 * 60_000));

      const reset = await request.post("/api/auth/reset-password", {
        data: { token, password: NEW_PASSWORD },
      });
      expect(reset.status()).toBe(200);

      // Hash di database: bcrypt baru, bukan plaintext, token sudah terpakai.
      const db = pool();
      try {
        const row = (
          await db.query(
            `select u.password_hash, t.used_at
               from users u
               join password_reset_tokens t on t.user_id = u.id
              where u.id = $1 and t.token_hash = $2`,
            [userId, hashResetToken(token)],
          )
        ).rows[0];
        expect(row).toBeDefined();
        const storedHash = String(row.password_hash);
        expect(storedHash).not.toBe(oldHash);
        expect(storedHash).not.toBe(NEW_PASSWORD);
        expect(storedHash).toMatch(/^\$2[aby]\$/);
        expect(await bcrypt.compare(NEW_PASSWORD, storedHash)).toBe(true);
        expect(await bcrypt.compare(OLD_PASSWORD, storedHash)).toBe(false);
        expect(row.used_at).not.toBeNull();
      } finally {
        await db.end();
      }

      // Kata sandi lama harus ditolak. Locator dibatasi pada teks error form,
      // karena Next.js juga merender route announcer ber-role="alert".
      await loginViaUi(page, email, OLD_PASSWORD);
      await expect(
        page.getByRole("alert").filter({ hasText: /tidak cocok/i }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(page).toHaveURL(/\/masuk/);

      // Kata sandi baru harus berhasil.
      await loginViaUi(page, email, NEW_PASSWORD);
      await expect(page).toHaveURL(/\/akun/, { timeout: 20_000 });
    } finally {
      await deleteUser(userId);
    }
  });

  test("token tidak hangus ketika pembaruan kata sandi gagal (rollback)", async ({
    request,
  }) => {
    const email = `pwreset-rollback-${randomUUID().slice(0, 8)}@contoh.test`;
    const userId = await insertUser(email);
    const token = randomBytes(32).toString("base64url");
    const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
    const fnName = `saring_fail_pw_${suffix}`;
    const trgName = `saring_fail_pw_trg_${suffix}`;
    const db = pool();

    try {
      await insertResetToken(userId, token, new Date(Date.now() + 10 * 60_000));

      // Gangguan buatan: UPDATE users gagal DI DALAM transaksi reset.
      await db.query(
        `create function ${fnName}() returns trigger language plpgsql as $$
         begin
           if new.id = '${userId}'::uuid then
             raise exception 'forced password update failure';
           end if;
           return new;
         end $$;`,
      );
      await db.query(
        `create trigger ${trgName} before update of password_hash on users
           for each row execute function ${fnName}();`,
      );

      const failed = await request.post("/api/auth/reset-password", {
        data: { token, password: NEW_PASSWORD },
      });
      expect(failed.status()).toBe(500);

      // Rollback: token belum terpakai dan kata sandi lama tidak berubah.
      const tokenRow = await db.query(
        `select used_at from password_reset_tokens where token_hash = $1`,
        [hashResetToken(token)],
      );
      expect(tokenRow.rows[0]?.used_at).toBeNull();
      const userRow = await db.query(
        `select password_hash from users where id = $1`,
        [userId],
      );
      expect(String(userRow.rows[0]?.password_hash)).toBe(PASSWORD_HASH);

      // Setelah gangguan hilang, token yang sama masih dapat dipakai.
      await db.query(`drop trigger ${trgName} on users`);
      await db.query(`drop function ${fnName}()`);

      const retry = await request.post("/api/auth/reset-password", {
        data: { token, password: NEW_PASSWORD },
      });
      expect(retry.status()).toBe(200);
    } finally {
      await db.query(`drop trigger if exists ${trgName} on users`).catch(() => {});
      await db.query(`drop function if exists ${fnName}()`).catch(() => {});
      await db.end().catch(() => {});
      await deleteUser(userId);
    }
  });

  test("respons reset tidak membocorkan token, kata sandi, atau kunci layanan", async ({
    request,
  }) => {
    const email = `pwreset-leak-${randomUUID().slice(0, 8)}@contoh.test`;
    const userId = await insertUser(email);
    const token = randomBytes(32).toString("base64url");
    const secrets = [process.env.RESEND_API_KEY, process.env.TESTMAIL_APIKEY]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value && value.length >= 8));

    try {
      await insertResetToken(userId, token, new Date(Date.now() + 10 * 60_000));

      const reset = await request.post("/api/auth/reset-password", {
        data: { token, password: NEW_PASSWORD },
      });
      expect(reset.status()).toBe(200);

      const body = await reset.text();
      const parsed = JSON.parse(body) as Record<string, unknown>;
      expect(Object.keys(parsed).sort()).toEqual(["message", "ok"]);
      expect(body).not.toContain(token);
      expect(body).not.toContain(hashResetToken(token));
      expect(body).not.toContain(NEW_PASSWORD);
      expect(body).not.toMatch(/bearer/i);
      for (const secret of secrets) {
        expect(body).not.toContain(secret);
      }
    } finally {
      await deleteUser(userId);
    }
  });
});