import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TURNSTILE_ERROR,
  turnstileConfigured,
  verifyTurnstile,
} from "@/lib/security/turnstile";

const SECRET = "turnstile-secret-not-real";

function mockFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", SECRET);
  vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY", "site-key-not-real");
  vi.stubEnv("SARING_TURNSTILE_BYPASS", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Turnstile: penolakan token", () => {
  it("menolak token kosong tanpa memanggil Siteverify", async () => {
    const fetchMock = mockFetch(async () => json({ success: true }));

    const outcome = await verifyTurnstile("");

    expect(outcome.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak token yang bukan string", async () => {
    const fetchMock = mockFetch(async () => json({ success: true }));

    expect((await verifyTurnstile(undefined)).ok).toBe(false);
    expect((await verifyTurnstile(12345)).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak token yang terlalu panjang sebelum memanggil jaringan", async () => {
    const fetchMock = mockFetch(async () => json({ success: true }));

    expect((await verifyTurnstile("a".repeat(5000))).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak token yang ditandai gagal oleh Siteverify", async () => {
    mockFetch(async () =>
      json({ success: false, "error-codes": ["invalid-input-response"] }),
    );

    const outcome = await verifyTurnstile("token-palsu");

    expect(outcome.ok).toBe(false);
  });

  it("tidak mempercayai success yang bukan boolean true", async () => {
    mockFetch(async () => json({ success: "true" }));
    expect((await verifyTurnstile("token")).ok).toBe(false);
  });
});

describe("Turnstile: verifikasi server", () => {
  it("mengirim secret dan token ke Siteverify, bukan sebaliknya", async () => {
    const fetchMock = mockFetch(async () =>
      json({ success: true, action: "register" }),
    );

    const outcome = await verifyTurnstile("token-sah", "register");

    expect(outcome.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.method).toBe("POST");
    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe(SECRET);
    expect(body.get("response")).toBe("token-sah");
  });

  it("menolak token yang sah untuk action lain", async () => {
    mockFetch(async () => json({ success: true, action: "login" }));

    const outcome = await verifyTurnstile("token-sah", "register");

    expect(outcome.ok).toBe(false);
  });

  it("menolak saat Siteverify membalas non-200", async () => {
    mockFetch(async () => json({ success: true }, 500));
    expect((await verifyTurnstile("token")).ok).toBe(false);
  });

  it("menolak saat Siteverify tidak dapat dihubungi", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect((await verifyTurnstile("token")).ok).toBe(false);
  });

  it("menolak saat Siteverify membalas bukan JSON", async () => {
    mockFetch(
      async () =>
        new Response("<html>error</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    );
    expect((await verifyTurnstile("token")).ok).toBe(false);
  });

  it("tidak membocorkan secret pada pesan error yang ditampilkan", async () => {
    mockFetch(async () => json({ success: false }, 403));
    await verifyTurnstile("token");
    expect(TURNSTILE_ERROR).not.toContain(SECRET);
  });
});

describe("Turnstile: konfigurasi", () => {
  it("fail closed bila secret tidak tersedia di production", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = mockFetch(async () => json({ success: true }));

    const outcome = await verifyTurnstile("token");

    expect(outcome.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tidak mengaktifkan bypass di production meski flag diset", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SARING_TURNSTILE_BYPASS", "1");

    expect((await verifyTurnstile("token")).ok).toBe(false);
  });

  it("mengizinkan bypass hanya di luar production dengan flag eksplisit", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SARING_TURNSTILE_BYPASS", "1");

    const outcome = await verifyTurnstile("token");

    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.skipped).toBe(true);
  });

  it("melaporkan konfigurasi hanya bila site key dan secret tersedia", () => {
    expect(turnstileConfigured()).toBe(true);
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "");
    expect(turnstileConfigured()).toBe(false);
  });
});
