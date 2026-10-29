import type { Metadata } from "next";
import { getStore } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { listPublishedArticlesSafe } from "@/lib/db/published";
import { Library } from "@/components/pustaka/library";
import type { ContributionSummary } from "@/components/pustaka/library";

export const metadata: Metadata = {
  title: "Pustaka",
  description:
    "Panduan praktis dan artikel kontribusi komunitas tentang penipuan digital.",
};

export const dynamic = "force-dynamic";

function minutesFor(body: string): number {
  const words = `${body}`.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function PustakaPage() {
  const user = await getCurrentUser();

  // Artikel kontribusi dibaca dengan pembungkus tahan gangguan database agar
  // artikel bawaan tetap tampil bila PostgreSQL sedang tidak dapat dihubungi.
  const published = await listPublishedArticlesSafe();

  const contributions: ContributionSummary[] = published.map((article) => ({
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    category: article.category,
    minutes: minutesFor(`${article.summary} ${article.body}`),
    authorName: article.authorName,
  }));

  // Bookmark hanya dimuat untuk pengguna yang masuk; slug dipakai sebagai
  // identitas stabil untuk artikel bawaan maupun kontribusi.
  const bookmarkedSlugs = user
    ? (await getStore().listBookmarks(user.id)).map((item) => item.articleSlug)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Pustaka
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Pustaka kepercayaan digital
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          Panduan praktis tentang modus yang paling sering terjadi di Indonesia,
          ditulis untuk dipakai. Artikel kontribusi komunitas hanya tampil setelah
          disetujui admin.
        </p>
      </header>
      <Library
        contributions={contributions}
        bookmarkedSlugs={bookmarkedSlugs}
        canBookmark={Boolean(user)}
      />
    </div>
  );
}