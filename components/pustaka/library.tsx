"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Search } from "lucide-react";
import { LIBRARY } from "@/data/resources";

export function Library() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return LIBRARY;
    return LIBRARY.filter((article) => {
      const haystack = [
        article.title,
        article.summary,
        ...article.tags,
        ...article.sections.flatMap((section) => [section.heading, section.body]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query]);

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari topik, misalnya: OTP, lowongan, tautan…"
          className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted/60"
          aria-label="Cari topik pustaka"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-6 text-sm text-ink-muted">
          Tidak ada topik yang cocok dengan pencarianmu.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {filtered.map((article) => {
            const isOpen = article.id === openId;
            return (
              <li
                key={article.id}
                className="overflow-hidden rounded-xl border border-line bg-surface"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : article.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left sm:px-5"
                >
                  <div>
                    <h2 className="text-base font-semibold text-ink">
                      {article.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                      {article.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink-soft"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronDown
                    className={`mt-1 h-5 w-5 shrink-0 text-ink-muted transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {isOpen ? (
                  <div className="border-t border-line px-4 py-4 sm:px-5">
                    <div className="grid gap-4">
                      {article.sections.map((section) => (
                        <div key={section.heading}>
                          <h3 className="text-sm font-semibold text-ink">
                            {section.heading}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-ink-soft">
                            {section.body}
                          </p>
                        </div>
                      ))}
                    </div>

                    {article.checklist ? (
                      <div className="mt-4 rounded-xl border border-line bg-paper p-4">
                        <h3 className="text-sm font-semibold text-ink">
                          Daftar periksa
                        </h3>
                        <ul className="mt-2 grid gap-1.5">
                          {article.checklist.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2 text-sm text-ink-soft"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {article.externalLinks?.length ? (
                      <ul className="mt-4 grid gap-2">
                        {article.externalLinks.map((link) => (
                          <li key={link.url}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-medium text-ink underline-offset-2 hover:underline"
                            >
                              <ExternalLink className="h-4 w-4 text-warn" aria-hidden="true" />
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}