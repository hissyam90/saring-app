"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { ARTICLE_CATEGORIES, LIBRARY, readingMinutes } from "@/data/resources";
import type { ArticleCategory } from "@/data/resources";

type Filter = "Semua" | ArticleCategory;

export function Library() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Semua");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return LIBRARY.filter((article) => {
      if (filter !== "Semua" && article.category !== filter) return false;
      if (!normalized) return true;
      const haystack = [
        article.title,
        article.summary,
        article.category,
        ...article.tags,
        ...article.sections.flatMap((section) => [
          section.heading,
          section.body,
          ...(section.bullets ?? []),
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, filter]);

  return (
    <div>
      <div className="border-y-2 border-ink bg-surface">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari topik, misalnya OTP, kurir, atau QRIS"
              className="w-full border-2 border-ink bg-paper py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted/70"
              aria-label="Cari topik pustaka"
            />
          </div>
          <p
            className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wide text-ink-muted"
            aria-live="polite"
          >
            {filtered.length} dari {LIBRARY.length} artikel
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2.5 sm:px-5">
          {(["Semua", ...ARTICLE_CATEGORIES] as Filter[]).map((category) => {
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
          <p className="text-sm font-bold text-ink">
            Tidak ada artikel yang cocok
          </p>
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
          {filtered.map((article, index) => {
            const featured = index === 0 && filter === "Semua" && !query.trim();
            return (
              <li
                key={article.id}
                className={featured ? "sm:col-span-2 lg:col-span-2" : ""}
              >
                <ArticleCard article={article} featured={featured} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ArticleCard({
  article,
  featured,
}: {
  article: (typeof LIBRARY)[number];
  featured: boolean;
}) {
  return (
    <Link
      href={`/pustaka/${article.id}`}
      className="group flex h-full flex-col border-2 border-ink bg-surface transition-colors hover:bg-lime-soft"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          {article.category}
        </span>
        <span className="font-mono text-[10px] text-ink-muted">
          {readingMinutes(article)} menit
        </span>
      </div>

      <div
        className={`flex flex-1 flex-col px-4 py-4 ${featured ? "sm:py-5" : ""}`}
      >
        <h3
          className={`font-black leading-tight tracking-tight text-ink ${
            featured ? "text-xl sm:text-2xl" : "text-base"
          }`}
        >
          {article.title}
        </h3>
        <p
          className={`mt-2 flex-1 leading-6 text-ink-soft ${
            featured ? "text-sm sm:text-[15px]" : "text-sm"
          }`}
        >
          {article.summary}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink">
          Baca
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
