import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientKey,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { submissionSchema, firstError } from "@/lib/security/validation";
import { verifyTurnstile, TURNSTILE_ERROR } from "@/lib/security/turnstile";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { id } = await params;
    const { user } = await requireUser();

    const limit = await checkRateLimit(
      RATE_LIMITS.submissionUpdate,
      clientKey(request, `submission-update:${user.id}`),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    const store = getStore();
    const existing = await store.findSubmission(id);
    // Kepemilikan diperiksa di server, bukan hanya dari UI.
    if (!existing || existing.authorId !== user.id) {
      return fail("Pengajuan tidak ditemukan.", 404);
    }
    if (existing.status === "approved" || existing.status === "rejected") {
      return fail("Pengajuan ini sudah final dan tidak dapat diubah.", 409);
    }

    const captcha = await verifyTurnstile(parsed.data.captchaToken, "submission");
    if (!captcha.ok) return fail(TURNSTILE_ERROR, 400);

    const updated = await store.updateSubmission(id, user.id, {
      title: parsed.data.title,
      summary: parsed.data.summary,
      category: parsed.data.category,
      body: parsed.data.body,
      references: parsed.data.references || null,
    });

    if (!updated) return fail("Pengajuan tidak dapat diperbarui.", 409);
    return json({ ...updated, authorName: user.displayName });
  });
}