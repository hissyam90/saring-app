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
import { parseSubmissionInput } from "@/lib/security/validation";
import { verifyTurnstile, TURNSTILE_ERROR } from "@/lib/security/turnstile";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Revisi untuk artikel yang sudah terbit.
 *
 * Konten publik **tidak** diubah di sini. Revisi hanya membuat/mengubah baris
 * `submission_revisions`; artikel yang tayang tetap versi terakhir yang
 * disetujui sampai admin menerbitkan revisi (`publishRevision`).
 */
export async function GET(
  _request: Request,
  { params }: Params,
): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const { user } = await requireUser();

    const submission = await getStore().findSubmission(id);
    if (!submission || submission.authorId !== user.id) {
      return fail("Artikel tidak ditemukan.", 404);
    }

    const [open, all] = await Promise.all([
      getStore().findOpenRevision(id),
      getStore().listRevisionsByAuthor(user.id),
    ]);

    return json({
      open,
      revisions: all.filter((revision) => revision.submissionId === id),
    });
  }, "revisions-list");
}

/** Mengajukan revisi (atau memperbarui revisi yang diminta diperbaiki). */
export async function POST(
  request: Request,
  { params }: Params,
): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { id } = await params;
    const { user } = await requireUser();

    const limit = await checkRateLimit(
      RATE_LIMITS.revisionCreate,
      clientKey(request, `revision:${user.id}`),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const parsed = parseSubmissionInput(body);
    if (!parsed.ok) return fail(parsed.error, 400);

    const store = getStore();
    const submission = await store.findSubmission(id);

    // Kepemilikan dan status diperiksa di server.
    if (!submission || submission.authorId !== user.id) {
      return fail("Artikel tidak ditemukan.", 404);
    }
    if (submission.status !== "approved" || !submission.slug) {
      return fail(
        "Revisi hanya tersedia untuk artikel yang sudah terbit.",
        409,
      );
    }

    const captcha = await verifyTurnstile(parsed.data.captchaToken, "submission");
    if (!captcha.ok) return fail(TURNSTILE_ERROR, 400);

    const open = await store.findOpenRevision(id);
    if (open && open.status === "pending") {
      return fail(
        "Revisi artikel ini sedang menunggu tinjauan admin. Tunggu keputusan sebelum mengirim lagi.",
        409,
      );
    }

    const content = {
      title: parsed.data.title,
      summary: parsed.data.summary,
      category: parsed.data.category,
      body: parsed.data.body,
      bodyJson: parsed.data.bodyJson,
      references: parsed.data.references,
    };

    // Revisi yang diminta diperbaiki memakai baris yang sama agar riwayatnya
    // tidak berlipat dan tidak membuat revisi ganda.
    const revision =
      open && open.status === "needs_revision"
        ? await store.updateRevision(open.id, user.id, content)
        : await store.createRevision({
            submissionId: id,
            authorId: user.id,
            ...content,
          });

    if (!revision) return fail("Revisi tidak dapat disimpan.", 409);

    return json({ revision }, 201);
  }, "revisions-create");
}
