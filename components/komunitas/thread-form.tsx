"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { THREAD_CATEGORIES } from "@/lib/db/types";
import { buttonClass, Notice } from "@/components/ui/primitives";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

const SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || null;
const inputClass =
  "mt-1 w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70";

export function ThreadForm({
  defaultArticleSlug,
}: {
  defaultArticleSlug?: string;
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
      category: String(form.get("category") ?? ""),
      body: String(form.get("body") ?? ""),
    };
    const slug = String(form.get("articleSlug") ?? "").trim();
    if (slug) payload.articleSlug = slug;
    if (token) payload.captchaToken = token;

    try {
      const response = await fetch("/api/community/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok || !data.id) {
        setError(data.error ?? "Diskusi tidak dapat dibuat.");
        return;
      }
      router.push(`/komunitas/${data.id}`);
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
          Judul pertanyaan
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={10}
          maxLength={120}
          className={inputClass}
          placeholder="Ringkas masalahnya dalam satu kalimat"
        />
      </div>

      <div>
        <label htmlFor="category" className="text-sm font-semibold text-ink">
          Kategori
        </label>
        <select id="category" name="category" required className={inputClass}>
          {THREAD_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="body" className="text-sm font-semibold text-ink">
          Isi pertanyaan
        </label>
        <textarea
          id="body"
          name="body"
          required
          minLength={30}
          maxLength={4000}
          rows={8}
          className={inputClass}
          placeholder="Ceritakan situasinya. Jangan tempel kata sandi, kode OTP, nomor rekening, atau data pribadi."
        />
        <p className="mt-1 text-xs text-ink-muted">
          Minimal 30 karakter. Hindari menuliskan data pribadi orang lain.
        </p>
      </div>

      {defaultArticleSlug ? (
        <input type="hidden" name="articleSlug" value={defaultArticleSlug} />
      ) : null}

      <TurnstileWidget siteKey={SITE_KEY} action="thread" onToken={onToken} />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Mengirim..." : "Kirim pertanyaan"}
      </button>
    </form>
  );
}