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

export default async function AdminLaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; halaman?: string }>;
}) {
  const params = await searchParams;
  const valid = new Set(FILTERS.map((f) => f.id as string));
  const filter = params.status && valid.has(params.status) ? params.status : "open";
  const page = clampPage(params.halaman);

  const result = await getStore().listReports({
    status: filter === "all" ? undefined : (filter as ReportStatus),
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/admin/laporan?status=${f.id}`}
            className={`min-h-9 border-2 px-2.5 py-1 text-xs font-bold ${
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">{report.reason}</span>
                  <Tag tone={report.status === "resolved" ? "success" : "warn"}>
                    {report.status}
                  </Tag>
                  <span className="ml-auto text-[11px] text-ink-muted">
                    {formatDate(report.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  Target: {report.targetType} · id {report.targetId.slice(0, 8)}
                </p>
                {report.details ? (
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    {report.details}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {report.targetType === "thread" ? (
                    <Link
                      href={`/komunitas/${report.targetId}`}
                      className="inline-flex min-h-9 items-center border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:text-on-lime hover:bg-lime"
                    >
                      Buka diskusi
                    </Link>
                  ) : null}
                  <ModerationActions
                    label="Tandai ditinjau"
                    payload={{ action: "set-report-status", reportId: report.id, status: "reviewing" }}
                    tone="secondary"
                  />
                  <ModerationActions
                    label="Selesaikan"
                    payload={{ action: "set-report-status", reportId: report.id, status: "resolved" }}
                    tone="primary"
                  />
                  {report.status === "resolved" ? (
                    <ModerationActions
                      label="Buka lagi"
                      payload={{ action: "set-report-status", reportId: report.id, status: "open" }}
                      tone="secondary"
                    />
                  ) : null}
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