import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { SubmissionForm } from "@/components/komunitas/submission-form";
import { Panel, Tag, formatDate } from "@/components/ui/primitives";
import type {
  ArticleDraftPayload,
  RevisionStatus,
  SubmissionStatus,
} from "@/lib/db/types";
import {
  plainTextToRichDoc,
  readRichDoc,
  type RichDoc,
} from "@/lib/content/rich-text";

export const metadata: Metadata = { title: "Ajukan artikel" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<
  SubmissionStatus,
  "neutral" | "warn" | "success" | "danger"
> = {
  pending: "warn",
  approved: "success",
  needs_revision: "warn",
  rejected: "danger",
};

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: "Menunggu tinjauan",
  approved: "Disetujui",
  needs_revision: "Perlu revisi",
  rejected: "Ditolak",
};

const REVISION_LABEL: Record<RevisionStatus, string> = {
  pending: "Revisi menunggu tinjauan",
  approved: "Revisi disetujui",
  needs_revision: "Revisi perlu diperbaiki",
  rejected: "Revisi ditolak",
};

const REVISION_TONE: Record<
  RevisionStatus,
  "neutral" | "warn" | "success" | "danger"
> = {
  pending: "warn",
  approved: "success",
  needs_revision: "warn",
  rejected: "danger",
};

/** Dokumen editor awal untuk artikel berbasis plain text (data lama). */
function docOf(bodyJson: RichDoc | null, body: string): RichDoc {
  return readRichDoc(bodyJson) ?? plainTextToRichDoc(body);
}

