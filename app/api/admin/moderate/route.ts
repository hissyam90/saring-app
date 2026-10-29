import { getStore } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientKey,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import {
  removeContentSchema,
  reportUpdateSchema,
  reviewSchema,
  roleUpdateSchema,
} from "@/lib/security/validation";

/**
 * Semua aksi administratif melewati endpoint ini.
 * Otorisasi diperiksa di server untuk setiap request, bukan dari UI.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { user: admin } = await requireAdmin();

    // Admin tetap dibatasi agar akun yang disalahgunakan tidak dapat
    // melakukan perubahan massal tanpa jejak yang wajar.
    const limit = await checkRateLimit(
      RATE_LIMITS.moderate,
      clientKey(request, `moderate:${admin.id}`),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const action = String(body.action ?? "");
    const store = getStore();

    if (
      action === "approve-submission" ||
      action === "request-revision" ||
      action === "reject-submission"
    ) {
      const parsed = reviewSchema.safeParse(body);
      if (!parsed.success) return fail("Data tinjauan tidak valid.", 400);

      const target = await store.findSubmission(parsed.data.submissionId);
      if (!target) return fail("Pengajuan tidak ditemukan.", 404);

      const statusMap = {
        "approve-submission": "approved",
        "request-revision": "needs_revision",
        "reject-submission": "rejected",
      } as const;
      const status = statusMap[action];

      if (status !== "approved" && !parsed.data.note) {
        return fail("Alasan wajib diisi untuk revisi atau penolakan.", 400);
      }

      const updated = await store.reviewSubmission({
        id: parsed.data.submissionId,
        status,
        note: parsed.data.note || null,
        reviewerId: admin.id,
        reviewerName: admin.displayName,
        slug: target.title,
      });
      if (!updated) return fail("Pengajuan tidak dapat diperbarui.", 409);

      await store.logModeration({
        actorId: admin.id,
        action,
        targetType: "submission",
        targetId: parsed.data.submissionId,
        note: parsed.data.note || null,
      });

      return json(updated);
    }

    if (action === "remove-content") {
      const parsed = removeContentSchema.safeParse(body);
      if (!parsed.success) return fail("Data konten tidak valid.", 400);

      if (parsed.data.targetType === "thread") {
        await store.removeThread(parsed.data.targetId);
      } else {
        await store.removeReply(parsed.data.targetId);
      }

      await store.logModeration({
        actorId: admin.id,
        action: "remove-content",
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        note: null,
      });

      return json({ ok: true });
    }

    if (action === "set-report-status") {
      const parsed = reportUpdateSchema.safeParse(body);
      if (!parsed.success) return fail("Data laporan tidak valid.", 400);

      const updated = await store.resolveReport({
        id: parsed.data.reportId,
        status: parsed.data.status,
      });
      if (!updated) return fail("Laporan tidak ditemukan.", 404);

      await store.logModeration({
        actorId: admin.id,
        action: `report-${parsed.data.status}`,
        targetType: "report",
        targetId: parsed.data.reportId,
        note: null,
      });

      return json(updated);
    }

    if (action === "set-user-role") {
      const parsed = roleUpdateSchema.safeParse(body);
      if (!parsed.success) return fail("Data pengguna tidak valid.", 400);

      // Admin tidak dapat menurunkan dirinya sendiri agar tidak terkunci.
      if (parsed.data.userId === admin.id) {
        return fail("Anda tidak dapat mengubah role akun sendiri.", 409);
      }

      const updated = await store.setUserRole(parsed.data.userId, parsed.data.role);
      if (!updated) return fail("Pengguna tidak ditemukan.", 404);

      await store.logModeration({
        actorId: admin.id,
        action: `role-${parsed.data.role}`,
        targetType: "user",
        targetId: parsed.data.userId,
        note: null,
      });

      return json(updated);
    }

    return fail("Aksi tidak dikenal.", 400);
  });
}