import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  NotificationFeed,
  NotificationItem,
} from "@/lib/notification-feed";

/**
 * Pemulihan kegagalan status baca (`recoverFromReadFailure`).
 *
 * Kegagalan POST tidak serta-merta berarti server tidak berubah: server bisa
 * saja sudah menyimpan perubahan tetapi respons gagal diterima browser. Uji di
 * sini membuktikan bahwa setelah kegagalan POST, klien menyinkronkan ulang
 * lewat `refresh()` (bukan sekadar mengembalikan snapshot lama), mempertahankan
 * `READ_ERROR` saat sinkronisasi berhasil, dan menyerahkan ke `LOAD_ERROR`
 * saat sinkronisasi juga gagal.
 */

const READ_ERROR = "Status baca gagal disimpan.";
const LOAD_ERROR = "Notifikasi gagal dimuat.";

interface FeedApi {
  getNotificationFeed: () => NotificationFeed;
  markNotificationRead: (id: string) => Promise<boolean>;
  markAllNotificationsRead: () => Promise<boolean>;
  retryNotifications: () => Promise<void>;
}

let feed: FeedApi;

/** Impor modul segar agar state tingkat modul (`snapshot`, `inFlight`) terisolasi per uji. */
async function loadFreshFeed(): Promise<FeedApi> {
  return await import("@/lib/notification-feed");
}

function item(over: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n1",
    kind: "thread_reply",
    title: "Balasan baru",
    body: null,
    href: "/komunitas",
    readAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

const listJson = (items: NotificationItem[], unread: number) =>
  new Response(JSON.stringify({ items, unread }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const okResponse = () => new Response("", { status: 200 });
const failResponse = (status = 500) => new Response("", { status });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Pemasangan `fetch` global yang mengarahkan GET (daftar notifikasi) dan POST
 * (tandai terbaca) ke handler terpisah agar dapat diganti antar-fase uji.
 */
function stubFetch() {
  let list: () => Response | Promise<Response> = () => okResponse();
  let read: () => Response | Promise<Response> = () => okResponse();

  const mock = vi.fn(async (input: unknown, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    return method === "POST" ? await read() : await list();
  });
  vi.stubGlobal("fetch", mock);

  return {
    calls: () => mock.mock.calls,
    setList: (handler: () => Response | Promise<Response>) => {
      list = handler;
    },
    setRead: (handler: () => Response | Promise<Response>) => {
      read = handler;
    },
  };
}

beforeEach(async () => {
  vi.resetModules();
  feed = await loadFreshFeed();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("notification-feed: pemulihan kegagalan status baca", () => {
  it("memulihkan data server dan mempertahankan READ_ERROR saat POST gagal dan server tidak berubah", async () => {
    const fetch = stubFetch();
    fetch.setList(() => listJson([item()], 1));
    fetch.setRead(() => failResponse(500));

    await feed.retryNotifications();
    expect(feed.getNotificationFeed().unread).toBe(1);

    const ok = await feed.markNotificationRead("n1");
    expect(ok).toBe(false);

    const state = feed.getNotificationFeed();
    expect(state.error).toBe(READ_ERROR);
    // Server tidak berubah: snapshot kembali ke kondisi server.
    expect(state.items[0].readAt).toBeNull();
    expect(state.unread).toBe(1);

    // Tombol "Coba lagi" tetap menghapus pesan error setelah refresh berhasil.
    await feed.retryNotifications();
    expect(feed.getNotificationFeed().error).toBeNull();
  });

  it("mengambil kondisi terbaru dari server saat server sudah berubah tetapi respons POST gagal", async () => {
    const stored = item({ readAt: "2026-01-01T01:00:00.000Z" });
    const fetch = stubFetch();
    fetch.setList(() => listJson([item()], 1));
    fetch.setRead(() => failResponse(500));

    await feed.retryNotifications();

    // Server ternyata sudah menyimpan perubahan; refresh harus mengambilnya.
    fetch.setList(() => listJson([stored], 0));

    await feed.markNotificationRead("n1");

    const state = feed.getNotificationFeed();
    expect(state.error).toBe(READ_ERROR);
    // Diambil dari server (terbaca), bukan snapshot lama (belum terbaca).
    expect(state.items[0].readAt).not.toBeNull();
    expect(state.unread).toBe(0);
  });

  it("menampilkan LOAD_ERROR saat refresh setelah kegagalan POST juga gagal", async () => {
    const fetch = stubFetch();
    fetch.setList(() => listJson([item()], 1));
    fetch.setRead(() => failResponse(500));

    await feed.retryNotifications();

    // Sinkronisasi ulang gagal: kondisi server belum terbukti.
    fetch.setList(() => failResponse(500));

    await feed.markNotificationRead("n1");

    expect(feed.getNotificationFeed().error).toBe(LOAD_ERROR);
  });

  it("menerapkan pembaruan optimistis sebelum POST selesai", async () => {
    const fetch = stubFetch();
    fetch.setList(() => listJson([item()], 1));
    const readGate = deferred<Response>();
    fetch.setRead(() => readGate.promise);

    await feed.retryNotifications();

    const pending = feed.markNotificationRead("n1");

    // Optimistis terlihat sebelum POST selesai.
    expect(feed.getNotificationFeed().unread).toBe(0);
    expect(feed.getNotificationFeed().items[0].readAt).not.toBeNull();

    readGate.resolve(okResponse());
    expect(await pending).toBe(true);
    expect(feed.getNotificationFeed().error).toBeNull();
  });

  it("menandai semua notifikasi sebagai terbaca tetap berfungsi", async () => {
    const fetch = stubFetch();
    fetch.setList(() => listJson([item(), item({ id: "n2" })], 2));
    fetch.setRead(() => okResponse());

    await feed.retryNotifications();

    expect(await feed.markAllNotificationsRead()).toBe(true);
    expect(feed.getNotificationFeed().unread).toBe(0);
    expect(
      feed.getNotificationFeed().items.every((i) => i.readAt !== null),
    ).toBe(true);
  });

  it("menunggu pemuatan yang sedang berjalan sebelum sinkronisasi ulang", async () => {
    const stored = item({ readAt: "2026-01-01T01:00:00.000Z" });
    const fetch = stubFetch();
    const inflightGate = deferred<Response>();

    let listCalls = 0;
    fetch.setList(() => {
      listCalls += 1;
      if (listCalls === 1) return listJson([item()], 1);
      if (listCalls === 2) return inflightGate.promise; // refresh yang menggantung
      return listJson([stored], 0); // refresh baru setelah pemulihan
    });
    fetch.setRead(() => failResponse(500));

    await feed.retryNotifications(); // listCalls = 1

    // Mulai refresh yang akan menggantung (listCalls = 2).
    void feed.retryNotifications();

    const postGate = deferred<Response>();
    fetch.setRead(() => postGate.promise);
    const pending = feed.markNotificationRead("n1");

    postGate.resolve(failResponse(500));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Pemulihan sedang menunggu refresh yang menggantung; selesaikan dengan data usang.
    inflightGate.resolve(listJson([item()], 1));
    await pending;

    // Satu refresh tambahan yang baru dijalankan setelah pemuatan selesai.
    expect(listCalls).toBe(3);
    const state = feed.getNotificationFeed();
    expect(state.error).toBe(READ_ERROR);
    expect(state.items[0].readAt).not.toBeNull();
    expect(state.unread).toBe(0);
  });
});