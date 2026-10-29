import { getStore } from "@/lib/db";
import { DUMMY_HASH, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/security/rate-limit";
import { loginSchema, firstError } from "@/lib/security/validation";
import { verifyTurnstile, TURNSTILE_ERROR } from "@/lib/security/turnstile";

const GENERIC = "Email atau kata sandi tidak cocok.";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const limit = await checkRateLimit(
      RATE_LIMITS.login,
      clientKey(request, "login"),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    const captcha = await verifyTurnstile(parsed.data.captchaToken, "login");
    if (!captcha.ok) return fail(TURNSTILE_ERROR, 400);

    const store = getStore();
    const record = await store.findUserByEmail(parsed.data.email);

    // Selalu jalankan perbandingan agar waktu respons tidak membocorkan
    // apakah email terdaftar.
    const ok = await verifyPassword(
      parsed.data.password,
      record?.passwordHash ?? DUMMY_HASH,
    );

    if (!record || !ok) return fail(GENERIC, 401);

    await createSession(record.id, record.role);
    return json({ id: record.id, displayName: record.displayName, role: record.role });
  });
}