export default async function SubmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; edit?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");

  const params = await searchParams;
  const store = getStore();

  const [mine, drafts, revisions, published] = await Promise.all([
    store.listSubmissionsByAuthor(user.id),
    store.listDrafts(user.id),
    store.listRevisionsByAuthor(user.id),
    store.listPublishedArticles(),
  ]);

  const myPublished = published.filter((article) => article.authorId === user.id);
  const editable = mine.filter(
    (submission) =>
      submission.status === "pending" || submission.status === "needs_revision",
  );

  // Draf yang diminta lewat ?draft=. Kepemilikan sudah dipastikan oleh
  // `listDrafts(user.id)`, sehingga id draf milik orang lain tidak ditemukan.
  const activeDraft = params.draft
    ? drafts.find((item) => item.id === params.draft && item.kind === "article")
    : undefined;
  const draftPayload =
    activeDraft && activeDraft.targetSubmissionId === null
      ? (activeDraft.payload as ArticleDraftPayload)
      : null;

  // Revisi untuk artikel terbit tertentu (lewat ?edit=<submissionId>).
  const editing = params.edit
    ? myPublished.find((article) => article.submissionId === params.edit)
    : undefined;
  const openRevision = editing
    ? await store.findOpenRevision(editing.submissionId)
    : null;

  const revisionDraft =
    editing && activeDraft?.targetSubmissionId === editing.submissionId
      ? (activeDraft.payload as ArticleDraftPayload)
      : null;

  // Isi awal revisi: draf revisi bila ada, lalu revisi terbuka, lalu versi publik.
  const revisionInitial = editing
    ? {
        submissionId: editing.submissionId,
        slug: editing.slug,
        title: revisionDraft?.title ?? openRevision?.title ?? editing.title,
        summary: revisionDraft?.summary ?? openRevision?.summary ?? editing.summary,
        category: revisionDraft?.category ?? openRevision?.category ?? editing.category,
        body: openRevision?.body ?? editing.body,
        bodyJson:
          revisionDraft?.bodyJson ??
          readRichDoc(openRevision?.bodyJson) ??
          docOf(editing.bodyJson, editing.body),
        references:
          revisionDraft?.references ?? openRevision?.references ?? editing.references,
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Kontribusi
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink">
          Ajukan artikel Pustaka
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Artikel akan ditinjau admin sebelum terbit. Selama belum disetujui, isi
          artikel tidak tampil di Pustaka publik. Artikel yang sudah terbit dapat
          direvisi tanpa menghilangkan versi yang sedang tayang.
        </p>
      </header>

      {activeDraft ? (
        <div className="mb-4 border-l-4 border-l-amber bg-amber-soft px-3 py-2 text-xs leading-5 text-ink">
          Melanjutkan draf tersimpan ({formatDate(activeDraft.updatedAt)}).{" "}
          <Link href="/komunitas/artikel" className="font-semibold underline">
            Mulai tanpa draf
          </Link>
        </div>
      ) : null}

      {editing && revisionInitial ? (
        <Panel
          title={`Revisi: ${editing.title}`}
          description="Versi publik tetap tampil sampai admin menyetujui revisi ini."
        >
          {openRevision?.status === "pending" ? (
            <div className="mb-3 border-l-4 border-l-amber bg-amber-soft px-3 py-2 text-xs leading-5 text-ink">
              Revisi sedang menunggu tinjauan admin (
              {formatDate(openRevision.updatedAt)}). Kirim ulang hanya setelah
              admin meminta perbaikan.
            </div>
          ) : null}
          {openRevision?.reviewNote ? (
            <div className="mb-3 border-l-4 border-l-coral bg-coral-soft px-3 py-2 text-xs leading-5 text-ink">
              <span className="font-semibold">Catatan admin: </span>
              {openRevision.reviewNote}
            </div>
          ) : null}
          <SubmissionForm revision={revisionInitial} initialDraft={revisionDraft} />
        </Panel>
      ) : (
        <Panel title="Pengajuan baru">
          <SubmissionForm initialDraft={draftPayload} />
        </Panel>
      )}


      <div className="mt-5">
        <Panel title={`Pengajuan saya (${mine.length})`}>
          {mine.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Belum ada pengajuan. Artikel pertama Anda akan muncul di sini.
            </p>
          ) : (
            <ul className="grid gap-2">
              {mine.map((submission) => (
                <li
                  key={submission.id}
                  className="border-l-4 border-l-ink bg-paper px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone={STATUS_TONE[submission.status]}>
                      {STATUS_LABEL[submission.status]}
                    </Tag>
                    <span className="text-[11px] text-ink-muted">
                      {formatDate(submission.createdAt)}
                    </span>
                    {submission.slug ? (
                      <Link
                        href={`/pustaka/${submission.slug}`}
                        className="ml-auto text-xs font-semibold text-ink underline"
                      >
                        Lihat di Pustaka
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {submission.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-ink-soft">
                    {submission.summary}
                  </p>
                  {submission.reviewNote ? (
                    <p className="mt-1.5 border-t border-line pt-1.5 text-xs leading-5 text-ink">
                      <span className="font-semibold">Catatan admin: </span>
                      {submission.reviewNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {myPublished.length > 0 ? (
        <div className="mt-5">
          <Panel
            title={`Artikel terbit milik saya (${myPublished.length})`}
            description="Menyunting artikel terbit akan mengirim revisi untuk ditinjau."
          >
            <ul className="grid gap-2">
              {myPublished.map((article) => {
                const open = revisions.find(
                  (revision) =>
                    revision.submissionId === article.submissionId &&
                    (revision.status === "pending" ||
                      revision.status === "needs_revision"),
                );
                const latest = revisions.find(
                  (revision) => revision.submissionId === article.submissionId,
                );

                return (
                  <li
                    key={article.submissionId}
                    className="border-l-4 border-l-safe bg-paper px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone="success">Terbit</Tag>
                      {open ? (
                        <Tag tone={REVISION_TONE[open.status]}>
                          {REVISION_LABEL[open.status]}
                        </Tag>
                      ) : latest ? (
                        <Tag tone={REVISION_TONE[latest.status]}>
                          {REVISION_LABEL[latest.status]}
                        </Tag>
                      ) : null}
                      <span className="text-[11px] text-ink-muted">
                        {formatDate(article.publishedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-ink">
                      {article.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <Link
                        href={`/pustaka/${article.slug}`}
                        className="text-xs font-semibold text-ink underline"
                      >
                        Lihat di Pustaka
                      </Link>
                      <Link
                        href={`/komunitas/artikel?edit=${article.submissionId}`}
                        className="text-xs font-semibold text-ink underline"
                      >
                        {open ? "Lanjutkan revisi" : "Edit / ajukan revisi"}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      ) : null}

      {editable.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {editable.map((submission) => (
            <Panel
              key={submission.id}
              title={`Perbaiki: ${submission.title}`}
              description="Mengirim ulang akan mengubah status menjadi menunggu tinjauan."
            >
              <SubmissionForm
                initial={{
                  id: submission.id,
                  title: submission.title,
                  summary: submission.summary,
                  category: submission.category,
                  body: submission.body,
                  bodyJson: submission.bodyJson,
                  references: submission.references,
                }}
              />
            </Panel>
          ))}
        </div>
      ) : null}
    </div>
  );
}

