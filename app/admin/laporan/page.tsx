import Link from "next/link";
import { getStore } from "@/lib/db";
import type { ReportStatus } from "@/lib/db/types";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { Panel, Pagination, Tag, formatDate } from "@/components/ui/primitives";
import { clampPage } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const FILTERS: { id: ReportStatus | "all"; label: string }[] = [
  { id: "open", label: "Terbuka" },
  { id: "reviewing", label: "Ditinjau" },
  { id: "resolved", label: "Selesai" },
  { id: "all", label: "Semua" },
];

const PAGE_SIZE = 20;

/**
 * Transisi status yang relevan untuk tiap keadaan. Aksi yang akan menghasilkan
 * status yang sama tidak ditampilkan.
 */
const NEXT_STATUS: Record<
  ReportStatus,
  { status: ReportStatus; label: string; tone: "primary" | "secondary" }[]
> = {
  open: [
    { status: "reviewing", label: "Tandai ditinjau", tone: "secondary" },
    { status: "resolved", label: "Selesaikan", tone: "primary" },
  ],
  reviewing: [
    { status: "resolved", label: "Selesaikan", tone: "primary" },
    { status: "open", label: "Buka lagi", tone: "secondary" },
  ],
  resolved: [{ status: "open", label: "Buka lagi", tone: "secondary" }],
};

export default async function AdminLaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; halaman?: string }>;
}) {
  const params = await searchParams;
  const valid = new Set(FILTERS.map((f) => f.id as string));
  const filter = params.status && valid.has(params.status) ? params.status : "open";
  const page = clampPage(params.halaman);

  const result = await getStore().listReportsWithContext({
    status: filter === "all" ? undefined : (filter as ReportStatus),
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/admin/laporan?status=${f.id}`}
            className={`inline-flex min-h-11 items-center whitespace-nowrap border-2 px-3 text-xs font-bold ${
              filter === f.id
                ? "border-ink bg-ink text-on-ink"
                : "border-line-strong bg-surface text-ink-soft hover:border-ink"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="border-l-4 border-l-amber bg-amber-soft px-3 py-2 text-xs leading-5 text-ink">
        Laporan pengguna belum tentu benar. Tinjau isi konten sebelum mengambil
        tindakan, dan jangan publikasikan identitas pelapor.
      </div>

      <Panel title={`${result.total} laporan`}>
        {result.items.length === 0 ? (
          <p className="text-sm text-ink-muted">Tidak ada laporan pada filter ini.</p>
        ) : (
          <ul className="grid gap-2">
            {result.items.map((report) => (
              <li key={report.id} className="border-l-4 border-l-coral bg-paper px-3 py-2.5">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                  <span className="min-w-0 saring-break text-sm font-bold leading-snug text-ink sm:grow sm:basis-2/5">
                    {report.reason}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-muted">
                      {formatDate(report.createdAt)}
                    </span>
                    <Tag tone={report.status === "resolved" ? "success" : "warn"}>
                      {report.status}
                    </Tag>
                  </span>
                </div>
                <p className="mt-0.5 saring-break text-[11px] text-ink-muted">
                  Target: {report.targetType} · id {report.targetId.slice(0, 8)}
                </p>
                {report.context.threadTitle ? (
                  <p className="mt-0.5 saring-break text-xs leading-5 text-ink">
                    Diskusi:{" "}
                    <span className="font-semibold">
                      {report.context.threadTitle}
                    </span>
                  </p>
                ) : null}
                {report.targetType === "reply" ? (
                  <div className="mt-1 border-l-2 border-l-line pl-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      Balasan yang dilaporkan
                      {report.context.replyAuthorName
                        ? ` · ${report.context.replyAuthorName}`
                        : ""}
                    </p>
                    <p className="mt-0.5 line-clamp-4 saring-break text-xs leading-5 text-ink-soft">
                      {report.context.replyBody ?? "Balasan tidak tersedia."}
                    </p>
                  </div>
                ) : null}
                {report.details ? (
                  <p className="mt-1 saring-break text-xs leading-5 text-ink-soft">
                    {report.details}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {report.context.threadId ? (
                    <Link
                      href={`/komunitas/${report.context.threadId}`}
                      className="inline-flex min-h-9 items-center border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:text-on-lime hover:bg-lime"
                    >
                      Buka diskusi
                    </Link>
                  ) : null}
                  {NEXT_STATUS[report.status].map((next) => (
                    <ModerationActions
                      key={next.status}
                      label={next.label}
                      payload={{
                        action: "set-report-status",
                        reportId: report.id,
                        status: next.status,
                      }}
                      tone={next.tone}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(next) => `/admin/laporan?status=${filter}&halaman=${next}`}
          label="Navigasi halaman laporan"
        />
      </Panel>
    </div>
  );
}