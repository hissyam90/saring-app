import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupPhishTank } from "@/lib/reputation/phishtank";

afterEach(() => vi.unstubAllGlobals());

function mockFetch(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("PhishTank adapter", () => {
  it("treats a verified valid match as a match", async () => {
    mockFetch(async () =>
      json({
        results: {
          in_database: true,
          verified: "y",
          valid: "y",
          phish_detail_page: "https://www.phishtank.com/phish_detail.php?phish_id=1",
        },
      }),
    );
    const result = await lookupPhishTank("https://example.test/login");
    expect(result.status).toBe("match");
    expect(result.matched).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.inconclusive).toBe(false);
    expect(result.detailUrl).toContain("phishtank.com");
  });

  it("keeps an explicit no-match distinct from safe", async () => {
    mockFetch(async () => json({ results: { in_database: false } }));
    const result = await lookupPhishTank("https://example.test");
    expect(result.status).toBe("no-match");
    expect(result.matched).toBe(false);
    expect(result.message).toMatch(/bukan bukti/i);
    expect(result.inconclusive).toBe(false);
  });

  it("treats a response without in_database as invalid, NOT no-match", async () => {
    mockFetch(async () => json({ results: { verified: "y" } }));
    const result = await lookupPhishTank("https://example.test");
    expect(result.status).toBe("invalid-response");
    expect(result.matched).toBe(false);
    expect(result.inconclusive).toBe(true);
    expect(result.message).toMatch(/bukan hasil/i);
  });

  it("treats a missing results object as invalid-response", async () => {
    mockFetch(async () => json({ meta: {} }));
    expect((await lookupPhishTank("https://example.test")).status).toBe(
      "invalid-response",
    );
  });

  it("surfaces rate limiting as HTTP 509", async () => {
    mockFetch(async () => new Response("", { status: 509 }));
    const result = await lookupPhishTank("https://example.test");
    expect(result.status).toBe("rate-limited");
    expect(result.httpStatus).toBe(509);
    expect(result.inconclusive).toBe(true);
  });

  it("mentions the app key when rate-limited without one", async () => {
    mockFetch(async () => new Response("", { status: 509 }));
    const result = await lookupPhishTank("https://example.test");
    expect(result.usedKey).toBe(false);
    expect(result.message).toMatch(/API key|PHISHTANK_APP_KEY/i);
  });

  it("distinguishes authorization failures", async () => {
    mockFetch(async () => new Response("", { status: 401 }));
    const result = await lookupPhishTank("https://example.test", "bad-key");
    expect(result.status).toBe("unauthorized");
    expect(result.httpStatus).toBe(401);
    expect(result.usedKey).toBe(true);
    expect(result.message).not.toContain("bad-key");
  });

  it("explains that a key is required when keyless access is refused", async () => {
    mockFetch(async () => new Response("", { status: 403 }));
    const result = await lookupPhishTank("https://example.test");
    expect(result.status).toBe("unauthorized");
    expect(result.usedKey).toBe(false);
    expect(result.message).toMatch(/tanpa app key/i);
    expect(result.message).toMatch(/PHISHTANK_APP_KEY/);
  });

  it("distinguishes 403 from other failures", async () => {
    mockFetch(async () => new Response("", { status: 403 }));
    expect((await lookupPhishTank("https://example.test")).status).toBe(
      "unauthorized",
    );
  });

  it("separates generic HTTP failures", async () => {
    mockFetch(async () => new Response("", { status: 500 }));
    const result = await lookupPhishTank("https://example.test");
    expect(result.status).toBe("http-error");
    expect(result.httpStatus).toBe(500);
  });

  it("distinguishes timeouts", async () => {
    mockFetch(async () => {
      const error = new Error("The operation was aborted due to timeout");
      error.name = "TimeoutError";
      throw error;
    });
    const result = await lookupPhishTank("https://example.test");
    expect(result.status).toBe("timeout");
    expect(result.inconclusive).toBe(true);
  });

  it("distinguishes network errors from timeouts", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect((await lookupPhishTank("https://example.test")).status).toBe(
      "http-error",
    );
  });

  it("handles malformed JSON", async () => {
    mockFetch(
      async () =>
        new Response("<html>not json</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    );
    expect((await lookupPhishTank("https://example.test")).status).toBe(
      "invalid-response",
    );
  });

  it("never reports a conclusion for inconclusive states", async () => {
    mockFetch(async () => new Response("", { status: 509 }));
    const result = await lookupPhishTank("https://example.test");
    expect(result.matched).toBe(false);
    expect(result.inconclusive).toBe(true);
    expect(result.message).not.toMatch(/aman/i);
  });
});