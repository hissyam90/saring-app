import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";
import { createResetToken } from "@/lib/auth/password-reset";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const destroySession = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/lib/auth/session", () => ({
  destroySession,
  getSession: async () => ({}),
}));

const { POST: forgotPassword } = await import(
  "@/app/api/auth/forgot-password/route"
);
const { POST: resetPassword } = await import(
  "@/app/api/auth/reset-password/route"
);

const OLD_PASSWORD = "sandi-lama-uji-123";
const NEW_PASSWORD = "kata-sandi-baru-123";

/** Semua output konsol selama satu test, untuk memeriksa kebocoran. */
const capturedLogs: string[] = [];

function post(path: string, body: unknown): Request {
  return new Request(`https://saring.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "saring.test",
      origin: "https://saring.test",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "");
  vi.stubEnv("SARING_TURNSTILE_BYPASS", "1");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("RESEND_FROM", "");
  __resetMemoryStore();
  destroySession.mockClear();
  capturedLogs.length = 0;
  for (const level of ["log", "warn", "error", "info", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      capturedLogs.push(args.map((arg) => String(arg)).join(" "));
    });
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/auth/forgot-password", () => {
  it("memberi respons yang sama untuk email terdaftar dan tidak terdaftar", async () => {
    await getStore().createUser({
      email: "terdaftar@contoh.test",
      displayName: "Pengguna Terdaftar",
      passwordHash: "hash-lama",
    });

    const known = await forgotPassword(
      post("/api/auth/forgot-password", { email: "terdaftar@contoh.test" }),
    );
    const unknown = await forgotPassword(
      post("/api/auth/forgot-password", { email: "tidak-ada@contoh.test" }),
    );

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
  });

  it("tidak menyimpan token untuk email yang tidak terdaftar", async () => {
    const response = await forgotPassword(
      post("/api/auth/forgot-password", { email: "tidak-ada@contoh.test" }),
    );
    expect(response.status).toBe(200);

    // Tidak ada akun, jadi tidak ada token yang bisa dipakai.
    const token = createResetToken();
    expect(await getStore().consumePasswordResetToken(token.tokenHash)).toBeNull();
  });

  it("menolak email dengan format tidak valid", async () => {
    const response = await forgotPassword(
      post("/api/auth/forgot-password", { email: "bukan-email" }),
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/auth/reset-password", () => {
  async function createUserWithToken() {
    const store = getStore();
    const user = await store.createUser({
      email: "reset@contoh.test",
      displayName: "Pengguna Reset",
      passwordHash: await hashPassword(OLD_PASSWORD),
    });
    const token = createResetToken();
    await store.createPasswordResetToken({
      userId: user.id,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
    });
    return { user, token };
  }

  it("mengganti kata sandi, memakai token sekali, dan menghapus sesi", async () => {
    const { token } = await createUserWithToken();

    const response = await resetPassword(
      post("/api/auth/reset-password", {
        token: token.token,
        password: NEW_PASSWORD,
      }),
    );
    expect(response.status).toBe(200);
    expect(destroySession).toHaveBeenCalledTimes(1);

    const stored = await getStore().findUserByEmail("reset@contoh.test");
    expect(stored!.passwordHash).not.toBe(NEW_PASSWORD);
    expect(stored!.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(await verifyPassword(NEW_PASSWORD, stored!.passwordHash)).toBe(true);
    // Kata sandi lama tidak lagi cocok dengan hash yang tersimpan.
    expect(await verifyPassword(OLD_PASSWORD, stored!.passwordHash)).toBe(false);
    expect(await getStore().getSessionVersion(stored!.id)).toBe(1);

    const reuse = await resetPassword(
      post("/api/auth/reset-password", {
        token: token.token,
        password: "kata-sandi-lain-123",
      }),
    );
    expect(reuse.status).toBe(400);
  });

  it("respons reset hanya memuat ok dan message tanpa token atau kata sandi", async () => {
    const { token } = await createUserWithToken();
    const response = await resetPassword(
      post("/api/auth/reset-password", {
        token: token.token,
        password: NEW_PASSWORD,
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["message", "ok"]);
    const raw = JSON.stringify(payload);
    expect(raw).not.toContain(token.token);
    expect(raw).not.toContain(token.tokenHash);
    expect(raw).not.toContain(NEW_PASSWORD);
  });

  it("tidak mencatat token, kata sandi, atau tautan reset ke log", async () => {
    await getStore().createUser({
      email: "log@contoh.test",
      displayName: "Pengguna Log",
      passwordHash: await hashPassword(OLD_PASSWORD),
    });

    await forgotPassword(
      post("/api/auth/forgot-password", { email: "log@contoh.test" }),
    );

    const { token } = await createUserWithToken();
    await resetPassword(
      post("/api/auth/reset-password", {
        token: token.token,
        password: NEW_PASSWORD,
      }),
    );

    const logs = capturedLogs.join("\n");
    expect(logs).toContain("not-configured");
    expect(logs).not.toContain("token=");
    expect(logs).not.toContain(token.token);
    expect(logs).not.toContain(token.tokenHash);
    expect(logs).not.toContain(NEW_PASSWORD);
    expect(logs).not.toMatch(/bearer/i);
  });

  it("menolak token kedaluwarsa dan token yang tidak dikenal", async () => {
    const store = getStore();
    const user = await store.createUser({
      email: "kedaluwarsa@contoh.test",
      displayName: "Pengguna Kedaluwarsa",
      passwordHash: "hash-lama",
    });
    const expired = createResetToken(Date.now() - 31 * 60_000);
    await store.createPasswordResetToken({
      userId: user.id,
      tokenHash: expired.tokenHash,
      expiresAt: expired.expiresAt,
    });

    const expiredResponse = await resetPassword(
      post("/api/auth/reset-password", {
        token: expired.token,
        password: "kata-sandi-baru-123",
      }),
    );
    expect(expiredResponse.status).toBe(400);

    const unknownResponse = await resetPassword(
      post("/api/auth/reset-password", {
        token: createResetToken().token,
        password: "kata-sandi-baru-123",
      }),
    );
    expect(unknownResponse.status).toBe(400);
    expect(destroySession).not.toHaveBeenCalled();
  });

  it("menolak kata sandi baru yang terlalu pendek", async () => {
    const { token } = await createUserWithToken();
    const response = await resetPassword(
      post("/api/auth/reset-password", { token: token.token, password: "pendek" }),
    );
    expect(response.status).toBe(400);
  });
});