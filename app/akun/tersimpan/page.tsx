import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { buttonClass, EmptyState, Panel, Tag, formatDate } from "@/components/ui/primitives";
import { DraftList, type DraftRow } from "@/components/komunitas/draft-list";
import { LIBRARY } from "@/data/resources";

export const metadata: Metadata = { title: "Artikel tersimpan" };
export const dynamic = "force-dynamic";

export default async function SavedArticlesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");

  const store = getStore();
  const [bookmarks, published] = await Promise.all([
    store.listBookmarks(user.id),
    store.listPublishedArticles(),
  ]);

  // Judul diambil dari sumber yang sah: artikel bawaan atau kontribusi yang
  // masih berstatus approved. Bookmark untuk artikel yang sudah tidak terbit
  // ditampilkan sebagai entri tidak tersedia, bukan tautan rusak.
  const builtin = new Map(LIBRARY.map((article) => [article.id, article.title]));
  const contributed = new Map(published.map((article) => [article.slug, article.title]));

  const rows = bookmarks.map((bookmark) => {
    const title =
      builtin.get(bookmark.articleSlug) ?? contributed.get(bookmark.articleSlug) ?? null;
    return {
      slug: bookmark.articleSlug,
      title,
      savedAt: formatDate(bookmark.createdAt),
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Akun
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink">
          Artikel tersimpan
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Daftar artikel Pustaka yang Anda simpan. Tersimpan di akun, jadi tetap
          ada setelah keluar dan masuk kembali.
        </p>
      </header>

      <div className="mb-4">
        <Link href="/akun" className={buttonClass("secondary")}>
          Kembali ke Akun saya
        </Link>
      </div>

      <Panel title={`${rows.length} artikel`}>
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada artikel tersimpan"
            description="Buka Pustaka dan tekan ikon simpan pada artikel yang ingin Anda baca lagi."
            action={
              <Link href="/pustaka" className={buttonClass("primary")}>
                Buka Pustaka
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-1.5">
            {rows.map((row) => (
              <li
                key={row.slug}
                className="flex flex-wrap items-center gap-2 border-l-4 border-l-ink bg-paper px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {row.title ?? row.slug}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">
                    Disimpan {row.savedAt}
                  </span>
                </span>
                {row.title ? (
                  <Link
                    href={`/pustaka/${row.slug}`}
                    className="text-xs font-semibold text-ink underline"
                  >
                    Baca
                  </Link>
                ) : (
                  <Tag tone="warn">tidak tersedia</Tag>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="mt-4">
        <Panel title="Draf saya">
          <DraftList
            drafts={
              (await store.listDrafts(user.id)).map((draft): DraftRow => {
                const payload = draft.payload as { title?: string };
                return {
                  id: draft.id,
                  kind: draft.kind,
                  targetSubmissionId: draft.targetSubmissionId,
                  title: payload.title ?? "",
                  updatedAtLabel: formatDate(draft.updatedAt),
                  resumeHref:
                    draft.kind === "thread"
                      ? `/komunitas/baru?draft=${draft.id}`
                      : draft.targetSubmissionId
                        ? `/komunitas/artikel?edit=${draft.targetSubmissionId}&draft=${draft.id}`
                        : `/komunitas/artikel?draft=${draft.id}`,
                };
              })
            }
          />
        </Panel>
      </div>
    </div>
  );
}
