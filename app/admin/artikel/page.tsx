import Link from "next/link";
import { getStore } from "@/lib/db";
import type { SubmissionStatus } from "@/lib/db/types";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { Panel, Pagination, Tag, formatDate } from "@/components/ui/primitives";
import { clampPage } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const STATUSES: { id: SubmissionStatus | "all"; label: string }[] = [
  { id: "pending", label: "Menunggu" },
  { id: "needs_revision", label: "Perlu revisi" },
  { id: "approved", label: "Disetujui" },
  { id: "rejected", label: "Ditolak" },
  { id: "all", label: "Semua" },
];

const PAGE_SIZE = 10;

export default async function AdminArtikelPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; halaman?: string }>;
}) {
  const params = await searchParams;
  const valid = new Set(STATUSES.map((s) => s.id as string));
  const filter = params.status && valid.has(params.status) ? params.status : "pending";
  const page = clampPage(params.halaman);

  const result = await getStore().listSubmissions({
    status: filter === "all" ? undefined : (filter as SubmissionStatus),
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <Link
            key={s.id}
            href={`/admin/artikel?status=${s.id}`}
            className={`min-h-9 border-2 px-2.5 py-1 text-xs font-bold ${
              filter === s.id
                ? "border-ink bg-ink text-paper"
                : "border-line bg-surface text-ink-soft hover:border-ink"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <Panel title={`${result.total} pengajuan`}>
        {result.items.length === 0 ? (
          <p className="text-sm text-ink-muted">Tidak ada pengajuan pada filter ini.</p>
        ) : (
          <ul className="grid gap-3">
            {result.items.map((item) => (
              <li key={item.id} className="border-2 border-ink bg-surface">
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-3 py-2">
                  <span className="text-sm font-bold text-ink">{item.title}</span>
                  <Tag tone={item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : "warn"}>
                    {item.status}
                  </Tag>
                  <span className="ml-auto text-[11px] text-ink-muted">
                    {item.authorName} · {formatDate(item.createdAt)}
                  </span>
                </div>

                <div className="px-3 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                    Ringkasan
                  </p>
                  <p className="text-sm leading-6 text-ink-soft">{item.summary}</p>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-ink">
                      Baca isi lengkap
                    </summary>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-soft">
                      {item.body}
                    </p>
                    {item.references ? (
                      <p className="mt-2 border-t border-line pt-1.5 text-xs text-ink-muted">
                        Referensi: {item.references}
                      </p>
                    ) : null}
                  </details>

                  {item.reviewNote ? (
                    <p className="mt-2 border-l-4 border-l-amber bg-amber-soft px-2 py-1 text-xs text-ink">
                      Catatan sebelumnya: {item.reviewNote}
                    </p>
                  ) : null}

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <ModerationActions
                      label="Setujui"
                      payload={{ action: "approve-submission", submissionId: item.id }}
                      confirmText="Artikel akan langsung terbit di Pustaka publik."
                      tone="primary"
                    />
                    <ModerationActions
                      label="Minta revisi"
                      payload={{ action: "request-revision", submissionId: item.id }}
                      tone="secondary"
                      requireNote
                      notePlaceholder="Apa yang perlu diperbaiki penulis?"
                    />
                    <ModerationActions
                      label="Tolak"
                      payload={{ action: "reject-submission", submissionId: item.id }}
                      tone="danger"
                      requireNote
                      notePlaceholder="Alasan penolakan"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(next) => `/admin/artikel?status=${filter}&halaman=${next}`}
          label="Navigasi halaman pengajuan"
        />
      </Panel>
    </div>
  );
}