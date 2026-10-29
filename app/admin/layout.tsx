import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { getStore } from "@/lib/db";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin Saring" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");
  // Pemeriksaan role di server. notFound() dipakai agar keberadaan area admin
  // tidak diumumkan kepada pengguna biasa.
  if (user.role !== "admin") notFound();

  const stats = await getStore().stats();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center bg-ink text-lime">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              Area admin
            </p>
            <p className="text-base font-bold text-ink">{user.displayName}</p>
          </div>
        </div>
        <p className="text-xs text-ink-muted">
          {stats.pendingSubmissions} artikel menunggu · {stats.openReports} laporan
          terbuka
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-6">
          <AdminNav
            openCounts={{
              reports: stats.openReports,
              pending: stats.pendingSubmissions,
            }}
          />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}