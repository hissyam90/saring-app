import { LIBRARY } from "@/data/resources";

/**
 * Identitas artikel Pustaka.
 *
 * Artikel Pustaka punya dua sumber dengan bentuk identitas berbeda:
 * - **Bawaan**: `data/resources.ts`, id berupa slug (`nomor-baru-minta-uang`).
 * - **Kontribusi**: baris `submissions` dengan `slug` publik.
 *
 * Keduanya memakai slug sebagai identitas publik yang stabil, sehingga bookmark
 * dan notifikasi dapat menyimpan satu referensi (`article_slug`) tanpa menyalin
 * konten artikel.
 */
const BUILTIN_SLUGS = new Map(LIBRARY.map((article) => [article.id, article.title]));

export function isBuiltinArticleSlug(slug: string): boolean {
  return BUILTIN_SLUGS.has(slug);
}

export function builtinArticleTitle(slug: string): string | null {
  return BUILTIN_SLUGS.get(slug) ?? null;
}

/** Validasi bentuk slug publik sebelum dipakai di query atau URL. */
export function isValidArticleSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 70 &&
    /^[a-z0-9-]+$/.test(value)
  );
}
