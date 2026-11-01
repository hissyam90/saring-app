import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";
import {
  RESET_TOKEN_TTL_MINUTES,
  createResetToken,
  hashResetToken,
  isWellFormedResetToken,
} from "@/lib/auth/password-reset";
import {
  PASSWORD_RESET_SUBJECT,
  passwordResetEmail,
} from "@/lib/email/password-reset-email";
import { sendPasswordResetEmail } from "@/lib/email/resend";

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  __resetMemoryStore();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("token reset kata sandi", () => {
  it("menghasilkan token acak yang hash-nya berbeda dari token asli", () => {
    const first = createResetToken();
    const second = createResetToken();

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tokenHash).toBe(hashResetToken(first.token));
    expect(first.tokenHash).not.toBe(first.token);
  });

  it("memberi masa berlaku maksimal 30 menit", () => {
    const now = Date.now();
    const token = createResetToken(now);
    const ttlMinutes = (new Date(token.expiresAt).getTime() - now) / 60_000;

    expect(RESET_TOKEN_TTL_MINUTES).toBeLessThanOrEqual(30);
    expect(ttlMinutes).toBe(RESET_TOKEN_TTL_MINUTES);
  });

  it("hanya menerima bentuk token yang dihasilkan sendiri", () => {
    expect(isWellFormedResetToken(createResetToken().token)).toBe(true);
    expect(isWellFormedResetToken("short")).toBe(false);
    expect(isWellFormedResetToken(`${"a".repeat(42)} `)).toBe(false);
  });
});

describe("penyimpanan token reset", () => {
  it("hanya dapat dipakai satu kali", async () => {
    const store = getStore();
    const user = await store.createUser({
      email: "token@contoh.test",
      displayName: "Pengguna Token",
      passwordHash: "hash-lama",
    });
    const token = createResetToken();

    await store.createPasswordResetToken({
      userId: user.id,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
    });

    expect(await store.consumePasswordResetToken(token.tokenHash)).toBe(user.id);
    expect(await store.consumePasswordResetToken(token.tokenHash)).toBeNull();
  });

  it("menolak token yang kedaluwarsa", async () => {
    const store = getStore();
    const user = await store.createUser({
      email: "kadaluwarsa@contoh.test",
      displayName: "Pengguna Kedaluwarsa",
      passwordHash: "hash-lama",
    });
    const token = createResetToken(Date.now() - 31 * 60_000);

    await store.createPasswordResetToken({
      userId: user.id,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
    });

    expect(await store.consumePasswordResetToken(token.tokenHash)).toBeNull();
  });

  it("membatalkan token lama ketika tautan baru dibuat", async () => {
    const store = getStore();
    const user = await store.createUser({
      email: "ganti@contoh.test",
      displayName: "Pengguna Ganti",
      passwordHash: "hash-lama",
    });
    const first = createResetToken();
    const second = createResetToken();

    await store.createPasswordResetToken({
      userId: user.id,
      tokenHash: first.tokenHash,
      expiresAt: first.expiresAt,
    });
    await store.createPasswordResetToken({
      userId: user.id,
      tokenHash: second.tokenHash,
      expiresAt: second.expiresAt,
    });

    expect(await store.consumePasswordResetToken(first.tokenHash)).toBeNull();
    expect(await store.consumePasswordResetToken(second.tokenHash)).toBe(user.id);
  });
});

describe("pergantian kata sandi dan versi sesi", () => {
  it("menyimpan hash baru dan menaikkan versi sesi", async () => {
    const store = getStore();
    const user = await store.createUser({
      email: "versi@contoh.test",
      displayName: "Pengguna Versi",
      passwordHash: "hash-lama",
    });

    expect(await store.getSessionVersion(user.id)).toBe(0);
    await store.setUserPassword(user.id, "hash-baru");
    expect(await store.getSessionVersion(user.id)).toBe(1);

    const updated = await store.findUserByEmail("versi@contoh.test");
    expect(updated?.passwordHash).toBe("hash-baru");
  });
});

describe("template dan pengiriman email", () => {
  it("memakai subjek dan tautan reset yang benar", () => {
    const url = "https://saring.test/reset-sandi?token=contoh-token";
    const email = passwordResetEmail({ resetUrl: url, expiresInMinutes: 30 });

    expect(email.subject).toBe(PASSWORD_RESET_SUBJECT);
    expect(email.text).toContain(url);
    expect(email.html).toContain("token=contoh-token");
    expect(email.text).toContain("30 menit");
    expect(email.text.toLowerCase()).toContain("kata sandi");
  });

  it("tidak memanggil Resend bila konfigurasi belum tersedia", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPasswordResetEmail({
      to: "penerima@contoh.test",
      resetUrl: "https://saring.test/reset-sandi?token=contoh",
      expiresInMinutes: 30,
    });

    expect(result).toEqual({ ok: false, status: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mengirim permintaan ke endpoint Resend dengan header yang benar", async () => {
    vi.stubEnv("RESEND_API_KEY", "kunci-uji");
    vi.stubEnv("RESEND_FROM", "Saring <no-reply@saring.test>");
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "email-1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPasswordResetEmail({
      to: "penerima@contoh.test",
      resetUrl: "https://saring.test/reset-sandi?token=contoh",
      expiresInMinutes: 30,
    });

    expect(result).toEqual({ ok: true, status: "sent" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer kunci-uji");
    expect(String(init.body)).toContain("penerima@contoh.test");
  });
});