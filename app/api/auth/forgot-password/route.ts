import { createHash } from "node:crypto";
import { getStore } from "@/lib/db";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientKey,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { forgotPasswordSchema, firstError } from "@/lib/security/validation";
import { verifyTurnstile, TURNSTILE_ERROR } from "@/lib/security/turnstile";
import {
  RESET_TOKEN_TTL_MINUTES,
  createResetToken,
} from "@/lib/auth/password-reset";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { appOrigin } from "@/lib/http/app-origin";

/**
 * Respons publik yang sama untuk email terdaftar maupun tidak. Isi pesan tidak
 * pernah menyatakan apakah sebuah akun ada.
 */
const PUBLIC_MESSAGE =
  "Jika alamat email itu terdaftar, kami sudah mengirim tautan untuk membuat kata sandi baru. Periksa kotak masuk dan folder spam.";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const ipLimit = await checkRateLimit(
      RATE_LIMITS.passwordReset,
      clientKey(request, "forgot-password"),
    );
    if (!ipLimit.allowed) return tooManyRequests(ipLimit);

    const parsed = forgotPasswordSchema.safeParse(await readJson(request));
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    const captcha = await verifyTurnstile(
      parsed.data.captchaToken,
      "forgot-password",
    );
    if (!captcha.ok) return fail(TURNSTILE_ERROR, 400);

    const email = parsed.data.email.trim().toLowerCase();
    // Bucket per email memakai hash agar tabel rate limit tidak menyimpan PII.
    const emailKey = `password-reset-email:${createHash("sha256")
      .update(email, "utf8")
      .digest("hex")}`;
    const emailLimit = await checkRateLimit(
      RATE_LIMITS.passwordResetEmail,
      emailKey,
    );
    if (!emailLimit.allowed) return tooManyRequests(emailLimit);

    const store = getStore();
    const user = await store.findUserByEmail(email);

    if (user) {
      // Origin wajib eksplisit di production. Tanpa itu, tautan tidak dibuat
      // sama sekali agar header Host tidak dapat menentukan domain reset.
      const origin = appOrigin(request);
      if (!origin) {
        console.error(
          "[saring:auth-forgot-password] SARING_APP_ORIGIN belum diset; tautan reset tidak dibuat.",
        );
      } else {
        const reset = createResetToken();
        await store.createPasswordResetToken({
          userId: user.id,
          tokenHash: reset.tokenHash,
          expiresAt: reset.expiresAt,
        });

        const resetUrl = `${origin}/reset-sandi?token=${encodeURIComponent(
          reset.token,
        )}`;
        const delivery = await sendPasswordResetEmail({
          to: user.email,
          resetUrl,
          expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
        });
        // Status saja: tautan dan token tidak pernah ditulis ke log.
        if (!delivery.ok) {
          console.warn(
            `[saring:auth-forgot-password] pengiriman email: ${delivery.status}`,
          );
        }
      }
    }

    return json({ ok: true, message: PUBLIC_MESSAGE });
  }, "auth-forgot-password");
}