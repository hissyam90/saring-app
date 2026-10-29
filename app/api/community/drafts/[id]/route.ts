import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { fail, handle, json } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";

type Params = { params: Promise<{ id: string }> };

/** Menghapus draf milik pengguna sendiri. */
export async function DELETE(
  request: Request,
  { params }: Params,
): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { id } = await params;
    const { user } = await requireUser();

    const deleted = await getStore().deleteDraft(id, user.id);
    if (!deleted) return fail("Draf tidak ditemukan.", 404);

    return json({ ok: true });
  }, "drafts-delete");
}
