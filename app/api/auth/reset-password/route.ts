import { getStore } from "@/lib/db";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientKey,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { resetPasswordSchema, firstError } from "@/lib/security/validation";
import { hashPassword } from "@/lib/auth/password";
import { destroySession } from "@/lib/auth/session";
import {
  hashResetToken,
  isWellFormedResetToken,
} from "@/lib/auth/password-reset";

const INVALID_TOKEN =
  "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman lupa kata sandi.";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const limit = await checkRateLimit(
      RATE_LIMITS.passwordResetConfirm,
      clientKey(request, "reset-password"),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const parsed = resetPasswordSchema.safeParse(await readJson(request));
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    if (!isWellFormedResetToken(parsed.data.token)) {
      return fail(INVALID_TOKEN, 400);
    }

    const store = getStore();
    const passwordHash = await hashPassword(parsed.data.password);
    // Satu transaksi: klaim token + ganti kata sandi + naikkan session_version.
    // Bila pembaruan kata sandi gagal, token tidak hangus (rollback), dan dua
    // permintaan bersamaan tetap tidak bisa sama-sama berhasil.
    const result = await store.resetPasswordWithToken({
      tokenHash: hashResetToken(parsed.data.token),
      passwordHash,
    });
    if (!result) return fail(INVALID_TOKEN, 400);

    await destroySession();

    return json({
      ok: true,
      message:
        "Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.",
    });
  }, "auth-reset-password");
}