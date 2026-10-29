import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { SubmissionForm } from "@/components/komunitas/submission-form";
import { Panel, Tag, formatDate } from "@/components/ui/primitives";
import type { SubmissionStatus } from "@/lib/db/types";

export const metadata: Metadata = { title: "Ajukan artikel" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<SubmissionStatus, "neutral" | "warn" | "success" | "danger"> = {
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

export default async function SubmissionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");

  const mine = await getStore().listSubmissionsByAuthor(user.id);
  const editable = mine.filter(
    (s) => s.status === "pending" || s.status === "needs_revision",
  );

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
          artikel tidak tampil di Pustaka publik.
        </p>
      </header>

      <Panel title="Pengajuan baru">
        <SubmissionForm />
      </Panel>

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