"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_THREAD_CATEGORY,
  THREAD_CATEGORIES,
  type ThreadCategory,
  type ThreadDraftPayload,
} from "@/lib/db/types";
import { buttonClass, Notice } from "@/components/ui/primitives";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { draftStateLabel, useDraftAutosave } from "./use-draft-autosave";

const SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || null;
const inputClass =
  "mt-1 w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70";

/**
 * Form pertanyaan Komunitas.
 *
 * Kategori default adalah "Lainnya" karena banyak pertanyaan tidak langsung
 * cocok dengan satu kategori; pengguna tetap dapat memilih kategori lain.
 * Isi form disimpan otomatis sebagai draf di PostgreSQL (debounce 1,2 detik).
 */
export function ThreadForm({
  defaultArticleSlug,
  initialDraft,
}: {
  defaultArticleSlug?: string;
  /** Draf yang dipulihkan dari "Draf Saya". */
  initialDraft?: ThreadDraftPayload | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const onToken = useCallback((v: string | null) => setToken(v), []);

  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [category, setCategory] = useState<string>(
    initialDraft?.category ?? DEFAULT_THREAD_CATEGORY,
  );
  const [body, setBody] = useState(initialDraft?.body ?? "");
  const [articleSlug, setArticleSlug] = useState(
    initialDraft?.articleSlug ?? defaultArticleSlug ?? "",
  );

  const draftPayload = useMemo<ThreadDraftPayload>(
    () => ({ title, category, body, articleSlug }),
    [title, category, body, articleSlug],
  );

  // Draf hanya bermakna bila ada isi; form kosong tidak membuat baris baru.
  const hasContent = title.trim().length > 0 || body.trim().length > 0;

  const draft = useDraftAutosave({
    kind: "thread",
    payload: draftPayload,
    enabled: hasContent,
  });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    setError(null);

    if (title.trim().length < 10) {
      setError("Judul minimal 10 karakter.");
      return;
    }
    if (body.trim().length < 30) {
      setError("Isi pertanyaan minimal 30 karakter.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/community/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          body,
          articleSlug: articleSlug || undefined,
          captchaToken: token ?? undefined,
        }),
      });
      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok || !data.id) {
        // Draf tetap tersimpan agar tulisan tidak hilang.
        setError(data.error ?? "Diskusi tidak dapat dibuat.");
        return;
      }

      // Draf hanya dihapus setelah server mengonfirmasi diskusi dibuat.
      await draft.discard();
      router.push(`/komunitas/${data.id}`);
      router.refresh();
    } catch {
      setError(
        "Tidak dapat menghubungi server. Tulisan Anda masih ada di halaman ini.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid min-w-0 gap-3 [&>*]:min-w-0" noValidate>
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
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClass}
          placeholder="Ringkas masalahnya dalam satu kalimat"
        />
      </div>

      <div>
        <label htmlFor="category" className="text-sm font-semibold text-ink">
          Kategori
        </label>
        <select
          id="category"
          name="category"
          required
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={inputClass}
        >
          {THREAD_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-muted">
          Default &quot;Lainnya&quot;. Pilih kategori yang lebih tepat bila ada.
        </p>
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
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className={inputClass}
          placeholder="Ceritakan situasinya. Jangan tempel kata sandi, kode OTP, nomor rekening, atau data pribadi."
        />
        <p className="mt-1 text-xs text-ink-muted">
          Minimal 30 karakter. Hindari menuliskan data pribadi orang lain.
        </p>
      </div>

      {articleSlug ? (
        <p className="border-l-4 border-l-ink bg-paper px-3 py-2 text-xs leading-5 text-ink-soft">
          Pertanyaan ini ditautkan ke artikel Pustaka terkait.{" "}
          <button
            type="button"
            onClick={() => setArticleSlug("")}
            className="font-semibold underline"
          >
            Lepas tautan
          </button>
        </p>
      ) : null}

      <TurnstileWidget siteKey={SITE_KEY} action="thread" onToken={onToken} />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Mengirim..." : "Kirim pertanyaan"}
        </button>
        <p
          aria-live="polite"
          className={`font-mono text-[11px] ${
            draft.state === "error" ? "text-ink-coral" : "text-ink-muted"
          }`}
        >
          {draftStateLabel(draft.state, draft.savedAt)}
        </p>
      </div>
    </form>
  );
}

/** Label kategori untuk ditampilkan di daftar/detail diskusi. */
export function categoryLabel(id: ThreadCategory): string {
  return THREAD_CATEGORIES.find((item) => item.id === id)?.label ?? id;
}

