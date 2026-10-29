import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquarePlus, Search } from "lucide-react";
import { getStore } from "@/lib/db";
import { clampPage } from "@/lib/api/helpers";
import { THREAD_CATEGORIES } from "@/lib/db/types";
import type { ThreadCategory } from "@/lib/db/types";
import {
  buttonClass,
  EmptyState,
  Panel,
  Tag,
  formatDate,
} from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Komunitas",
  description:
    "Tanya jawab dan berbagi pengalaman soal penipuan digital. Diskusi publik dengan moderasi admin.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function KomunitasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string; halaman?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  const allowed = new Set(THREAD_CATEGORIES.map((c) => c.id as string));
  const category =
    params.kategori && allowed.has(params.kategori)
      ? (params.kategori as ThreadCategory)
      : undefined;
  const page = clampPage(params.halaman);
  const search = params.q?.slice(0, 80);

  const result = await getStore().listThreads({
    search,
    category,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const buildHref = (next: number) => {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    if (category) sp.set("kategori", category);
    sp.set("halaman", String(next));
    return `/komunitas?${sp.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
            Komunitas
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">
            Ruang tanya jawab
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            Diskusi publik soal penipuan digital. Semua pengunjung boleh membaca.
            Untuk menulis, Anda perlu masuk.
          </p>
        </div>
        <Link
          href={user ? "/komunitas/baru" : "/masuk"}
          className={buttonClass("primary")}
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          {user ? "Buat pertanyaan" : "Masuk untuk menulis"}
        </Link>
      </header>

      <form
        action="/komunitas"
        method="get"
        className="mb-4 border-2 border-ink bg-surface p-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              defaultValue={search ?? ""}
              placeholder="Cari judul atau isi diskusi"
              aria-label="Cari diskusi"
              className="w-full border-2 border-ink bg-paper py-2.5 pl-9 pr-3 text-sm text-ink"
            />
          </div>
          <select
            name="kategori"
            defaultValue={category ?? ""}
            aria-label="Filter kategori"
            className="border-2 border-ink bg-paper px-3 py-2.5 text-sm text-ink"
          >
            <option value="">Semua kategori</option>
            {THREAD_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass("secondary")}>
            Terapkan
          </button>
        </div>
      </form>

      <Panel
        title={`${result.total} diskusi`}
        description={search || category ? "Hasil filter" : "Terbaru lebih dulu"}
      >
        {result.items.length === 0 ? (
          <EmptyState
            title="Belum ada diskusi"
            description={
              search || category
                ? "Tidak ada diskusi yang cocok dengan filter ini."
                : "Jadilah yang pertama bertanya."
            }
            action={
              <Link href="/komunitas/baru" className={buttonClass("primary")}>
                Mulai diskusi
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-2">
            {result.items.map((thread) => (
              <li key={thread.id}>
                <Link
                  href={`/komunitas/${thread.id}`}
                  className="group block border-2 border-ink bg-surface px-4 py-3 transition-colors hover:bg-lime-soft"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag>{thread.category}</Tag>
                    <span className="text-[11px] text-ink-muted">
                      {formatDate(thread.createdAt)} · {thread.authorName}
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-ink-muted">
                      {thread.replyCount} balasan
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-base font-bold leading-snug text-ink">
                    {thread.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-soft">
                    {thread.body}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav
            aria-label="Navigasi halaman"
            className="mt-4 flex items-center justify-between gap-2"
          >
            {page > 1 ? (
              <Link href={buildHref(page - 1)} className={buttonClass("secondary")}>
                Sebelumnya
              </Link>
            ) : (
              <span className={buttonClass("ghost")}>Sebelumnya</span>
            )}
            <span className="font-mono text-xs text-ink-muted">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={buildHref(page + 1)} className={buttonClass("secondary")}>
                Berikutnya
              </Link>
            ) : (
              <span className={buttonClass("ghost")}>Berikutnya</span>
            )}
          </nav>
        ) : null}
      </Panel>
    </div>
  );
}