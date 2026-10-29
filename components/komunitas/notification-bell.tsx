"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

interface Item {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Interval refresh notifikasi. Cukup jarang agar tidak menjadi polling intensif. */
const REFRESH_MS = 60_000;

/**
 * Ikon notifikasi dalam aplikasi.
 *
 * Sumber data hanya peristiwa nyata di database (balasan, keputusan moderasi).
 * Tidak ada data contoh. Refresh memakai interval 60 detik dan hanya berjalan
 * saat tab terlihat; tidak ada WebSocket atau layanan tambahan.
 */
export function NotificationBell({ variant }: { variant: "desktop" | "mobile" }) {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/community/notifications", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { items: Item[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // Jaringan bermasalah: badge tetap menampilkan nilai terakhir.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Pemuatan awal dijadwalkan (bukan setState sinkron di badan effect) agar
    // tidak memicu cascading render saat mount.
    const initial = setTimeout(() => void load(), 0);

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const markOne = async (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    setUnread((current) => Math.max(0, current - 1));
    try {
      await fetch("/api/community/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Status baca akan tersinkron pada refresh berikutnya.
    }
  };

  const markAll = async () => {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    );
    setUnread(0);
    try {
      await fetch("/api/community/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // Idem.
    }
  };

  const buttonClass =
    variant === "desktop"
      ? "relative flex w-full items-center gap-2 px-2 py-2 text-sm font-semibold text-graphite-ink/75 transition-colors hover:bg-graphite-ink/10 hover:text-graphite-ink"
      : "relative inline-flex h-11 w-11 items-center justify-center text-graphite-ink";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
        className={buttonClass}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {variant === "desktop" ? <span>Notifikasi</span> : null}
        {unread > 0 ? (
          <span
            className={
              variant === "desktop"
                ? "ml-auto inline-flex min-w-5 items-center justify-center border border-current px-1 font-mono text-[10px]"
                : // Di header mobile tombol hanya 44x44: badge dibuat absolut agar
                  // tidak menambah lebar header dan menyebabkan overflow.
                  "absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center border border-current bg-graphite px-0.5 font-mono text-[9px] leading-4"
            }
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`z-50 max-h-96 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto border-2 border-ink bg-surface text-ink shadow-neo-sm ${
            variant === "desktop"
              ? "absolute bottom-full left-0 mb-1"
              : "absolute right-0 top-full mt-1"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b-2 border-ink bg-paper px-3 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              Notifikasi
            </p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAll()}
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
              Belum ada notifikasi. Anda akan diberi tahu saat pertanyaan dibalas
              atau artikel ditinjau.
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
                            if (!item.readAt) void markOne(item.id);
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
                          onClick={() => void markOne(item.id)}
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
        </div>
      ) : null}
    </div>
  );
}

