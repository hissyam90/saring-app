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
  /** Pernah berhasil dimuat minimal sekali. */
  loaded: boolean;
  /** Pesan kegagalan terakhir; `null` bila pemuatan terakhir berhasil. */
  error: string | null;
}

const EMPTY: NotificationFeed = {
  items: [],
  unread: 0,
  loaded: false,
  error: null,
};
const REFRESH_MS = 60_000;
const LOAD_ERROR = "Notifikasi gagal dimuat.";
const READ_ERROR = "Status baca gagal disimpan.";

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
      if (!response.ok) {
        // Simpan data terakhir yang valid, tetapi tandai gagal agar panel
        // tidak terus menampilkan status memuat.
        publish({ ...snapshot, error: LOAD_ERROR });
        return;
      }
      const data = (await response.json()) as {
        items: NotificationItem[];
        unread: number;
      };
      publish({
        items: data.items,
        unread: data.unread,
        loaded: true,
        error: null,
      });
    } catch {
      publish({ ...snapshot, error: LOAD_ERROR });
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

/**
 * Memulihkan snapshot sebelum aksi optimistis, lalu menyinkronkan ulang
 * dengan server.
 *
 * Dipakai saat penulisan status baca gagal. Kegagalan POST tidak serta-merta
 * berarti server tidak berubah: server bisa saja sudah menyimpan perubahan,
 * tetapi respons gagal diterima browser. Memulihkan snapshot `before` saja
 * karenanya dapat membuat tampilan berbeda dari database. Urutannya:
 *   1. Pulihkan snapshot `before` dan tampilkan `READ_ERROR`.
 *   2. Bila masih ada pemuatan yang berjalan, tunggu ia selesai.
 *   3. Jalankan `refresh()` baru untuk mengambil kondisi server terkini.
 *   4. Bila refresh berhasil, pertahankan `READ_ERROR` di atas snapshot hasil
 *      refresh (jangan kembalikan snapshot lama setelah sinkronisasi).
 *   5. Bila refresh gagal, biarkan `LOAD_ERROR` sebagai pesan terakhir, karena
 *      kondisi server belum terbukti.
 */
async function recoverFromReadFailure(before: NotificationFeed): Promise<void> {
  publish({ ...before, error: READ_ERROR });

  if (inFlight) await inFlight;
  await refresh();

  if (snapshot.error === null) {
    publish({ ...snapshot, error: READ_ERROR });
  }
}

async function postRead(body: Record<string, unknown>): Promise<boolean> {
  const response = await fetch("/api/community/notifications/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.ok;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const before = snapshot;
  const readAt = new Date().toISOString();
  patch((current) => ({
    ...current,
    items: current.items.map((item) =>
      item.id === id ? { ...item, readAt } : item,
    ),
    unread: Math.max(0, current.unread - 1),
  }));

  let ok = false;
  try {
    ok = await postRead({ id });
  } catch {
    ok = false;
  }
  if (!ok) await recoverFromReadFailure(before);
  return ok;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const before = snapshot;
  const readAt = new Date().toISOString();
  patch((current) => ({
    ...current,
    items: current.items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
    unread: 0,
  }));

  let ok = false;
  try {
    ok = await postRead({ all: true });
  } catch {
    ok = false;
  }
  if (!ok) await recoverFromReadFailure(before);
  return ok;
}

/** Mencoba memuat ulang notifikasi (dipakai tombol "Coba lagi" di panel). */
export function retryNotifications(): Promise<void> {
  return refresh();
}
