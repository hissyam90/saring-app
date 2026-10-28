import { afterEach, describe, expect, it, vi } from "vitest";
import {
  lookupGoogleSafeBrowsing,
  __clearGsbCache,
  GSB_ENDPOINT,
} from "@/lib/reputation/googleSafeBrowsing";

const KEY = "test-key-not-real";
const TARGET = "https://contoh.test/login";

afterEach(() => {
  vi.unstubAllGlobals();
  __clearGsbCache();
});

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

describe("Google Safe Browsing v5: permintaan", () => {
  it("memakai GET dengan query urls dan key, tanpa request body", async () => {
    const fetchMock = mockFetch(async () => json({ threats: [] }));

    await lookupGoogleSafeBrowsing(TARGET, KEY);

    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(calledUrl.startsWith(GSB_ENDPOINT)).toBe(true);

    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get("urls")).toBe(TARGET);
    expect(parsed.searchParams.get("key")).toBe(KEY);

    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("tidak memanggil jaringan bila API key tidak tersedia", async () => {
    const fetchMock = mockFetch(async () => json({ threats: [] }));

    const result = await lookupGoogleSafeBrowsing(TARGET, undefined);

    expect(result.status).toBe("not-configured");
    expect(result.inconclusive).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.message).toMatch(/belum dikonfigurasi/i);
  });
});

describe("Google Safe Browsing v5: hasil", () => {
  it("membaca ancaman beserta jenisnya dan atribusi", async () => {
    mockFetch(async () =>
      json({
        threats: [
          { url: TARGET, threatTypes: ["SOCIAL_ENGINEERING", "MALWARE"] },
        ],
        cacheDuration: "300s",
      }),
    );

    const result = await lookupGoogleSafeBrowsing(TARGET, KEY);

    expect(result.status).toBe("threat");
    expect(result.matched).toBe(true);
    expect(result.inconclusive).toBe(false);
    expect(result.threats).toHaveLength(1);
    expect(result.threats[0].threatTypes).toEqual([
      "SOCIAL_ENGINEERING",
      "MALWARE",
    ]);
    expect(result.threats[0].labels).toContain("Penipuan atau phishing");
    expect(result.attribution?.text).toBe("Advisory provided by Google");
    expect(result.attribution?.url).toContain("safe-browsing");
  });

  it("memperlakukan threats kosong sebagai no-match, bukan aman", async () => {
    mockFetch(async () => json({ threats: [] }));

    const result = await lookupGoogleSafeBrowsing(TARGET, KEY);

    expect(result.status).toBe("no-match");
    expect(result.matched).toBe(false);
    expect(result.inconclusive).toBe(false);
    expect(result.message).toMatch(/bukan jaminan/i);
  });

  it("menerima respons tanpa field threats sebagai no-match", async () => {
    mockFetch(async () => json({ cacheDuration: "60s" }));
    expect((await lookupGoogleSafeBrowsing(TARGET, KEY)).status).toBe("no-match");
  });

  it("memperlakukan body kosong (HTTP 200) sebagai no-match", async () => {
    // Perilaku nyata Google v5: tanpa ancaman, body bisa kosong sama sekali.
    mockFetch(async () => new Response("", { status: 200 }));
    const result = await lookupGoogleSafeBrowsing(TARGET, KEY);
    expect(result.status).toBe("no-match");
    expect(result.httpStatus).toBe(200);
    expect(result.message).toMatch(/bukan jaminan/i);
  });
});

