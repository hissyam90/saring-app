"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

/**
 * Error boundary tingkat aplikasi.
 *
 * Pesan internal (stack trace, nama tabel, detail koneksi) tidak pernah
 * ditampilkan ke pengguna. `error.digest` adalah ID yang dibuat Next.js dan
 * aman ditampilkan agar laporan pengguna dapat dicocokkan dengan log server.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hanya ID digest yang dicatat. Pesan error tidak dikirim ke klien lain.
    console.error(`[saring:ui] render-error digest=${error.digest ?? "none"}`);
  }, [error.digest]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="border-2 border-ink bg-surface p-6 shadow-neo">
        <span className="flex h-10 w-10 items-center justify-center bg-coral text-on-coral">
          <CircleAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-ink">
          Halaman ini tidak dapat dimuat
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Terjadi kesalahan di server. Data Anda tidak dikirim ke mana pun.
          Coba muat ulang; bila masih gagal, kembali ke beranda.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
            Kode kejadian: {error.digest}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center border-2 border-ink bg-lime px-4 text-sm font-bold text-on-lime hover:bg-lime-deep"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center border-2 border-ink bg-surface px-4 text-sm font-bold text-ink hover:bg-paper"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
