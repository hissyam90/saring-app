import { logServerError } from "@/lib/api/helpers";
import { getStore } from "./index";
import type { PublishedArticle } from "./types";

/**
 * Pembacaan artikel kontribusi yang tahan gangguan database.
 *
 * Pustaka juga memuat artikel bawaan yang tidak bergantung pada database.
 * Bila PostgreSQL sedang tidak dapat dihubungi, halaman Pustaka harus tetap
 * menampilkan artikel bawaan alih-alih menghasilkan error 500 untuk seluruh
 * halaman. Kegagalan dicatat di server dalam bentuk yang sudah diredaksi.
 */
export async function listPublishedArticlesSafe(): Promise<PublishedArticle[]> {
  try {
    return await getStore().listPublishedArticles();
  } catch (error) {
    logServerError("pustaka-list", error);
    return [];
  }
}

export async function findPublishedArticleSafe(
  slug: string,
): Promise<PublishedArticle | null> {
  try {
    return await getStore().findPublishedArticle(slug);
  } catch (error) {
    logServerError("pustaka-detail", error);
    return null;
  }
}
