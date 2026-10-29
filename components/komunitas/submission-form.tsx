"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { buttonClass, Notice } from "@/components/ui/primitives";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { RichTextEditor } from "@/components/komunitas/rich-text-editor";
import { RichContent } from "@/components/pustaka/rich-content";
import {
  EMPTY_RICH_DOC,
  plainTextToRichDoc,
  RICH_TEXT_LIMITS,
  countRichTextCharacters,
  type RichDoc,
} from "@/lib/content/rich-text";
import type { ArticleDraftPayload } from "@/lib/db/types";
import { draftStateLabel, useDraftAutosave } from "./use-draft-autosave";

const SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || null;
const inputClass =
  "mt-1 w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-placeholder";

interface ArticleFields {
  title: string;
  summary: string;
  category: string;
  body: string;
  bodyJson: RichDoc | null;
  references: string | null;
}

export function SubmissionForm({
  initial,
  revision,
  initialDraft,
}: {
  /** Pengajuan yang belum terbit (pending / needs_revision). */
  initial?: ArticleFields & { id: string };
  /**
   * Artikel yang sudah terbit. Mengirim form ini membuat **revisi terpisah**;
   * konten publik tidak berubah sampai admin menyetujui.
   */
  revision?: ArticleFields & { submissionId: string; slug: string };
  /** Draf yang dipulihkan dari "Draf Saya". */
  initialDraft?: ArticleDraftPayload | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  // Menaikkan key me-remount editor agar kosong kembali setelah berhasil kirim.
  const [editorKey, setEditorKey] = useState(0);
  const onToken = useCallback((v: string | null) => setToken(v), []);

  const source = revision ?? initial;
  const legacyBody = source && !source.bodyJson ? source.body : "";

  /**
   * Dokumen awal editor. Artikel lama (plain text) dikonversi menjadi paragraf
   * agar isinya tidak hilang dan bisa langsung dirapikan formatnya.
   */
  const initialDoc = useMemo<RichDoc>(() => {
    if (initialDraft?.bodyJson) return initialDraft.bodyJson;
    if (source?.bodyJson) return source.bodyJson;
    if (legacyBody.trim()) return plainTextToRichDoc(legacyBody);
    return EMPTY_RICH_DOC;
  }, [initialDraft?.bodyJson, source?.bodyJson, legacyBody]);

  const [doc, setDoc] = useState<RichDoc>(initialDoc);
  const characters = useMemo(() => countRichTextCharacters(doc), [doc]);
  // Id editor unik per form: halaman pengajuan dapat memuat beberapa form.
  const bodyFieldId = revision
    ? `artikel-editor-rev-${revision.submissionId}`
    : initial
      ? `artikel-editor-${initial.id}`
      : "artikel-editor";

  // --- Autosave draf -------------------------------------------------------
  const [title, setTitle] = useState(initialDraft?.title ?? source?.title ?? "");
  const [summary, setSummary] = useState(
    initialDraft?.summary ?? source?.summary ?? "",
  );
  const [category, setCategory] = useState(
    initialDraft?.category ?? source?.category ?? "",
  );
  const [references, setReferences] = useState(
    initialDraft?.references ?? source?.references ?? "",
  );

  const draftPayload = useMemo<ArticleDraftPayload>(
    () => ({ title, summary, category, bodyJson: doc, references }),
    [title, summary, category, doc, references],
  );

  const hasContent =
    title.trim().length > 0 || summary.trim().length > 0 || characters > 0;

  const draft = useDraftAutosave({
    kind: "article",
    // Draf revisi terikat ke artikel publiknya agar tidak menimpa draf artikel
    // baru dan tidak pernah menyentuh versi publik.
    targetSubmissionId: revision?.submissionId ?? null,
    payload: draftPayload,
    enabled: hasContent,
  });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    setError(null);
    setSaved(null);

    const trimmedTitle = title.trim();
    const trimmedSummary = summary.trim();
    const trimmedCategory = category.trim();
    const trimmedReferences = references.trim();

    // Validasi awal di klien untuk umpan balik cepat. Server tetap memeriksa
    // ulang seluruh aturan yang sama.
    if (trimmedTitle.length < 10) {
      setError("Judul minimal 10 karakter.");
      return;
    }
    if (trimmedSummary.length < 40) {
      setError("Ringkasan minimal 40 karakter.");
      return;
    }
    if (trimmedCategory.length < 3) {
      setError("Kategori wajib diisi.");
      return;
    }
    if (characters < RICH_TEXT_LIMITS.minCharacters) {
      setError(
        `Isi artikel minimal ${RICH_TEXT_LIMITS.minCharacters} karakter. Saat ini ${characters}.`,
      );
      return;
    }
    if (characters > RICH_TEXT_LIMITS.maxCharacters) {
      setError(`Isi artikel maksimal ${RICH_TEXT_LIMITS.maxCharacters} karakter.`);
      return;
    }

    const payload: Record<string, unknown> = {
      title: trimmedTitle,
      summary: trimmedSummary,
      category: trimmedCategory,
      // Dokumen rich text dikirim apa adanya; server memvalidasi allowlist lalu
      // menurunkan teks biasa sendiri.
      bodyJson: doc,
    };
    if (trimmedReferences) payload.references = trimmedReferences;
    if (token) payload.captchaToken = token;

    // Tiga tujuan berbeda:
    // - revisi artikel terbit → /revisions (konten publik tidak berubah)
    // - perbaikan pengajuan belum terbit → PATCH submission
    // - pengajuan baru → POST submission
    const target = revision
      ? `/api/community/submissions/${revision.submissionId}/revisions`
      : initial
        ? `/api/community/submissions/${initial.id}`
        : "/api/community/submissions";
    const method = revision ? "POST" : initial ? "PATCH" : "POST";

    setPending(true);
    try {
      const response = await fetch(target, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        // Isi editor sengaja tidak diubah agar tulisan tidak hilang.
        setError(data.error ?? "Pengajuan tidak dapat dikirim.");
        return;
      }

      setSaved(
        revision
          ? "Revisi terkirim. Artikel yang sudah terbit tetap tampil sampai admin menyetujui revisi ini."
          : initial
            ? "Perubahan tersimpan dan pengajuan kembali menunggu tinjauan admin."
            : "Artikel terkirim. Statusnya menunggu tinjauan admin dan belum tampil di Pustaka.",
      );

      // Draf hanya dihapus setelah server mengonfirmasi penyimpanan.
      await draft.discard();

      if (!initial && !revision) {
        // Form baru dikosongkan hanya setelah server benar-benar menyimpan.
        formRef.current?.reset();
        setTitle("");
        setSummary("");
        setCategory("");
        setReferences("");
        setDoc(EMPTY_RICH_DOC);
        setEditorKey((key) => key + 1);
        setPreview(false);
        setToken(null);
      }

      router.refresh();
    } catch {
      setError(
        "Tidak dapat menghubungi server. Tulisan Anda masih ada di halaman ini.",
      );
    } finally {
      setPending(false);
    }
  };  return (
    <form
      ref={formRef}
      onSubmit={submit}
      // `[&>*]:min-w-0` wajib: item grid memiliki `min-width: auto`, sehingga URL
      // panjang di dalam editor dapat memaksa seluruh form melebar melewati
      // border neobrutalism (terukur 2232px pada viewport 1280px).
      className="grid min-w-0 gap-3 [&>*]:min-w-0"
      noValidate
    >
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
          value={title}
          onChange={(event) => setTitle(event.target.value)}
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
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
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
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={inputClass}
          placeholder="Misalnya: Rekayasa sosial"
        />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id="body-label" className="text-sm font-semibold text-ink">
            Isi artikel
          </p>
          <button
            type="button"
            onClick={() => setPreview((value) => !value)}
            aria-pressed={preview}
            className="inline-flex min-h-8 items-center gap-1.5 border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:bg-paper"
          >
            {preview ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {preview ? "Kembali menulis" : "Pratinjau"}
          </button>
        </div>

        {/* Editor tetap terpasang saat pratinjau dibuka agar isi tidak hilang. */}
        <div className={`mt-1 min-w-0 ${preview ? "hidden" : ""}`}>
          <RichTextEditor
            key={editorKey}
            id={bodyFieldId}
            initialDoc={initialDoc}
            onChange={setDoc}
          />
        </div>

        {preview ? (
          <div
            data-testid="submission-preview"
            className="mt-1 border-2 border-dashed border-ink/40 bg-surface px-4 py-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              Pratinjau · tampilan sama dengan halaman Pustaka
            </p>
            <div className="mt-3">
              {characters === 0 && legacyBody ? (
                <RichContent doc={null} fallbackText={legacyBody} />
              ) : (
                <RichContent doc={doc} />
              )}
            </div>
            <p className="mt-4 border-t border-line pt-2 text-xs leading-5 text-ink-muted">
              Pratinjau ini bukan artikel terbit. Artikel baru tampil di Pustaka
              setelah disetujui admin.
            </p>
          </div>
        ) : null}

        {initial && !initial.bodyJson && legacyBody && !preview ? (
          <p className="mt-1 border-l-4 border-l-amber bg-amber-soft px-3 py-2 text-xs leading-5 text-ink">
            Artikel ini ditulis sebelum editor format tersedia. Isi lamanya sudah
            dimuat ke editor sebagai paragraf biasa; Anda bisa merapikan formatnya
            lalu mengirim ulang.
          </p>
        ) : null}
      </div>      <div>
        <label htmlFor="references" className="text-sm font-semibold text-ink">
          Referensi (opsional)
        </label>
        <textarea
          id="references"
          name="references"
          maxLength={1000}
          rows={2}
          value={references}
          onChange={(event) => setReferences(event.target.value)}
          className={inputClass}
          placeholder="Tautan sumber resmi, satu per baris"
        />
      </div>

      <TurnstileWidget siteKey={SITE_KEY} action="submission" onToken={onToken} />

      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="success">{saved}</Notice> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending
            ? "Menyimpan..."
            : revision
              ? "Kirim revisi untuk ditinjau"
              : initial
                ? "Kirim ulang untuk ditinjau"
                : "Ajukan artikel"}
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
      <p className="text-xs leading-5 text-ink-muted">
        Teks dan tautan disimpan sebagai struktur tervalidasi, bukan HTML mentah.
        Format di luar daftar toolbar tidak disimpan.
        {revision
          ? " Revisi tidak mengubah artikel publik sebelum disetujui admin."
          : ""}
      </p>
    </form>
  );
}
