import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import { firstError, notificationReadSchema } from "@/lib/security/validation";

/**
 * Menandai notifikasi sebagai dibaca.
 *
 * `id` menandai satu notifikasi; `all: true` menandai semuanya. Kepemilikan
 * diperiksa di kueri (`where user_id = sesi`), sehingga pengguna tidak dapat
 * mengubah notifikasi orang lain.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { user } = await requireUser();

    const body = await readJson(request);
    const parsed = notificationReadSchema.safeParse(body);
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    if (parsed.data.all) {
      const updated = await getStore().markAllNotificationsRead(user.id);
      return json({ ok: true, updated });
    }

    if (!parsed.data.id) return fail("Notifikasi tidak valid.", 400);

    const updated = await getStore().markNotificationRead(parsed.data.id, user.id);
    if (!updated) return fail("Notifikasi tidak ditemukan.", 404);

    return json({ notification: updated });
  }, "notifications-read");
}
