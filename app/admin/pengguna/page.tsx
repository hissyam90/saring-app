import { getStore } from "@/lib/db";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { Panel, Pagination, Tag, formatDate } from "@/components/ui/primitives";
import { clampPage } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminPenggunaPage({
  searchParams,
}: {
  searchParams: Promise<{ halaman?: string }>;
}) {
  const params = await searchParams;
  const page = clampPage(params.halaman);
  const result = await getStore().listUsers({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="grid gap-4">
      <div className="border-l-4 border-l-ink bg-paper px-3 py-2 text-xs leading-5 text-ink-muted">
        Halaman ini tidak menampilkan email, kata sandi, atau data sensitif lain.
        Role diperiksa ulang di server pada setiap aksi.
      </div>

      <Panel title={`${result.total} pengguna`}>
        {result.items.length === 0 ? (
          <p className="text-sm text-ink-muted">Belum ada pengguna.</p>
        ) : (
          <ul className="grid gap-1.5">
            {result.items.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center gap-2 border-l-4 border-l-ink bg-paper px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {user.displayName}
                </span>
                <Tag tone={user.role === "admin" ? "success" : "neutral"}>
                  {user.role}
                </Tag>
                <span className="font-mono text-[11px] text-ink-muted">
                  {formatDate(user.createdAt)}
                </span>
                {user.role === "user" ? (
                  <ModerationActions
                    label="Jadikan admin"
                    payload={{ action: "set-user-role", userId: user.id, role: "admin" }}
                    confirmText="Pengguna ini akan mendapat akses penuh ke area admin."
                    tone="secondary"
                  />
                ) : (
                  <ModerationActions
                    label="Turunkan ke user"
                    payload={{ action: "set-user-role", userId: user.id, role: "user" }}
                    confirmText="Akses admin pengguna ini akan dicabut."
                    tone="danger"
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(next) => `/admin/pengguna?halaman=${next}`}
          label="Navigasi halaman pengguna"
        />
      </Panel>
    </div>
  );
}