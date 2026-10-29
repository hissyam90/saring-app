import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { fail, handle, json } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import { isValidArticleSlug } from "@/lib/content/articles";

type Params = { params: Promise<{ slug: string }> };

/** Menghapus bookmark milik pengguna sendiri. */
export async function DELETE(
  request: Request,
  { params }: Params,
): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { slug } = await params;
    if (!isValidArticleSlug(slug)) return fail("Artikel tidak valid.", 400);

    const { user } = await requireUser();
    await getStore().removeBookmark(user.id, slug);

    return json({ ok: true });
  }, "bookmarks-remove");
}
