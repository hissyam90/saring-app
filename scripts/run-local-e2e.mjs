/**
 * Menjalankan E2E Playwright terhadap PostgreSQL uji lokal.
 *
 *   npm run test:e2e:local
 *
 * Alur:
 *   1. Tentukan URL database uji (`SARING_E2E_DATABASE_URL`, atau default
 *      Docker Compose lokal).
 *   2. Validasi keamanan URL: host WAJIB localhost/127.0.0.1 dan nama database
 *      WAJIB berakhiran `_test`. Database produksi tidak pernah bisa terpilih
 *      hanya karena `DATABASE_URL` dari `.env.local` ditemukan.
 *   3. Bila memakai default, naikkan PostgreSQL 16.15 via Docker Compose.
 *   4. Tunggu database siap (`pg_isready` via driver `pg` yang sama).
 *   5. Terapkan migration ke database uji yang sama.
 *   6. Jalankan Playwright (server produksi & berkas test mewarisi env yang sama).
 *   7. Bersihkan container meskipun test gagal.
 *
 * Alternatif tanpa Docker: set `SARING_E2E_DATABASE_URL` menunjuk PostgreSQL
 * lokal Anda sendiri (mis. postgresql://user:pass@127.0.0.1:5432/nama_test),
 * lalu jalankan `npm run test:e2e:local`.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const COMPOSE_FILE = path.join(ROOT, "docker-compose.e2e.yml");
// Harus sama dengan nilai pada docker-compose.e2e.yml. Karena script adalah
// satu-satunya pemakai, kedua nilai ini dijaga sinkron di sini.
const COMPOSE_URL =
  "postgresql://saring:saring_ci_only@127.0.0.1:55432/saring_test";

/** Perintah lintas-platform (Windows: `npm`/`npx`/`docker` adalah file .cmd/.exe). */
function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(
      `Perintah gagal (exit ${result.status}): ${command} ${args.join(" ")}`,
    );
  }
}

function dockerAvailable() {
  const result = spawnSync("docker", ["info"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

/** Validasi pengaman: tolak database selain uji lokal. */
function validateTestDatabaseUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return "URL database tidak valid.";
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    return `Host database harus localhost/127.0.0.1, ditemukan "${host}".`;
  }
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!dbName.endsWith("_test")) {
    return `Nama database harus berakhiran "_test", ditemukan "${dbName}".`;
  }
  return null;
}

async function waitForPostgres(url) {
  const ssl = process.env.DATABASE_SSL === "disable" ? false : undefined;
  const deadline = Date.now() + 90_000;
  for (;;) {
    const client = new Client({ connectionString: url, ssl });
    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      console.log("[e2e:local] PostgreSQL uji siap menerima query.");
      return;
    } catch (error) {
      try {
        await client.end();
      } catch {
        /* abaikan */
      }
      if (Date.now() > deadline) {
        throw new Error(`PostgreSQL uji tidak siap: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
}

async function main() {
  let dockerStarted = false;

  // 1. URL target: eksplisit (SARING_E2E_DATABASE_URL) atau default Docker.
  const explicit = process.env.SARING_E2E_DATABASE_URL?.trim();
  const useDocker = !explicit;
  const targetUrl = explicit || COMPOSE_URL;

  // 2. Pengaman sebelum melakukan apa pun.
  const problem = validateTestDatabaseUrl(targetUrl);
  if (problem) {
    console.error(`[e2e:local] ${problem}`);
    console.error(
      "[e2e:local] E2E dibatalkan agar tidak pernah menyentuh database produksi.",
    );
    process.exitCode = 1;
    return;
  }

  process.env.SARING_E2E_DATABASE_URL = targetUrl;
  process.env.DATABASE_URL = targetUrl;
  process.env.DATABASE_SSL = process.env.DATABASE_SSL ?? "disable";
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = randomBytes(32).toString("hex");
  }

  console.log(`[e2e:local] Database uji: ${targetUrl}`);

  try {
    // 3. Docker Compose bila tidak memakai database eksternal.
    if (useDocker) {
      if (!dockerAvailable()) {
        console.error(
          "[e2e:local] Docker tidak tersedia. Siapkan PostgreSQL uji lokal lalu",
        );
        console.error(
          "[e2e:local] jalankan dengan SARING_E2E_DATABASE_URL yang menunjuk database",
        );
        console.error(
          '[e2e:local] berakhiran "_test" di 127.0.0.1, contoh:',
        );
        console.error(
          "[e2e:local]   $env:SARING_E2E_DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/nama_test'",
        );
        process.exitCode = 1;
        return;
      }
      console.log("[e2e:local] Menjalankan PostgreSQL 16.15 via Docker Compose…");
      run("docker", ["compose", "-f", COMPOSE_FILE, "up", "-d"]);
      dockerStarted = true;
    }

    // 4. Tunggu siap.
    await waitForPostgres(targetUrl);

    // 5. Migration pada database uji yang sama.
    console.log("[e2e:local] Menerapkan migration…");
    run("npm", ["run", "db:migrate"]);

    // 6. Playwright (argumen tambahan diteruskan, mis. nama berkas test).
    console.log("[e2e:local] Menjalankan Playwright…");
    run("npx", ["playwright", "test", ...process.argv.slice(2)]);

    process.exitCode = 0;
  } catch (error) {
    console.error("[e2e:local] Gagal:", error.message);
    process.exitCode = 1;
  } finally {
    // 7. Pembersihan selalu berjalan, bahkan saat test gagal.
    if (dockerStarted) {
      console.log("[e2e:local] Menghentikan container PostgreSQL uji…");
      try {
        run("docker", ["compose", "-f", COMPOSE_FILE, "down", "-v"]);
      } catch (error) {
        console.error("[e2e:local] Gagal menghentikan container:", error.message);
      }
    }
  }
}

await main();