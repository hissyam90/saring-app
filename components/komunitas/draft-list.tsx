"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export interface DraftRow {
  id: string;
  kind: "article" | "thread";
  targetSubmissionId: string | null;
  title: string;
  updatedAtLabel: string;
  resumeHref: string;
}

/**
 * Daftar draf milik pengguna di Akun Saya.
 *
 * "Lanjutkan" membuka form dengan `?draft=` sehingga isi dipulihkan dari
 * PostgreSQL. "Hapus" meminta konfirmasi lalu menghapus draf di server; draf
 * yang sudah dikirim untuk ditinjau tidak lagi muncul di sini.
 */
export function DraftList({ drafts }: { drafts: DraftRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (!window.confirm("Hapus draf ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    setPendingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/community/drafts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError("Draf tidak dapat dihapus.");
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setPendingId(null);
    }
  };

  if (drafts.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Belum ada draf tersimpan. Draf dibuat otomatis saat Anda mulai menulis
        artikel atau pertanyaan.
      </p>
    );
  }

  return (
    <div className="grid gap-1.5">
      {error ? (
        <p role="alert" className="border-l-4 border-l-coral bg-coral-soft px-2 py-1 text-xs text-ink">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-1.5">
        {drafts.map((draft) => (
          <li
            key={draft.id}
            className="flex flex-wrap items-center gap-2 border-l-4 border-l-amber bg-paper px-3 py-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {draft.title || "(belum ada judul)"}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink-muted">
                {draft.kind === "article"
                  ? draft.targetSubmissionId
                    ? "Draf revisi artikel"
                    : "Draf artikel"
                  : "Draf pertanyaan"}{" "}
                · diubah {draft.updatedAtLabel}
              </span>
            </span>
            <Link
              href={draft.resumeHref}
              className="inline-flex min-h-8 items-center border-2 border-ink bg-lime px-2.5 text-xs font-bold text-ink hover:bg-lime-deep"
            >
              Lanjutkan
            </Link>
            <button
              type="button"
              onClick={() => void remove(draft.id)}
              disabled={pendingId === draft.id}
              className="inline-flex min-h-8 items-center gap-1 border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:bg-coral-soft disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Hapus
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
