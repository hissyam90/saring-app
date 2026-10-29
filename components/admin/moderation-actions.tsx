"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, Notice } from "@/components/ui/primitives";

type Payload = Record<string, unknown> & { action: string };

/**
 * Tombol aksi moderasi. Selalu mengirim ke /api/admin/moderate dan menunggu
 * hasil server; tidak ada perubahan status yang dilakukan di sisi klien.
 */
export function ModerationActions({
  payload,
  confirmText,
  label,
  tone = "primary",
  requireNote = false,
  notePlaceholder = "Alasan untuk pengguna",
}: {
  payload: Payload;
  confirmText?: string;
  label: string;
  tone?: "primary" | "secondary" | "danger";
  requireNote?: boolean;
  notePlaceholder?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = async () => {
    if (requireNote && note.trim().length < 5) {
      setError("Alasan minimal 5 karakter.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...(requireNote ? { note: note.trim() } : {}),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Aksi gagal.");
        return;
      }
      setOpen(false);
      setNote("");
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setPending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass(tone, "!min-h-9 !px-2.5 !py-1 !text-xs")}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="mt-1 grid gap-1.5 border-2 border-ink bg-paper p-2">
      {confirmText ? (
        <p className="text-xs leading-5 text-ink">{confirmText}</p>
      ) : null}
      {requireNote ? (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder={notePlaceholder}
          aria-label={notePlaceholder}
          className="w-full border-2 border-ink bg-surface px-2 py-1.5 text-xs text-ink"
        />
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className={buttonClass(tone, "!min-h-8 !px-2 !py-0.5 !text-xs")}
        >
          {pending ? "Memproses..." : "Konfirmasi"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className={buttonClass("secondary", "!min-h-8 !px-2 !py-0.5 !text-xs")}
        >
          Batal
        </button>
      </div>
    </div>
  );
}