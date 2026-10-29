import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_TONE: Record<Tone, string> = {
  primary: "border-ink bg-lime text-ink hover:bg-lime-deep",
  secondary: "border-ink bg-surface text-ink hover:bg-paper",
  danger: "border-ink bg-coral text-white hover:brightness-95",
  ghost: "border-transparent bg-transparent text-ink hover:bg-paper",
};

export function buttonClass(tone: Tone = "primary", extra = ""): string {
  return `inline-flex min-h-11 items-center justify-center gap-2 border-2 px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_TONE[tone]} ${extra}`;
}

export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-2 border-ink bg-surface ${className}`}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-paper px-4 py-2.5">
          <div className="min-w-0">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

const NOTICE_TONE = {
  info: "border-l-ink bg-paper text-ink-soft",
  warn: "border-l-amber bg-amber-soft text-ink",
  error: "border-l-coral bg-coral-soft text-ink",
  success: "border-l-safe bg-safe-soft text-ink",
} as const;

export function Notice({
  tone = "info",
  children,
}: {
  tone?: keyof typeof NOTICE_TONE;
  children: ReactNode;
}) {
  return (
    <p
      className={`border-l-4 px-3 py-2 text-sm leading-6 ${NOTICE_TONE[tone]}`}
      role={tone === "error" ? "alert" : undefined}
    >
      {children}
    </p>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warn" | "danger" | "success";
}) {
  const tones = {
    neutral: "bg-ink text-paper",
    warn: "bg-amber text-white",
    danger: "bg-coral text-white",
    success: "bg-safe text-white",
  } as const;
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-2 border-dashed border-ink/40 px-5 py-10 text-center">
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * Navigasi halaman berbasis tautan (bukan state klien) sehingga tetap bekerja
 * tanpa JavaScript dan dapat dibuka di tab baru. Dipakai oleh halaman admin dan
 * daftar publik yang memakai pagination server-side.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  label = "Navigasi halaman",
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav
      aria-label={label}
      className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3"
    >
      {prevDisabled ? (
        <span className={`${buttonClass("ghost")} opacity-40`} aria-disabled="true">
          Sebelumnya
        </span>
      ) : (
        <Link href={buildHref(page - 1)} className={buttonClass("secondary")}>
          Sebelumnya
        </Link>
      )}
      <span className="font-mono text-xs text-ink-muted">
        Halaman {page} / {totalPages}
      </span>
      {nextDisabled ? (
        <span className={`${buttonClass("ghost")} opacity-40`} aria-disabled="true">
          Berikutnya
        </span>
      ) : (
        <Link href={buildHref(page + 1)} className={buttonClass("secondary")}>
          Berikutnya
        </Link>
      )}
    </nav>
  );
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}