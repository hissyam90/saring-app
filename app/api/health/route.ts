import { NextResponse } from "next/server";
import { databaseStatus } from "@/lib/db/health";

export const dynamic = "force-dynamic";

/**
 * Health check untuk Heroku (router/health monitoring) dan uptime monitor.
 *
 * Hanya mengembalikan status ringkas. Tidak pernah mengembalikan versi server,
 * host, nama database, pesan error, atau konfigurasi internal.
 *
 * - 200 ok             : aplikasi dan database siap menerima trafik.
 * - 200 not-configured : mode pengembangan dengan penyimpanan in-memory.
 * - 503 degraded       : database tidak dapat dihubungi, atau belum
 *                        dikonfigurasi pada production (fail closed).
 */
export async function GET() {
  const database = await databaseStatus();
  const production = process.env.NODE_ENV === "production";
  const healthy =
    database === "ok" || (!production && database === "not-configured");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}