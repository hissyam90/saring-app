import { getStore } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/security/rate-limit";
import { registerSchema, firstError } from "@/lib/security/validation";
import { verifyTurnstile, TURNSTILE_ERROR } from "@/lib/security/turnstile";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const limit = await checkRateLimit(
      RATE_LIMITS.register,
      clientKey(request, "register"),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    const captcha = await verifyTurnstile(parsed.data.captchaToken, "register");
    if (!captcha.ok) return fail(TURNSTILE_ERROR, 400);

    const store = getStore();
    const existing = await store.findUserByEmail(parsed.data.email);
    if (existing) {
      // Pesan tidak mengungkap apakah email terdaftar secara spesifik
      // untuk pihak lain; pengguna sah tetap perlu tahu.
      return fail("Email sudah terdaftar. Coba masuk.", 409);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await store.createUser({
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      passwordHash,
    });

    await createSession(user.id, user.role);
    return json({ id: user.id, displayName: user.displayName, role: user.role }, 201);
  });
}