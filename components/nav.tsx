"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  House,
  ListChecks,
  Menu,
  ScanSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Beranda", icon: House },
  { href: "/periksa", label: "Periksa", icon: ScanSearch },
  { href: "/latihan", label: "Latihan", icon: ShieldCheck },
  { href: "/langkah", label: "Langkah", icon: ListChecks },
  { href: "/pustaka", label: "Pustaka", icon: BookOpen },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-lime shadow-neo-sm">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-extrabold tracking-tight">Saring</span>
        <span className="block text-[11px] uppercase tracking-wider text-ink-muted">
          kepercayaan digital
        </span>
      </span>
    </Link>
  );
}

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
      {/* Mobile top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-3 lg:hidden">
        <span className="text-ink">
          <Brand />
        </span>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center border-2 border-ink bg-lime text-ink shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          aria-expanded={open}
          aria-label={open ? "Tutup menu" : "Buka menu"}
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
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
            className="absolute inset-y-0 right-0 flex w-72 flex-col gap-1 border-l-2 border-ink bg-paper p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 border-2 px-3 py-3 text-sm font-semibold transition-none ${
                  isActive(link.href)
                    ? "border-ink bg-lime text-ink shadow-neo"
                    : "border-transparent text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                <link.icon className="h-5 w-5" aria-hidden="true" />
                {link.label}
              </Link>
            ))}
            <p className="mt-4 border-t-2 border-line px-3 pt-4 text-xs leading-5 text-ink-muted">
              Pemrosesan lokal di peramban. Tanpa akun, tanpa pengiriman data.
            </p>
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r-2 border-ink bg-ink text-paper lg:flex">
        <div className="px-5 py-6">
          <Link href="/" className="flex items-center gap-3 text-paper">
            <span className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-lime text-ink shadow-neo-lime">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight">
                Saring
              </span>
              <span className="block text-[11px] uppercase tracking-wider text-paper/50">
                pendamping kepercayaan digital
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3" aria-label="Navigasi utama">
          <ul className="flex flex-col gap-1.5">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 border-2 px-3 py-2.5 text-sm font-semibold transition-none ${
                    isActive(link.href)
                      ? "border-ink bg-lime text-ink shadow-neo-lime"
                      : "border-transparent text-paper/70 hover:bg-paper/10 hover:text-paper"
                  }`}
                >
                  <link.icon className="h-5 w-5" aria-hidden="true" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-paper/15 px-5 py-4">
          <p className="text-xs leading-5 text-paper/60">
            Berhenti sebentar. Periksa sinyalnya.
          </p>
          <p className="mt-2 text-[11px] leading-4 text-paper/40">
            Analisis berjalan di peramban Anda.
          </p>
        </div>
      </aside>
    </>
  );
}