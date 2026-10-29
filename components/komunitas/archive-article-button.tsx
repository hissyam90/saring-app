"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Tombol arsip/pulihkan artikel. Hasil akhir ditentukan server; komponen ini
 * hanya mengirim permintaan dan menyegarkan data.
 */
export function ArchiveArticleButton({
  submissionId,
  archived,
}: {
  submissionId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/community/submissions/${submissionId}/archive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: !archived }),
        },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Aksi gagal.");
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setPending(false);
    }
  };

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => void run()}
        disabled={pending}
        className="inline-flex min-h-9 items-center border-2 border-line-strong bg-surface px-2 py-1 text-xs font-bold text-ink hover:border-ink disabled:opacity-60"
      >
        {pending ? "Memproses..." : archived ? "Pulihkan" : "Arsipkan"}
      </button>
      {error ? (
        <span role="alert" className="mt-1 text-[11px] text-coral">
          {error}
        </span>
      ) : null}
    </span>
  );
}
