"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Flag,
  GitCompareArrows,
  LayoutDashboard,
  MessagesSquare,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin/artikel", label: "Artikel", icon: FileText },
  { href: "/admin/revisi", label: "Revisi", icon: GitCompareArrows },
  { href: "/admin/laporan", label: "Laporan", icon: Flag },
  { href: "/admin/diskusi", label: "Diskusi", icon: MessagesSquare },
  { href: "/admin/pengguna", label: "Pengguna", icon: Users },
];

/**
 * Navigasi area admin.
 *
 * Desktop: daftar vertikal dengan ikon dan badge jumlah (seperti sebelumnya).
 * Mobile/tablet: satu dropdown selebar layar. Sebelumnya daftar yang sama
 * dipaksa menjadi baris yang harus digeser horizontal, sehingga halaman
 * `Pengguna` tidak terjangkau tanpa menggeser layar.
 *
 * Badge tidak hilang di mobile: jumlah menunggu ikut tampil pada teks pilihan
 * dropdown dan sebagai ringkasan di bawahnya.
 */
export function AdminNav({ openCounts }: { openCounts: { reports: number; pending: number } }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const badge = (href: string) => {
    if (href === "/admin/laporan" && openCounts.reports > 0) return openCounts.reports;
    if (href === "/admin/artikel" && openCounts.pending > 0) return openCounts.pending;
    return null;
  };

  const currentHref = ITEMS.find((item) => active(item.href))?.href ?? "/admin";

  return (
    <nav aria-label="Navigasi admin" className="min-w-0">
      {/* Mobile & tablet: dropdown, tanpa geser horizontal. */}
      <div className="min-w-0 lg:hidden">
        <label
          htmlFor="admin-nav-select"
          className="block text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted"
        >
          Halaman admin
        </label>
        <select
          id="admin-nav-select"
          value={currentHref}
          onChange={(event) => router.push(event.target.value)}
          className="mt-1 min-h-11 w-full border-2 border-ink bg-surface px-3 py-2 text-sm font-bold text-ink"
        >
          {ITEMS.map((item) => {
            const count = badge(item.href);
            return (
              <option key={item.href} value={item.href}>
                {count ? `${item.label} (${count})` : item.label}
              </option>
            );
          })}
        </select>
        {openCounts.pending > 0 || openCounts.reports > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-ink">
            {openCounts.pending > 0 ? (
              <li className="border-2 border-line-strong bg-surface px-2 py-1">
                {openCounts.pending} artikel menunggu
              </li>
            ) : null}
            {openCounts.reports > 0 ? (
              <li className="border-2 border-line-strong bg-surface px-2 py-1">
                {openCounts.reports} laporan terbuka
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {/* Desktop: daftar vertikal. */}
      <ul className="hidden gap-1 lg:flex lg:flex-col">
        {ITEMS.map((item) => {
          const count = badge(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active(item.href)
                    ? "border-ink bg-ink text-on-ink"
                    : "border-line-strong bg-surface text-ink hover:border-ink"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">{item.label}</span>
                {count ? (
                  <span className="ml-auto border border-current px-1 font-mono text-[10px]">
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}