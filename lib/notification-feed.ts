"use client";

/**
 * Sumber data notifikasi bersama.
 *
 * Navbar merender varian desktop dan mobile sekaligus; keduanya tersembunyi
 * dengan CSS. Tanpa modul ini, tiap varian akan melakukan pemuatan awal,
 * interval 60 detik, dan listener sendiri. Semua komponen karena itu berbagi
 * satu snapshot di sini: permintaan, interval, dan listener hanya berjalan
 * selama ada minimal satu pelanggan.
 */

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  items: NotificationItem[];
  unread: number;
  loaded: boolean;
}

const EMPTY: NotificationFeed = { items: [], unread: 0, loaded: false };
const REFRESH_MS = 60_000;

let snapshot: NotificationFeed = EMPTY;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let initial: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

function publish(next: NotificationFeed) {
  snapshot = next;
  for (const listener of listeners) listener();
}

async function refresh(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const response = await fetch("/api/community/notifications", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as NotificationFeed;
      publish({ items: data.items, unread: data.unread, loaded: true });
    } catch {
      // Jaringan bermasalah: snapshot terakhir dipertahankan.
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function onVisible() {
  if (document.visibilityState === "visible") void refresh();
}

function start() {
  initial = setTimeout(() => void refresh(), 0);
  timer = setInterval(() => {
    if (document.visibilityState === "visible") void refresh();
  }, REFRESH_MS);
  document.addEventListener("visibilitychange", onVisible);
}

function stop() {
  if (initial) clearTimeout(initial);
  if (timer) clearInterval(timer);
  initial = null;
  timer = null;
  document.removeEventListener("visibilitychange", onVisible);
}

export function subscribeNotifications(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

export function getNotificationFeed(): NotificationFeed {
  return snapshot;
}

export function getServerNotificationFeed(): NotificationFeed {
  return EMPTY;
}

function patch(update: (current: NotificationFeed) => NotificationFeed) {
  publish(update(snapshot));
}

export async function markNotificationRead(id: string): Promise<void> {
  const readAt = new Date().toISOString();
  patch((current) => ({
    ...current,
    items: current.items.map((item) =>
      item.id === id ? { ...item, readAt } : item,
    ),
    unread: Math.max(0, current.unread - 1),
  }));
  try {
    await fetch("/api/community/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch {
    // Status baca akan tersinkron pada refresh berikutnya.
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const readAt = new Date().toISOString();
  patch((current) => ({
    ...current,
    items: current.items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
    unread: 0,
  }));
  try {
    await fetch("/api/community/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  } catch {
    // Idem.
  }
}
