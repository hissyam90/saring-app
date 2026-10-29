import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import { isBuiltinArticleSlug } from "@/lib/content/articles";
import { bookmarkSchema, firstError } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

/** Daftar bookmark milik pengguna yang sedang masuk. */
export async function GET(): Promise<Response> {
  return handle(async () => {
    const { user } = await requireUser();
    const bookmarks = await getStore().listBookmarks(user.id);
    return json({ bookmarks });
  }, "bookmarks-list");
}

/**
 * Menyimpan artikel ke bookmark.
 *
 * Hanya artikel yang benar-benar dapat diakses publik yang boleh di-bookmark:
 * artikel bawaan (daftar statis) atau kontribusi berstatus `approved`.
 * Artikel pending/rejected tidak dapat dibuka lewat bookmark.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { user } = await requireUser();

    const body = await readJson(request);
    const parsed = bookmarkSchema.safeParse(body);
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    const { slug } = parsed.data;
    const isBuiltin = isBuiltinArticleSlug(slug);
    if (!isBuiltin) {
      const contribution = await getStore().findPublishedArticle(slug);
      if (!contribution) return fail("Artikel tidak ditemukan.", 404);
    }

    const bookmark = await getStore().addBookmark(user.id, slug);
    return json({ bookmark }, 201);
  }, "bookmarks-add");
}
