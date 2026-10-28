import { describe, expect, it, vi, afterEach } from "vitest";
import { lookupPhishTank } from "@/lib/reputation/phishtank";

afterEach(() => vi.unstubAllGlobals());

describe("PhishTank adapter", () => {
  it("interprets a verified valid match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: { in_database: true, verified: "y", valid: "y", phish_detail_page: "https://www.phishtank.com/phish_detail.php?phish_id=1" } }), { status: 200 })));
    const result = await lookupPhishTank("https://example.test/login");
    expect(result.status).toBe("match");
    expect(result.verified).toBe(true);
    expect(result.valid).toBe(true);
  });

  it("keeps no-match distinct from safe", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: { in_database: false } }), { status: 200 })));
    const result = await lookupPhishTank("https://example.test");
    expect(result.status).toBe("no-match");
    expect(result.message).toMatch(/bukan bukti/i);
  });

  it("surfaces rate limiting", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 509 })));
    expect((await lookupPhishTank("https://example.test")).status).toBe("rate-limited");
  });
});
