import { describe, expect, it } from "vitest";
import { isSameOrigin } from "@/lib/security/origin";

function request(headers: Record<string, string> = {}) {
  return new Request("https://saring.test/api/community/threads", {
    method: "POST",
    headers,
  });
}

describe("Pemeriksaan asal request (CSRF)", () => {
  it("menerima request same-origin", () => {
    expect(
      isSameOrigin(
        request({
          origin: "https://saring.test",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBe(true);
  });

  it("menolak request lintas situs meski Origin terlihat mirip", () => {
    expect(
      isSameOrigin(
        request({
          origin: "https://penipu.test",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
  });

  it("menolak Sec-Fetch-Site cross-site tanpa Origin", () => {
    expect(isSameOrigin(request({ "sec-fetch-site": "cross-site" }))).toBe(false);
  });

  it("menolak Origin dengan host berbeda walau skema sama", () => {
    expect(
      isSameOrigin(request({ origin: "https://evil.saring.test" })),
    ).toBe(false);
  });

  it("menolak Origin yang tidak dapat diurai", () => {
    expect(isSameOrigin(request({ origin: "bukan-url" }))).toBe(false);
  });

  it("mengizinkan navigasi langsung tanpa Origin (SameSite=Lax jadi lapisan utama)", () => {
    expect(isSameOrigin(request({ "sec-fetch-site": "none" }))).toBe(true);
    expect(isSameOrigin(request())).toBe(true);
  });
});
