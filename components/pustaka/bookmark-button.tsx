"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

/**
 * Tombol bookmark artikel.
 *
 * Menyimpan hanya `article_slug` di PostgreSQL (lewat API yang memverifikasi
 * sesi). Artikel pending/rejected tidak dapat di-bookmark karena API menolak
 * slug yang tidak dapat diakses publik.
 */
export function BookmarkButton({
  slug,
  initialSaved,
  canSave,
  variant = "icon",
}: {
  slug: string;
  initialSaved: boolean;
  canSave: boolean;
  /** `icon` untuk kartu, `full` untuk halaman detail. */
  variant?: "icon" | "full";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canSave) {
    return variant === "full" ? (
      <a
        href="/masuk"
        className="inline-flex min-h-9 items-center gap-1.5 border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:bg-paper"
      >
        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
        Masuk untuk menyimpan
      </a>
    ) : null;
  }

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    setError(null);

    const next = !saved;
    try {
      const response = next
        ? await fetch("/api/community/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug }),
          })
        : await fetch(`/api/community/bookmarks/${encodeURIComponent(slug)}`, {
            method: "DELETE",
          });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "Bookmark gagal disimpan.");
        return;
      }
      setSaved(next);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setPending(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={(event) => {
          // Kartu artikel adalah <Link>; jangan ikut berpindah halaman.
          event.preventDefault();
          event.stopPropagation();
          void toggle();
        }}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? "Hapus dari artikel tersimpan" : "Simpan artikel"}
        title={error ?? (saved ? "Tersimpan" : "Simpan artikel")}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink ${
          saved ? "bg-lime text-on-lime" : "bg-surface text-ink-soft hover:bg-lime-soft"
        } disabled:opacity-60`}
      >
        {saved ? (
          <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        aria-pressed={saved}
        className="inline-flex min-h-9 items-center gap-1.5 border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:bg-lime-soft disabled:opacity-60"
      >
        {saved ? (
          <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {saved ? "Tersimpan" : "Simpan artikel"}
      </button>
      {error ? (
        <p role="alert" className="text-[11px] leading-4 text-ink-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}