describe("Google Safe Browsing v5: kegagalan", () => {
  it("membedakan API key tidak valid (HTTP 400)", async () => {
    mockFetch(async () =>
      json(
        {
          error: {
            code: 400,
            status: "INVALID_ARGUMENT",
            details: [{ reason: "API_KEY_INVALID" }],
          },
        },
        400,
      ),
    );

    const result = await lookupGoogleSafeBrowsing(TARGET, KEY);
    expect(result.status).toBe("unauthorized");
    expect(result.inconclusive).toBe(true);
  });

  it("membedakan akses ditolak (HTTP 403)", async () => {
    mockFetch(async () => json({ error: { code: 403 } }, 403));
    const result = await lookupGoogleSafeBrowsing(TARGET, KEY);
    expect(result.status).toBe("unauthorized");
    expect(result.httpStatus).toBe(403);
  });

  it("membedakan kuota tercapai (HTTP 429)", async () => {
    mockFetch(async () => json({ error: { code: 429 } }, 429));
    const result = await lookupGoogleSafeBrowsing(TARGET, KEY);
    expect(result.status).toBe("quota-exceeded");
    expect(result.httpStatus).toBe(429);
  });

  it("membedakan kegagalan server (HTTP 500)", async () => {
    mockFetch(async () => json({}, 500));
    const result = await lookupGoogleSafeBrowsing(TARGET, KEY);
    expect(result.status).toBe("http-error");
    expect(result.inconclusive).toBe(true);
  });

  it("membedakan timeout", async () => {
    mockFetch(async () => {
      const error = new Error("aborted due to timeout");
      error.name = "TimeoutError";
      throw error;
    });
    expect((await lookupGoogleSafeBrowsing(TARGET, KEY)).status).toBe("timeout");
  });

  it("membedakan gangguan jaringan", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect((await lookupGoogleSafeBrowsing(TARGET, KEY)).status).toBe(
      "http-error",
    );
  });

  it("menolak JSON rusak", async () => {
    mockFetch(
      async () =>
        new Response("<html>bukan json</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    );
    expect((await lookupGoogleSafeBrowsing(TARGET, KEY)).status).toBe(
      "invalid-response",
    );
  });

  it("menolak threats yang bukan array", async () => {
    mockFetch(async () => json({ threats: "ada" }));
    expect((await lookupGoogleSafeBrowsing(TARGET, KEY)).status).toBe(
      "invalid-response",
    );
  });

  it("menolak entri ancaman tanpa url", async () => {
    mockFetch(async () => json({ threats: [{ threatTypes: ["MALWARE"] }] }));
    expect((await lookupGoogleSafeBrowsing(TARGET, KEY)).status).toBe(
      "invalid-response",
    );
  });

  it("tidak membocorkan API key di pesan hasil", async () => {
    mockFetch(async () => json({ error: { code: 403 } }, 403));
    const result = await lookupGoogleSafeBrowsing("https://x.test", KEY);
    expect(JSON.stringify(result)).not.toContain(KEY);
  });

  it("membaca respons protobuf nyata sebagai ancaman", async () => {
    const bytes = Buffer.from(
      "0a410a3c746573747361666562726f7773696e672e61707073706f742e636f6d2f61706976342f414e595f504c4154464f524d2f4d414c574152452f55524c2f120101120308ac02",
      "hex",
    );
    mockFetch(
      async () =>
        new Response(bytes, {
          status: 200,
          headers: { "Content-Type": "application/x-protobuf" },
        }),
    );

    const result = await lookupGoogleSafeBrowsing(
      "https://testsafebrowsing.appspot.com/apiv4/ANY_PLATFORM/MALWARE/URL/",
      KEY,
    );

    expect(result.status).toBe("threat");
    expect(result.threats[0].threatTypes).toEqual(["MALWARE"]);
    expect(result.threats[0].labels).toContain("Malware");
    expect(result.attribution?.text).toBe("Advisory provided by Google");
  });
});

describe("Google Safe Browsing v5: cache", () => {
  it("memakai cache dan tidak memanggil ulang jaringan", async () => {
    const fetchMock = mockFetch(async () => json({ threats: [] }));

    const first = await lookupGoogleSafeBrowsing(TARGET, KEY);
    expect(first.cacheHit).toBe(false);

    const second = await lookupGoogleSafeBrowsing(TARGET, KEY);
    expect(second.cacheHit).toBe(true);
    expect(second.status).toBe("no-match");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("menghormati cacheDuration dari respons", async () => {
    mockFetch(async () => json({ threats: [], cacheDuration: "120s" }));
    const result = await lookupGoogleSafeBrowsing(TARGET, KEY);
    expect(result.expiresAt).toBeDefined();
    const ttl = new Date(result.expiresAt!).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(60_000);
    expect(ttl).toBeLessThanOrEqual(121_000);
  });
});