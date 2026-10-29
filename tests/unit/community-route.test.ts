import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

/**
 * Endpoint komunitas diuji langsung untuk membuktikan dua hal yang mudah
 * "terlihat ada" tetapi tidak terhubung: verifikasi CAPTCHA di server dan
 * rate limiting yang benar-benar aktif pada route.
 */

const session = vi.hoisted(() => ({ userId: undefined as string | undefined }));

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ userId: session.userId }),
}));

const { POST } = await import("@/app/api/community/threads/route");

const validThread = {
  title: "Pertanyaan tentang tautan kurir palsu",
  category: "phishing",
  body: "Saya menerima pesan yang mengaku dari kurir dan meminta biaya tambahan. Apakah ini mencurigakan?",
  captchaToken: "token-dari-widget",
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://saring.test/api/community/threads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://saring.test",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function siteverify(ok: boolean) {
  const fn = vi.fn(async () =>
    new Response(JSON.stringify({ success: ok, action: "thread" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(async () => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "secret-tidak-nyata");
  vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY", "site-key");
  vi.stubEnv("SARING_TURNSTILE_BYPASS", "");
  __resetMemoryStore();

  const user = await getStore().createUser({
    email: "penulis@contoh.test",
    displayName: "Penulis Uji",
    passwordHash: "hash-tidak-dipakai-di-tes",
  });
  session.userId = user.id;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  session.userId = undefined;
});

describe("POST /api/community/threads", () => {
  it("menolak pengunjung tanpa sesi", async () => {
    session.userId = undefined;
    const response = await POST(post(validThread));
    expect(response.status).toBe(401);
  });

  it("menolak request lintas situs", async () => {
    const response = await POST(
      post(validThread, { origin: "https://penipu.test" }),
    );
    expect(response.status).toBe(403);
  });

  it("menolak token CAPTCHA yang gagal diverifikasi server", async () => {
    const fetchMock = siteverify(false);

    const response = await POST(post(validThread));

    expect(response.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Tidak ada diskusi yang tersimpan saat CAPTCHA gagal.
    expect((await getStore().listThreads({ page: 1, pageSize: 10 })).total).toBe(0);
  });

  it("menolak permintaan tanpa token CAPTCHA", async () => {
    const fetchMock = siteverify(true);

    const response = await POST(post({ ...validThread, captchaToken: undefined }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menyimpan diskusi hanya setelah CAPTCHA terverifikasi", async () => {
    siteverify(true);

    const response = await POST(post(validThread));

    expect(response.status).toBe(201);
    const result = await getStore().listThreads({ page: 1, pageSize: 10 });
    expect(result.total).toBe(1);
    expect(result.items[0].authorName).toBe("Penulis Uji");
  });

  it("menerapkan rate limit pada route, bukan hanya di modul", async () => {
    siteverify(true);

    for (let i = 0; i < RATE_LIMITS.threadCreate.limit; i += 1) {
      const allowed = await POST(post(validThread));
      expect(allowed.status).toBe(201);
    }

    const blocked = await POST(post(validThread));

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe(
      String(RATE_LIMITS.threadCreate.windowSeconds),
    );
    expect((await getStore().listThreads({ page: 1, pageSize: 50 })).total).toBe(
      RATE_LIMITS.threadCreate.limit,
    );
  });
});
