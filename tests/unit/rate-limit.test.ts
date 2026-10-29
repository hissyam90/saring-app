import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientKey,
  type RateLimitRule,
} from "@/lib/security/rate-limit";

const rule: RateLimitRule = { name: "test-bucket", limit: 3, windowSeconds: 60 };

beforeEach(() => {
  __resetMemoryStore();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function request(headers: Record<string, string> = {}) {
  return new Request("https://saring.test/api/community/threads", {
    method: "POST",
    headers,
  });
}

describe("Rate limit: penghitung", () => {
  it("mengizinkan request sampai batas lalu menolak", async () => {
    for (let i = 0; i < rule.limit; i += 1) {
      expect((await checkRateLimit(rule, "klien-a")).allowed).toBe(true);
    }

    const blocked = await checkRateLimit(rule, "klien-a");

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBe(rule.windowSeconds);
  });

  it("memakai bucket terpisah untuk setiap klien", async () => {
    for (let i = 0; i < rule.limit; i += 1) {
      await checkRateLimit(rule, "klien-a");
    }

    expect((await checkRateLimit(rule, "klien-a")).allowed).toBe(false);
    expect((await checkRateLimit(rule, "klien-b")).allowed).toBe(true);
  });

  it("menghitung sisa kuota dengan benar", async () => {
    const first = await checkRateLimit(rule, "klien-c");
    expect(first.remaining).toBe(rule.limit - 1);
  });

  it("fail closed bila penyimpanan penghitung gagal", async () => {
    vi.spyOn(getStore(), "incrementRateLimit").mockRejectedValue(
      new Error("database tidak tersedia"),
    );

    const result = await checkRateLimit(rule, "klien-d");

    // Kegagalan backend tidak boleh membuka pintu penyalahgunaan.
    expect(result.allowed).toBe(false);
  });

  it("memakai backend bersama (PostgreSQL) pada store produksi", async () => {
    const spy = vi.spyOn(getStore(), "incrementRateLimit");
    await checkRateLimit(rule, "klien-e");
    expect(spy).toHaveBeenCalledWith("klien-e", rule.windowSeconds);
  });

  it("mendefinisikan aturan untuk endpoint sensitif", () => {
    for (const key of [
      "login",
      "register",
      "threadCreate",
      "replyCreate",
      "submissionCreate",
      "submissionUpdate",
      "reportCreate",
      "urlCheck",
      "moderate",
    ] as const) {
      expect(RATE_LIMITS[key].limit).toBeGreaterThan(0);
      expect(RATE_LIMITS[key].windowSeconds).toBeGreaterThan(0);
    }
  });
});

describe("Rate limit: identitas klien", () => {
  it("tidak mempercayai header IP apa pun bila proxy tidak dikonfigurasi", () => {
    vi.stubEnv("SARING_TRUST_PROXY", "");

    const key = clientKey(
      request({
        "cf-connecting-ip": "203.0.113.7",
        "x-forwarded-for": "203.0.113.7",
        "x-real-ip": "203.0.113.7",
      }),
      "login",
    );

    expect(key).toBe("login:unknown");
  });

  it("memakai cf-connecting-ip pada mode cloudflare", () => {
    vi.stubEnv("SARING_TRUST_PROXY", "cloudflare");

    const key = clientKey(
      request({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "10.0.0.1" }),
      "login",
    );

    expect(key).toBe("login:203.0.113.7");
  });

  it("menolak nilai IP yang tidak wajar pada mode cloudflare", () => {
    vi.stubEnv("SARING_TRUST_PROXY", "cloudflare");

    const key = clientKey(
      request({ "cf-connecting-ip": "203.0.113.7, 10.0.0.1" }),
      "login",
    );

    expect(key).toBe("login:unknown");
  });

  it("hanya mempercayai hop terakhir x-forwarded-for pada mode heroku", () => {
    vi.stubEnv("SARING_TRUST_PROXY", "heroku");

    const key = clientKey(
      request({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }),
      "login",
    );

    // Entri paling kiri bisa dikirim klien; yang dipakai hop dari router.
    expect(key).toBe("login:203.0.113.9");
  });

  it("kembali ke bucket unknown bila header proxy tidak ada", () => {
    vi.stubEnv("SARING_TRUST_PROXY", "heroku");
    expect(clientKey(request(), "login")).toBe("login:unknown");
  });

  it("memisahkan scope sehingga bucket antar endpoint tidak tercampur", () => {
    vi.stubEnv("SARING_TRUST_PROXY", "cloudflare");
    const headers = { "cf-connecting-ip": "203.0.113.7" };

    expect(clientKey(request(headers), "login")).not.toBe(
      clientKey(request(headers), "register"),
    );
  });
});
