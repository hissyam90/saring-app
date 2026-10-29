"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCheck } from "lucide-react";
import {
  getNotificationFeed,
  getServerNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "@/lib/notification-feed";

/**
 * Ikon notifikasi. Panel dirender lewat portal dengan posisi `fixed` agar tidak
 * terpotong sidebar (`overflow-y-auto`) atau area konten. Data berasal dari satu
 * feed bersama, sehingga varian desktop dan mobile tidak memicu permintaan ganda.
 */
export function NotificationBell({ variant }: { variant: "desktop" | "mobile" }) {
  const feed = useSyncExternalStore(
    subscribeNotifications,
    getNotificationFeed,
    getServerNotificationFeed,
  );
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    const width = Math.min(352, window.innerWidth - 16);
    const gap = 4;
    const left = Math.min(
      Math.max(8, variant === "desktop" ? rect.left : rect.right - width),
      window.innerWidth - width - 8,
    );

    if (variant === "desktop") {
      const available = rect.top - 8;
      return {
        left,
        bottom: window.innerHeight - rect.top + gap,
        maxHeight: Math.max(160, Math.min(384, available)),
      };
    }

    const available = window.innerHeight - rect.bottom - 8;
    return {
      left,
      top: rect.bottom + gap,
      maxHeight: Math.max(160, Math.min(384, available)),
    };
  }, [variant]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setPos(measure());
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const reposition = () => setPos(measure());
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, measure]);

  const { items, unread, loaded } = feed;
  const label =
    unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi";

  const buttonClass =
    variant === "desktop"
      ? "relative flex w-full items-center gap-2 px-2 py-2 text-sm font-semibold text-graphite-ink/75 transition-colors hover:bg-graphite-ink/10 hover:text-graphite-ink"
      : "relative inline-flex h-11 w-11 items-center justify-center text-graphite-ink";

  const panel =
    open && pos
      ? createPortal(
          <div
            ref={panelRef}
            data-testid="notification-panel"
            aria-label="Notifikasi"
            style={{
              position: "fixed",
              left: pos.left,
              ...(pos.top !== undefined ? { top: pos.top } : {}),
              ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
              maxHeight: pos.maxHeight,
            }}
            className="z-[60] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto border-2 border-ink bg-surface text-ink shadow-neo-sm"
          >
            <div className="flex items-center justify-between gap-2 border-b-2 border-ink bg-paper px-3 py-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                Notifikasi
              </p>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllNotificationsRead()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink underline"
                >
                  <CheckCheck className="h-3 w-3" aria-hidden="true" />
                  Tandai semua
                </button>
              ) : null}
            </div>

            {!loaded ? (
              <p className="px-3 py-4 text-sm text-ink-muted">Memuat notifikasi…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-ink-muted">
                Belum ada notifikasi. Anda akan diberi tahu saat pertanyaan
                dibalas atau artikel ditinjau.
              </p>
            ) : (
              <ul className="grid divide-y divide-line">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={item.readAt ? "bg-surface" : "bg-lime-soft"}
                  >
                    <div className="px-3 py-2">
                      <p className="text-xs font-bold leading-snug text-ink">
                        {item.title}
                      </p>
                      {item.body ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-ink-soft">
                          {item.body}
                        </p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={() => {
                              if (!item.readAt) {
                                void markNotificationRead(item.id);
                              }
                              setOpen(false);
                            }}
                            className="text-[11px] font-semibold text-ink underline"
                          >
                            Buka
                          </Link>
                        ) : null}
                        {!item.readAt ? (
                          <button
                            type="button"
                            onClick={() => void markNotificationRead(item.id)}
                            className="text-[11px] text-ink-muted underline"
                          >
                            Tandai dibaca
                          </button>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide text-ink-muted">
                            dibaca
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={label}
        className={buttonClass}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {variant === "desktop" ? <span>Notifikasi</span> : null}
        {unread > 0 ? (
          <span
            className={
              variant === "desktop"
                ? "ml-auto inline-flex min-w-5 items-center justify-center border border-current px-1 font-mono text-[10px]"
                : "absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center border border-current bg-graphite px-0.5 font-mono text-[9px] leading-4"
            }
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
