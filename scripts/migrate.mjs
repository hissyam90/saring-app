/**
 * Menjalankan migration PostgreSQL secara berurutan dan terlacak.
 *
 *   node scripts/migrate.mjs            # terapkan migration yang belum jalan
 *   node scripts/migrate.mjs --status   # hanya tampilkan status
 *
 * Migration disimpan di `lib/db/migrations/*.sql`, diurutkan berdasarkan nama
 * file, dan dicatat pada tabel `schema_migrations`. Setiap migration berjalan
 * di dalam transaksi: bila gagal, tidak ada perubahan yang tersimpan.
 *
 * Tidak ada operasi destruktif otomatis. Penghapusan tabel/kolom harus ditulis
 * eksplisit pada file migration baru agar dapat ditinjau.
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";
import nextEnv from "@next/env";

const MIGRATIONS_DIR = fileURLToPath(
  new URL("../lib/db/migrations/", import.meta.url),
);

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), true);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "DATABASE_URL belum diset. Migration memerlukan PostgreSQL (mis. add-on Heroku Postgres).",
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: 1,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL === "verify-full" },
});

async function listMigrationFiles() {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter((name) => name.endsWith(".sql")).sort();
}

async function main() {
  const showStatusOnly = process.argv.includes("--status");
  const files = await listMigrationFiles();

  if (files.length === 0) {
    console.log("Tidak ada file migration.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(
      `create table if not exists schema_migrations (
         name text primary key,
         applied_at timestamptz not null default now()
       )`,
    );

    const applied = new Set(
      (await client.query("select name from schema_migrations")).rows.map(
        (row) => row.name,
      ),
    );

    let pending = 0;

    for (const file of files) {
      if (applied.has(file)) {
        if (showStatusOnly) console.log(`sudah diterapkan  ${file}`);
        continue;
      }

      if (showStatusOnly) {
        console.log(`belum diterapkan  ${file}`);
        pending += 1;
        continue;
      }

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [
          file,
        ]);
        await client.query("commit");
        console.log(`diterapkan        ${file}`);
        pending += 1;
      } catch (error) {
        await client.query("rollback");
        console.error(`gagal             ${file}`);
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
        return;
      }
    }

    if (pending === 0 && !showStatusOnly) {
      console.log("Database sudah pada versi terbaru.");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
