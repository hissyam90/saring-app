import { getStore, isDatabaseConfigured } from "./index";

export type DatabaseStatus = "ok" | "unreachable" | "not-configured";

const HEALTH_TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("health-check-timeout")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Memeriksa koneksi database dengan kueri paling ringan.
 *
 * Dipakai oleh /api/health. Tidak mengembalikan pesan error, versi server,
 * atau detail koneksi kepada pemanggil; kegagalan hanya dilaporkan sebagai
 * status.
 */
export async function databaseStatus(): Promise<DatabaseStatus> {
  if (!isDatabaseConfigured()) return "not-configured";
  try {
    await withTimeout(getStore().countUsers(), HEALTH_TIMEOUT_MS);
    return "ok";
  } catch {
    return "unreachable";
  }
}
