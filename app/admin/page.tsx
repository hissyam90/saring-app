import Link from "next/link";
import { getStore } from "@/lib/db";
import { Panel, Tag, formatDate } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const store = getStore();
  const [stats, pending, reports, log] = await Promise.all([
    store.stats(),
    store.listSubmissions({ status: "pending", page: 1, pageSize: 5 }),
    store.listReports({ status: "open", page: 1, pageSize: 5 }),
    store.listModerationLog(8),
  ]);

  const cards = [
    { label: "Diskusi", value: stats.threads, href: "/admin/diskusi" },
    { label: "Balasan", value: stats.replies, href: "/admin/diskusi" },
    { label: "Artikel menunggu", value: stats.pendingSubmissions, href: "/admin/artikel" },
    { label: "Artikel terbit", value: stats.publishedSubmissions, href: "/admin/artikel" },
    { label: "Laporan terbuka", value: stats.openReports, href: "/admin/laporan" },
    { label: "Pengguna", value: stats.users, href: "/admin/pengguna" },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border-2 border-ink bg-surface px-3 py-2.5 hover:bg-lime-soft"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              {card.label}
            </p>
            <p className="mt-0.5 font-mono text-2xl font-bold text-ink">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <Panel
        title="Antrean artikel"
        actions={
          <Link
            href="/admin/artikel"
            className="text-xs font-semibold text-ink underline"
          >
            Semua
          </Link>
        }
      >
        {pending.items.length === 0 ? (
          <p className="text-sm text-ink-muted">Tidak ada artikel menunggu.</p>
        ) : (
          <ul className="grid gap-1.5">
            {pending.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-2 border-l-4 border-l-amber bg-paper px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {item.title}
                </span>
                <span className="text-[11px] text-ink-muted">{item.authorName}</span>
                <Tag tone="warn">menunggu</Tag>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Laporan terbuka"
        actions={
          <Link
            href="/admin/laporan"
            className="text-xs font-semibold text-ink underline"
          >
            Semua
          </Link>
        }
      >
        {reports.items.length === 0 ? (
          <p className="text-sm text-ink-muted">Tidak ada laporan terbuka.</p>
        ) : (
          <ul className="grid gap-1.5">
            {reports.items.map((report) => (
              <li
                key={report.id}
                className="border-l-4 border-l-coral bg-paper px-3 py-2"
              >
                <p className="text-sm font-semibold text-ink">{report.reason}</p>
                <p className="text-[11px] text-ink-muted">
                  {report.targetType} · {formatDate(report.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Riwayat moderasi">
        {log.length === 0 ? (
          <p className="text-sm text-ink-muted">Belum ada tindakan moderasi.</p>
        ) : (
          <ul className="grid gap-1">
            {log.map((entry) => (
              <li key={entry.id} className="flex flex-wrap gap-2 text-xs text-ink-soft">
                <span className="font-mono text-ink-muted">
                  {formatDate(entry.createdAt)}
                </span>
                <span className="font-semibold text-ink">{entry.actorName}</span>
                <span>{entry.action}</span>
                <span className="text-ink-muted">({entry.targetType})</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}