import { Pool } from "pg";
import type { Store } from "./store";
import { createMemoryStore } from "./memory";
import { createPostgresStore } from "./postgres";

const globalForDb = globalThis as unknown as { __saringPool?: Pool };

/**
 * Konfigurasi TLS koneksi database.
 *
 * - `disable`     : tanpa TLS (hanya bila server database memang tidak memakainya).
 * - `verify-full` : TLS + verifikasi sertifikat server memakai CA sistem.
 * - kosong        : TLS tanpa verifikasi sertifikat (umum untuk Heroku Postgres,
 *                   yang tidak menyediakan CA khusus untuk verifikasi klien).
 */
function sslConfig(): false | { rejectUnauthorized: boolean } {
  const mode = process.env.DATABASE_SSL;
  if (mode === "disable") return false;
  return { rejectUnauthorized: mode === "verify-full" };
}

function pool(): Pool {
  if (!globalForDb.__saringPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL tidak tersedia");
    globalForDb.__saringPool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: sslConfig(),
    });
  }
  return globalForDb.__saringPool;
}

let memoryStore: Store | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Mengembalikan store yang tepat.
 *
 * - Jika DATABASE_URL ada, selalu memakai PostgreSQL.
 * - Jika tidak ada: pada production melempar error (fail closed), pada
 *   development/pengujian memakai penyimpanan in-memory agar aplikasi dapat
 *   dijalankan dan diuji tanpa database.
 */
export function getStore(): Store {
  if (isDatabaseConfigured()) return createPostgresStore(pool());
  if (process.env.NODE_ENV === "production" && !process.env.SARING_ALLOW_MEMORY_STORE) {
    throw new Error(
      "DATABASE_URL wajib di production. Penolakan ini disengaja agar data tidak hilang.",
    );
  }
  memoryStore ??= createMemoryStore();
  return memoryStore;
}

/** Hanya untuk pengujian: kosongkan store in-memory. */
export function __resetMemoryStore(): void {
  memoryStore = null;
}

export type { Store } from "./store";
export * from "./types";