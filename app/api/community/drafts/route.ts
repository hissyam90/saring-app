import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { fail, handle, json } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientKey,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { parseDraftInput } from "@/lib/security/validation";
import { readJson } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** Daftar draf milik pengguna yang sedang masuk. */
export async function GET(): Promise<Response> {
  return handle(async () => {
    const { user } = await requireUser();
    const drafts = await getStore().listDrafts(user.id);
    return json({ drafts });
  }, "drafts-list");
}

/**
 * Membuat atau memperbarui draf (upsert).
 *
 * Kepemilikan diperiksa di server: `owner_id` selalu diambil dari sesi, bukan
 * dari body. Draf tidak pernah dipublikasikan otomatis — ia hanya berisi isi
 * yang belum diajukan.
 */
export async function PUT(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { user } = await requireUser();

    const limit = await checkRateLimit(
      RATE_LIMITS.draftSave,
      clientKey(request, `draft:${user.id}`),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const parsed = parseDraftInput(body);
    if (!parsed.ok) return fail(parsed.error, 400);

    // Draf revisi hanya boleh menunjuk artikel milik sendiri yang sudah terbit.
    if (parsed.data.targetSubmissionId) {
      const submission = await getStore().findSubmission(
        parsed.data.targetSubmissionId,
      );
      if (!submission || submission.authorId !== user.id) {
        return fail("Artikel tidak ditemukan.", 404);
      }
      if (submission.status !== "approved") {
        return fail(
          "Draf revisi hanya untuk artikel yang sudah terbit.",
          409,
        );
      }
    }

    const draft = await getStore().saveDraft({
      ownerId: user.id,
      kind: parsed.data.kind,
      targetSubmissionId: parsed.data.targetSubmissionId,
      payload: parsed.data.payload,
    });

    return json({ draft });
  }, "drafts-save");
}
