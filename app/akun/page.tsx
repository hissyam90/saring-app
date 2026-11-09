import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { buttonClass, Panel, Tag, formatDate } from "@/components/ui/primitives";
import { DraftList, type DraftRow } from "@/components/komunitas/draft-list";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArchiveArticleButton } from "@/components/komunitas/archive-article-button";
import type { SubmissionStatus } from "@/lib/db/types";

export const metadata: Metadata = { title: "Akun saya" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: "Menunggu tinjauan",
  approved: "Disetujui",
  needs_revision: "Perlu revisi",
  rejected: "Ditolak",
};

export default async function AkunPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");

  const store = getStore();
  const [mine, submissions, drafts, bookmarks] = await Promise.all([
    store.listThreadsByAuthor(user.id),
    store.listSubmissionsByAuthor(user.id),
    store.listDrafts(user.id),
    store.listBookmarks(user.id),
  ]);

  const draftRows: DraftRow[] = drafts.map((draft) => {
    const payload = draft.payload as { title?: string };
    return {
      id: draft.id,
      kind: draft.kind,
      targetSubmissionId: draft.targetSubmissionId,
      title: payload.title ?? "",
      updatedAtLabel: formatDate(draft.updatedAt),
      resumeHref:
        draft.kind === "thread"
          ? `/komunitas/baru?draft=${draft.id}`
          : draft.targetSubmissionId
            ? `/komunitas/artikel?edit=${draft.targetSubmissionId}&draft=${draft.id}`
            : `/komunitas/artikel?draft=${draft.id}`,
    };
  });

  return (
    <div className="w-full min-w-0 max-w-none px-4 py-8 text-left sm:px-6 sm:py-10">
      <header className="mb-5 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Akun
        </p>
        {/*
          Nama tampilan boleh berisi sampai 40 karakter tanpa spasi. Tanpa
          `saring-break`, satu nama panjang mendorong seluruh halaman melebar di
          layar 320px.
        */}
        <h1 className="mt-1 saring-break text-2xl font-black tracking-tight text-ink sm:text-3xl">
          {user.displayName}
        </h1>
        <p className="saring-justify mt-2 text-sm leading-6 text-ink-muted">
          Role: <span className="font-semibold text-ink">{user.role}</span>. Email
          tidak ditampilkan di halaman publik.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link href="/komunitas/baru" className={buttonClass("primary", "w-full min-w-0 text-center")}>
          Buat pertanyaan
        </Link>
        <Link href="/komunitas/artikel" className={buttonClass("secondary", "w-full min-w-0 text-center")}>
          Ajukan artikel
        </Link>
        <Link href="/akun/tersimpan" className={buttonClass("secondary", "w-full min-w-0 text-center")}>
          Artikel tersimpan ({bookmarks.length})
        </Link>
        {user.role === "admin" ? (
          <Link href="/admin" className={buttonClass("secondary", "w-full min-w-0 text-center")}>
            Admin dashboard
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4">
        <Panel
          title="Preferensi tampilan"
          description="Berlaku di peramban ini dan tersimpan otomatis."
        >
          <ThemeToggle />
          <p className="saring-justify mt-3 text-xs leading-5 text-ink-muted">
            <strong className="font-semibold text-ink">Ikuti sistem</strong>{" "}
            mengikuti pengaturan terang/gelap perangkat Anda.
          </p>
        </Panel>

        <Panel title={`Draf saya (${draftRows.length})`}>
          <DraftList drafts={draftRows} />
        </Panel>
        <Panel title={`Pertanyaan saya (${mine.length})`}>
          {mine.length === 0 ? (
            <p className="text-sm text-ink-muted">Belum ada pertanyaan.</p>
          ) : (
            <ul className="grid gap-1.5">
              {mine.map((thread) => (
                <li key={thread.id}>
                  <Link
                    href={`/komunitas/${thread.id}`}
                    className="flex min-h-11 flex-col gap-1 border-l-4 border-l-ink bg-paper px-3 py-2 text-sm hover:bg-lime-soft sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                  >
                    <span className="min-w-0 saring-break font-semibold text-ink">
                      {thread.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-hint">
                      {thread.replyCount} balasan
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Pengajuan artikel (${submissions.length})`}>
          {submissions.length === 0 ? (
            <p className="text-sm text-ink-muted">Belum ada pengajuan artikel.</p>
          ) : (
            <ul className="grid gap-1.5">
              {submissions.map((submission) => (
                <li
                  key={submission.id}
                  className="flex min-w-0 flex-col gap-2 border-l-4 border-l-ink bg-paper px-3 py-2.5"
                >
                  <span className="min-w-0 saring-break text-sm font-semibold leading-snug text-ink">
                    {submission.title}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag
                      tone={
                        submission.archivedAt
                          ? "neutral"
                          : submission.status === "approved"
                            ? "success"
                            : submission.status === "rejected"
                              ? "danger"
                              : "warn"
                      }
                    >
                      {submission.archivedAt
                        ? "Diarsipkan"
                        : STATUS_LABEL[submission.status]}
                    </Tag>
                    <span className="font-mono text-[11px] text-ink-muted">
                      {formatDate(submission.createdAt)}
                    </span>
                    {submission.status === "approved" ? (
                      <ArchiveArticleButton
                        submissionId={submission.id}
                        archived={Boolean(submission.archivedAt)}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}