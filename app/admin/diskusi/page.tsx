import Link from "next/link";
import { getStore } from "@/lib/db";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { Panel, Pagination, Tag, formatDate } from "@/components/ui/primitives";
import { clampPage } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminDiskusiPage({
  searchParams,
}: {
  searchParams: Promise<{ halaman?: string }>;
}) {
  const params = await searchParams;
  const page = clampPage(params.halaman);
  const result = await getStore().listThreads({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <Panel title={`${result.total} diskusi`} description="Terbaru lebih dulu">
      {result.items.length === 0 ? (
        <p className="text-sm text-ink-muted">Belum ada diskusi.</p>
      ) : (
        <ul className="grid gap-2">
          {result.items.map((thread) => (
            <li key={thread.id} className="border-l-4 border-l-ink bg-paper px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Tag>{thread.category}</Tag>
                <span className="text-[11px] text-ink-muted">
                  {thread.authorName} · {formatDate(thread.createdAt)} ·{" "}
                  {thread.replyCount} balasan
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-ink">{thread.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-soft">
                {thread.body}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Link
                  href={`/komunitas/${thread.id}`}
                  className="inline-flex min-h-9 items-center border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:bg-lime"
                >
                  Lihat
                </Link>
                <ModerationActions
                  label="Sembunyikan"
                  payload={{ action: "remove-content", targetType: "thread", targetId: thread.id }}
                  confirmText="Diskusi akan disembunyikan dari publik. Tindakan ini tercatat di riwayat moderasi."
                  tone="danger"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(next) => `/admin/diskusi?halaman=${next}`}
        label="Navigasi halaman diskusi"
      />
    </Panel>
  );
}