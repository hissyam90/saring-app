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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    /**
     * Jebakan fokus sederhana: Tab/Shift+Tab tidak boleh keluar dari drawer
     * selama drawer terbuka, karena konten di belakangnya tidak terlihat.
     */
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && panel.contains(active);

      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("keydown", trapFocus);

    // Fokus awal di dalam drawer agar pembaca layar tidak tetap di belakang.
    closeButtonRef.current?.focus();

    /**
     * Kunci scroll halaman di belakang drawer. `overflow` saja tidak cukup di
     * iOS, jadi `overscroll-behavior` pada panel ikut diatur lewat kelas.
     */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    menuButtonRef.current?.focus();
  };

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
            aria-controls="nav-drawer-panel"
            aria-haspopup="dialog"
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

      {/*
        Drawer mobile.

        Lapisan `z-[80]` berada di atas header sticky (`z-50`) agar header tidak
        memotong panel dan konten di belakang benar-benar tertutup. Panel memakai
        `bg-graphite` yang opak; tirai memakai token `scrim` yang selalu gelap di
        kedua tema (bukan `ink` yang berbalik terang di dark mode).
      */}
      {open ? (
        <div className="fixed inset-0 z-[80] h-[100dvh] lg:hidden">
          <button
            type="button"
            data-testid="nav-backdrop"
            aria-label="Tutup menu"
            tabIndex={-1}
            className="absolute inset-0 z-0 cursor-default bg-scrim/70"
            onClick={closeMenu}
          />
          <div
            ref={panelRef}
            id="nav-drawer-panel"
            data-testid="nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            className="absolute inset-y-0 right-0 z-10 flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-1 overflow-y-auto overscroll-contain border-l-4 border-lime bg-graphite px-4 pt-3 text-graphite-ink shadow-[-6px_0_0_0_rgba(0,0,0,0.35)] [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between gap-2 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-graphite-ink/70">
                Menu
              </p>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMenu}
                aria-label="Tutup menu navigasi"
                className="inline-flex h-11 w-11 items-center justify-center border-2 border-graphite-ink/40 bg-lime text-on-lime hover:bg-lime-deep"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm font-semibold ${
                    active
                      ? "bg-lime text-on-lime"
                      : "text-graphite-ink/75 hover:bg-graphite-ink/10 hover:text-graphite-ink"
                  }`}
                >
                  <link.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">{link.label}</span>
                </Link>
              );
            })}
            <p className="mt-3 border-t border-white/15 px-3 pt-3 text-xs leading-5 text-graphite-ink/65">
              Pesan &amp; tautan dianalisis di peramban Anda.
            </p>
            <AccountMenu variant="mobile" onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col overflow-y-auto bg-graphite text-graphite-ink lg:flex">
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