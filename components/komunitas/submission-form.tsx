"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { buttonClass, Notice } from "@/components/ui/primitives";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

const SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || null;
const inputClass =
  "mt-1 w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70";

export function SubmissionForm({
  initial,
}: {
  initial?: {
    id: string;
    title: string;
    summary: string;
    category: string;
    body: string;
    references: string | null;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const onToken = useCallback((v: string | null) => setToken(v), []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {
      title: String(form.get("title") ?? ""),
      summary: String(form.get("summary") ?? ""),
      category: String(form.get("category") ?? ""),
      body: String(form.get("body") ?? ""),
    };
    const references = String(form.get("references") ?? "").trim();
    if (references) payload.references = references;
    if (token) payload.captchaToken = token;

    try {
      const response = await fetch(
        initial
          ? `/api/community/submissions/${initial.id}`
          : "/api/community/submissions",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Pengajuan tidak dapat dikirim.");
        return;
      }
      router.push("/komunitas/artikel");
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <div>
        <label htmlFor="title" className="text-sm font-semibold text-ink">
          Judul artikel
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={10}
          maxLength={120}
          defaultValue={initial?.title}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="summary" className="text-sm font-semibold text-ink">
          Ringkasan
        </label>
        <textarea
          id="summary"
          name="summary"
          required
          minLength={40}
          maxLength={300}
          rows={2}
          defaultValue={initial?.summary}
          className={inputClass}
          placeholder="Dua sampai tiga kalimat tentang isi artikel"
        />
      </div>
      <div>
        <label htmlFor="category" className="text-sm font-semibold text-ink">
          Kategori
        </label>
        <input
          id="category"
          name="category"
          required
          minLength={3}
          maxLength={40}
          defaultValue={initial?.category}
          className={inputClass}
          placeholder="Misalnya: Rekayasa sosial"
        />
      </div>
      <div>
        <label htmlFor="body" className="text-sm font-semibold text-ink">
          Isi artikel
        </label>
        <textarea
          id="body"
          name="body"
          required
          minLength={300}
          maxLength={12000}
          rows={14}
          defaultValue={initial?.body}
          className={inputClass}
          placeholder="Tulis dengan bahasa sendiri. Sertakan contoh, indikator, dan langkah praktis."
        />
        <p className="mt-1 text-xs text-ink-muted">
          Minimal 300 karakter. Teks ditampilkan sebagai paragraf biasa, bukan HTML.
        </p>
      </div>
      <div>
        <label htmlFor="references" className="text-sm font-semibold text-ink">
          Referensi (opsional)
        </label>
        <textarea
          id="references"
          name="references"
          maxLength={1000}
          rows={2}
          defaultValue={initial?.references ?? ""}
          className={inputClass}
          placeholder="Tautan sumber resmi, satu per baris"
        />
      </div>

      <TurnstileWidget siteKey={SITE_KEY} action="submission" onToken={onToken} />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending
          ? "Mengirim..."
          : initial
            ? "Kirim ulang untuk ditinjau"
            : "Ajukan artikel"}
      </button>
    </form>
  );
}