"use client";

import { useCallback, useState } from "react";
import { Flag } from "lucide-react";
import { buttonClass, Notice } from "@/components/ui/primitives";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

const SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || null;

export function ReportButton({
  targetType,
  targetId,
  canReport,
}: {
  targetType: "thread" | "reply";
  targetId: string;
  canReport: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const onToken = useCallback((v: string | null) => setToken(v), []);

  if (!canReport) return null;

  if (done) {
    return (
      <p className="text-xs text-ink-muted">
        Laporan terkirim. Admin akan meninjaunya.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        Laporkan
      </button>
    );
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/community/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: String(form.get("reason") ?? ""),
          details: String(form.get("details") ?? "") || undefined,
          captchaToken: token ?? undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Laporan tidak dapat dikirim.");
        return;
      }
      setDone(true);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-2 grid gap-2 border-2 border-ink bg-paper p-3"
      noValidate
    >
      <p className="text-xs leading-5 text-ink-muted">
        Laporan tidak otomatis membuktikan penipuan. Admin akan meninjau sebelum
        mengambil tindakan.
      </p>
      <label htmlFor={`reason-${targetId}`} className="text-sm font-semibold text-ink">
        Alasan
      </label>
      <input
        id={`reason-${targetId}`}
        name="reason"
        required
        minLength={5}
        maxLength={80}
        className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm text-ink"
        placeholder="Misalnya: berisi tautan mencurigakan"
      />
      <label htmlFor={`details-${targetId}`} className="text-sm font-semibold text-ink">
        Keterangan tambahan (opsional)
      </label>
      <textarea
        id={`details-${targetId}`}
        name="details"
        maxLength={1000}
        rows={2}
        className="w-full border-2 border-ink bg-surface px-3 py-2 text-sm text-ink"
      />
      <TurnstileWidget siteKey={SITE_KEY} action="report" onToken={onToken} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass("danger")}>
          {pending ? "Mengirim..." : "Kirim laporan"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={buttonClass("secondary")}
        >
          Batal
        </button>
      </div>
    </form>
  );
}