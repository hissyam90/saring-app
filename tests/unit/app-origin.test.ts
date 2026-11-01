import { afterEach, describe, expect, it, vi } from "vitest";
import { appOrigin } from "@/lib/http/app-origin";

function request(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("appOrigin", () => {
  it("production memakai SARING_APP_ORIGIN dan mengabaikan Host", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SARING_APP_ORIGIN", "https://saring.app/");

    const origin = appOrigin(
      request("http://internal-service:3000/api/auth/forgot-password", {
        host: "penipu.test",
        "x-forwarded-proto": "http",
      }),
    );

    expect(origin).toBe("https://saring.app");
  });

  it("production tanpa SARING_APP_ORIGIN gagal tertutup, bukan memakai Host", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SARING_APP_ORIGIN", "");

    const origin = appOrigin(
      request("http://internal-service:3000/api", { host: "penipu.test" }),
    );

    expect(origin).toBeNull();
  });

  it("di luar production memakai host request agar lokal tetap berjalan", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SARING_APP_ORIGIN", "");

    const origin = appOrigin(
      request("http://127.0.0.1:3100/api", { host: "127.0.0.1:3100" }),
    );

    expect(origin).toBe("http://127.0.0.1:3100");
  });

  it("menghormati X-Forwarded-Proto di luar production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SARING_APP_ORIGIN", "");

    const origin = appOrigin(
      request("http://internal:3000/api", {
        host: "saring.test",
        "x-forwarded-proto": "https",
      }),
    );

    expect(origin).toBe("https://saring.test");
  });
});