import { getStore } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { handle, json } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/**
 * Daftar notifikasi milik pengguna yang sedang masuk.
 *
 * Pengunjung tanpa sesi menerima daftar kosong (bukan error) agar header dapat
 * menampilkan ikon notifikasi tanpa memicu error di konsol. Isi notifikasi orang
 * lain tidak pernah dapat dibaca karena `user_id` selalu dari sesi.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return json({ items: [], unread: 0 });

    const result = await getStore().listNotifications(user.id, 20);
    return json(result);
  }, "notifications-list");
}
