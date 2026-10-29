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
import { archiveSubmissionSchema, firstError } from "@/lib/security/validation";

type Params = { params: Promise<{ id: string }> };

/**
 * Mengarsipkan atau memulihkan artikel (soft archive).
 *
 * Otorisasi diperiksa di server: pemilik artikel boleh mengubah artikelnya
 * sendiri, admin boleh mengubah artikel mana pun. UI hanya memilih tombol yang
 * tampil, bukan menjadi kontrol keamanan.
 */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { id } = await params;
    const { user } = await requireUser();

    const limit = await checkRateLimit(
      RATE_LIMITS.submissionUpdate,
      clientKey(request, `submission-archive:${user.id}`),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const parsed = archiveSubmissionSchema.safeParse(body);
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    const store = getStore();
    const existing = await store.findSubmission(id);
    if (!existing) return fail("Artikel tidak ditemukan.", 404);

    const isOwner = existing.authorId === user.id;
    if (!isOwner && user.role !== "admin") {
      // 404 agar keberadaan artikel orang lain tidak diumumkan.
      return fail("Artikel tidak ditemukan.", 404);
    }

    if (existing.status !== "approved") {
      return fail("Hanya artikel yang sudah terbit yang dapat diarsipkan.", 409);
    }

    const updated = await store.setSubmissionArchived(id, parsed.data.archived);
    if (!updated) return fail("Artikel tidak dapat diperbarui.", 409);

    await store.logModeration({
      actorId: user.id,
      action: parsed.data.archived ? "archive-article" : "restore-article",
      targetType: "submission",
      targetId: id,
      note: null,
    });

    return json(updated);
  }, "submission-archive");
}
