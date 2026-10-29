import { afterEach, describe, expect, it, vi } from "vitest";
import { isSameOrigin } from "@/lib/security/origin";

/**
 * Request dibuat dengan header `host` eksplisit karena itulah yang dikirim
 * browser. `request.url` sengaja dibuat berbeda di beberapa kasus untuk
 * memastikan pemeriksaan tidak bergantung pada host internal Next.js.
 */
function request(
  headers: Record<string, string> = {},
  url = "https://saring.test/api/community/threads",
) {
  return new Request(url, { method: "POST", headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Pemeriksaan asal request (CSRF)", () => {
  it("menerima request same-origin", () => {
    expect(
      isSameOrigin(
        request({
          host: "saring.test",
          origin: "https://saring.test",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBe(true);
  });

  it("membandingkan dengan header Host, bukan host internal request.url", () => {
    // Regresi: Next.js dapat mengisi request.url dengan host internal server
    // (mis. localhost) walaupun request datang lewat domain lain. Perilaku lama
    // menolak semua POST dari browser karena membandingkan dengan request.url.
    expect(
      isSameOrigin(
        request(
          {
            host: "127.0.0.1:3100",
            origin: "http://127.0.0.1:3100",
            "sec-fetch-site": "same-origin",
          },
          "http://localhost:3100/api/community/submissions",
        ),
      ),
    ).toBe(true);
  });

  it("menolak request lintas situs", () => {
    expect(
      isSameOrigin(
        request({
          host: "saring.test",
          origin: "https://penipu.test",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
  });

  it("menolak Sec-Fetch-Site cross-site tanpa Origin", () => {
    expect(
      isSameOrigin(request({ host: "saring.test", "sec-fetch-site": "cross-site" })),
    ).toBe(false);
  });

  it("menolak Origin dengan host berbeda walau skema sama", () => {
    expect(
      isSameOrigin(
        request({ host: "saring.test", origin: "https://evil.saring.test" }),
      ),
    ).toBe(false);
  });

  it("menolak Origin yang tidak dapat diurai", () => {
    expect(isSameOrigin(request({ host: "saring.test", origin: "bukan-url" }))).toBe(
      false,
    );
  });

  it("menolak bila header Host tidak ada (fail closed)", () => {
    expect(
      isSameOrigin(request({ origin: "https://saring.test" })),
    ).toBe(false);
  });

  it("mengizinkan navigasi langsung tanpa Origin (SameSite=Lax jadi lapisan utama)", () => {
    expect(
      isSameOrigin(request({ host: "saring.test", "sec-fetch-site": "none" })),
    ).toBe(true);
    expect(isSameOrigin(request({ host: "saring.test" }))).toBe(true);
  });

  it("tidak memercayai X-Forwarded-Host tanpa proxy tepercaya", () => {
    expect(
      isSameOrigin(
        request({
          host: "internal.herokuapp.com",
          origin: "https://saring.id",
          "x-forwarded-host": "saring.id",
        }),
      ),
    ).toBe(false);
  });

  it("memakai X-Forwarded-Host bila proxy tepercaya dikonfigurasi", () => {
    vi.stubEnv("SARING_TRUST_PROXY", "cloudflare");

    expect(
      isSameOrigin(
        request({
          host: "internal.herokuapp.com",
          origin: "https://saring.id",
          "x-forwarded-host": "saring.id",
        }),
      ),
    ).toBe(true);
  });

  it("mengabaikan perbedaan skema karena TLS dapat diterminasi proxy", () => {
    expect(
      isSameOrigin(
        request({ host: "saring.id", origin: "https://saring.id" }),
      ),
    ).toBe(true);
  });
});

