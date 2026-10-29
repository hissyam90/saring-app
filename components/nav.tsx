"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  House,
  ListChecks,
  Menu,
  MessagesSquare,
  ScanSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AccountMenu } from "@/components/auth/account-menu";
import { NotificationBell } from "@/components/komunitas/notification-bell";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Beranda", icon: House },
  { href: "/periksa", label: "Periksa", icon: ScanSearch },
  { href: "/latihan", label: "Latihan", icon: ShieldCheck },
  { href: "/langkah", label: "Langkah", icon: ListChecks },
  { href: "/pustaka", label: "Pustaka", icon: BookOpen },
  { href: "/komunitas", label: "Komunitas", icon: MessagesSquare },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile top bar. identitas gelap yang sama dengan sidebar desktop */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b-2 border-lime bg-graphite px-4 py-3 text-graphite-ink lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center bg-lime text-on-lime">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight">
              Saring
            </span>
            <span className="block text-[10px] uppercase tracking-wider text-graphite-ink/65">
              kepercayaan digital
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell variant="mobile" />
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center bg-lime text-on-lime active:bg-lime-deep"
            aria-expanded={open}
            aria-label={open ? "Tutup menu" : "Buka menu"}
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-y-0 right-0 flex w-72 flex-col gap-1 bg-graphite p-4 text-graphite-ink"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
          >
            {LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-3 text-sm font-semibold ${
                    active
                      ? "bg-lime text-on-lime"
                      : "text-graphite-ink/75 hover:bg-graphite-ink/10 hover:text-graphite-ink"
                  }`}
                >
                  <link.icon className="h-5 w-5" aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
            <p className="mt-3 border-t border-white/15 px-3 pt-3 text-xs leading-5 text-graphite-ink/65">
              Pesan &amp; tautan dianalisis di peramban Anda.
            </p>
            <AccountMenu variant="mobile" />
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar. graphite pekat, dipisah aksen lime dari area utama */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-graphite text-graphite-ink lg:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <Link href="/" className="flex items-center gap-3 text-graphite-ink">
            <span className="flex h-10 w-10 items-center justify-center bg-lime text-on-lime">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight">
                Saring
              </span>
              <span className="block text-[11px] uppercase tracking-wider text-graphite-ink/70">
                pendamping kepercayaan digital
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5" aria-label="Navigasi utama">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-graphite-ink/70">
            Ruang kerja
          </p>
          <ul className="flex flex-col gap-1">
            {LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 py-2.5 pl-3 pr-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-lime text-on-lime"
                        : "text-graphite-ink/75 hover:bg-graphite-ink/[0.07] hover:text-graphite-ink"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 w-1 ${
                        active ? "bg-ink" : "bg-transparent group-hover:bg-lime/60"
                      }`}
                    />
                    <link.icon className="h-5 w-5" aria-hidden="true" />
                    <span className="flex-1">{link.label}</span>
                    {active ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-on-lime/80">
                        aktif
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <NotificationBell variant="desktop" />
          <AccountMenu variant="desktop" />
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs font-semibold leading-5 text-graphite-ink/80">
            Berhenti sebentar. Periksa sinyalnya.
          </p>
          <p className="mt-1.5 text-[11px] leading-4 text-graphite-ink/70">
            Pesan &amp; tautan dianalisis di peramban Anda.
          </p>
        </div>

        {/* Pemisah kontras antara sidebar dan area utama */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-[3px] bg-lime"
        />
      </aside>
    </>
  );
}