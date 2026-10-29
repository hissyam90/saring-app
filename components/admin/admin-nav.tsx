"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function AdminNav({ openCounts }: { openCounts: { reports: number; pending: number } }) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const badge = (href: string) => {
    if (href === "/admin/laporan" && openCounts.reports > 0) return openCounts.reports;
    if (href === "/admin/artikel" && openCounts.pending > 0) return openCounts.pending;
    return null;
  };

  return (
    <nav aria-label="Navigasi admin">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {ITEMS.map((item) => {
          const count = badge(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center gap-2 border-2 px-3 py-2.5 text-sm font-semibold transition-colors lg:shrink ${
                  active(item.href)
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-surface text-ink hover:border-ink"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.label}</span>
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