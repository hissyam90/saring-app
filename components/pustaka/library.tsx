"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, PenLine, Search } from "lucide-react";
import { ARTICLE_CATEGORIES, LIBRARY, readingMinutes } from "@/data/resources";
import type { ArticleCategory } from "@/data/resources";
import { BookmarkButton } from "./bookmark-button";

export interface ContributionSummary {
  slug: string;
  title: string;
  summary: string;
  category: string;
  minutes: number;
  authorName: string;
}

interface Item {
  key: string;
  href: string;
  category: string;
  title: string;
  summary: string;
  minutes: number;
  authorName: string | null;
  searchText: string;
}

export function Library({
  contributions = [],
  bookmarkedSlugs = [],
  canBookmark = false,
}: {
  contributions?: ContributionSummary[];
  /** Slug artikel yang sudah di-bookmark pengguna yang sedang masuk. */
  bookmarkedSlugs?: string[];
  canBookmark?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("Semua");
  const bookmarked = useMemo(() => new Set(bookmarkedSlugs), [bookmarkedSlugs]);

  // Artikel bawaan dan kontribusi yang sudah disetujui digabung dalam satu
  // daftar agar pencarian dan filter berlaku untuk keduanya.
  const items = useMemo<Item[]>(() => {
    const builtin: Item[] = LIBRARY.map((article) => ({
      key: article.id,
      href: `/pustaka/${article.id}`,
      category: article.category,
      title: article.title,
      summary: article.summary,
      minutes: readingMinutes(article),
      authorName: null,
      searchText: [
        article.title,
        article.summary,
        article.category,
        ...article.tags,
        ...article.sections.flatMap((s) => [s.heading, s.body, ...(s.bullets ?? [])]),
      ]
        .join(" ")
        .toLowerCase(),
    }));

    const contributed: Item[] = contributions.map((item) => ({
      key: item.slug,
      href: `/pustaka/${item.slug}`,
      category: item.category,
      title: item.title,
      summary: item.summary,
      minutes: item.minutes,
      authorName: item.authorName,
      searchText: `${item.title} ${item.summary} ${item.category}`.toLowerCase(),
    }));

    return [...builtin, ...contributed];
  }, [contributions]);

  const categories = useMemo(() => {
    const extra = [...new Set(items.map((i) => i.category))].filter(
      (c) => !ARTICLE_CATEGORIES.includes(c as ArticleCategory),
    );
    return ["Semua", ...ARTICLE_CATEGORIES, ...extra];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "Semua" && item.category !== filter) return false;
      return q ? item.searchText.includes(q) : true;
    });
  }, [items, query, filter]);

  const featuredKey =
    filter === "Semua" && !query.trim() && filtered.length > 0
      ? filtered[0].key
      : null;

  return (
    <div>
      <div className="border-y-2 border-ink bg-surface">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari topik, misalnya OTP, kurir, atau QRIS"
              className="w-full min-w-0 border-2 border-ink bg-paper py-2.5 pl-9 pr-3 text-sm text-ink transition-colors placeholder:text-ink-muted/70 hover:border-ink focus:border-ink focus:outline-none"
              aria-label="Cari topik pustaka"
            />
          </div>
          <p
            className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted"
            aria-live="polite"
          >
            {filtered.length} dari {items.length} artikel
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2.5 sm:px-5">
          {categories.map((category) => {
            const active = filter === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                aria-pressed={active}
                className={`min-h-9 border-2 px-2.5 text-xs font-bold transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-surface text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 border-2 border-dashed border-ink/40 px-5 py-10 text-center">
          <p className="text-sm font-bold text-ink">Tidak ada artikel yang cocok</p>
          <p className="mt-1 text-sm text-ink-muted">
            Coba kata kunci lain, atau pilih kategori Semua.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("Semua");
            }}
            className="mt-4 min-h-10 border-2 border-ink bg-lime px-4 text-sm font-bold text-ink"
          >
            Reset pencarian
          </button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const featured = item.key === featuredKey;
            return (
              <li
                key={item.key}
                className={`min-w-0 ${featured ? "sm:col-span-2 lg:col-span-2" : ""}`}
              >
                {/*
                  Kartu bukan satu <Link> penuh: tombol bookmark tidak boleh
                  bersarang di dalam anchor. Area judul/ringkasan tetap tautan,
                  header memuat kategori, waktu baca, dan tombol simpan.
                */}
                <article className="flex h-full min-w-0 flex-col border-2 border-ink bg-surface transition-colors hover:bg-lime-soft">
                  <div className="flex min-w-0 items-center justify-between gap-2 border-b border-line px-4 py-2">
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      {item.authorName ? (
                        <PenLine
                          className="h-3 w-3 shrink-0 text-ink"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                        {item.category}
                        {item.authorName ? ` · ${item.authorName}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[10px] text-ink-muted">
                        {item.minutes} menit
                      </span>
                      <BookmarkButton
                        slug={item.key}
                        initialSaved={bookmarked.has(item.key)}
                        canSave={canBookmark}
                        variant="icon"
                      />
                    </span>
                  </div>
                  <Link
                    href={item.href}
                    className={`group flex flex-1 flex-col px-4 py-4 ${
                      featured ? "sm:py-5" : ""
                    }`}
                  >
                    <h3
                      className={`font-black leading-tight tracking-tight text-ink ${
                        featured ? "text-xl sm:text-2xl" : "text-base"
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-ink-soft">
                      {item.summary}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink">
                      Baca
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}