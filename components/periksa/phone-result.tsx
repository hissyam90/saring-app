"use client";

import { ArrowUpRight, Copy } from "lucide-react";
import type { PhoneCheckResult } from "@/lib/analysis";

export function PhoneResult({
  result,
  source,
  copied,
  onCopy,
}: {
  result: PhoneCheckResult;
  source: { label: string; url: string; note: string };
  copied: boolean;
  onCopy: () => void;
}) {
  if (result.status === "invalid") {
    return (
      <div className="mt-5 border-2 border-coral bg-coral-soft p-4" role="alert">
        <h3 className="text-sm font-bold text-coral">Format nomor tidak valid</h3>
        <ul className="mt-2 grid gap-1 text-sm text-ink">
          {result.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className="border-2 border-ink bg-lime-soft p-4">
        <h3 className="text-sm font-bold text-ink">Nomor telah dinormalisasi</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Domestik
            </span>
            <input
              readOnly
              value={result.national}
              aria-label="Nomor ternormalisasi domestik"
              className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 font-mono text-base text-ink"
            />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Internasional (E.164)
            </span>
            <input
              readOnly
              value={result.e164}
              aria-label="Nomor ternormalisasi internasional"
              className="mt-1 w-full border-2 border-ink bg-surface px-3 py-2 font-mono text-base text-ink"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="mt-3 inline-flex h-10 items-center justify-center gap-2 border-2 border-ink bg-surface px-3 text-xs font-bold text-ink hover:bg-lime"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          {copied ? "Tersalin" : "Salin nomor"}
        </button>
      </div>

      {result.status === "not-checked" ? (
        <div className="border-2 border-ink bg-surface p-4">
          <h3 className="text-sm font-bold text-ink">Lanjutkan ke sumber resmi</h3>
          <p className="mt-1 text-sm leading-6 text-ink">
            Nomor sudah dinormalisasi.{" "}
            <span className="font-semibold">
              Saring belum memeriksa reputasinya secara langsung.
            </span>{" "}
            Lanjutkan pemeriksaan melalui sumber resmi.
          </p>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 border-2 border-ink bg-ink px-4 py-2.5 text-sm font-bold text-paper transition-none hover:bg-ink-soft"
          >
            Buka {source.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <p className="mt-2 text-xs leading-5 text-ink-muted">{source.note}</p>
        </div>
      ) : null}

      {result.status === "no-record" ? (
        <div className="border-2 border-ink bg-lime-soft p-4">
          <p className="text-sm leading-6 text-ink">
            Sumber tidak memiliki catatan untuk nomor ini.{" "}
            <span className="font-semibold">
              Ini bukan bukti bahwa nomor tersebut aman.
            </span>
          </p>
        </div>
      ) : null}

      {result.status === "reported" ? (
        <div className="border-2 border-coral bg-coral-soft p-4">
          <p className="text-sm font-semibold text-coral">
            Nomor memiliki catatan pelaporan di {result.source}.
          </p>
          <p className="mt-1 text-xs leading-5 text-ink">
            Laporan bisa saja tidak terverifikasi atau sudah kedaluwarsa. Ini
            bukan kesimpulan hukum terhadap pemilik nomor.
          </p>
        </div>
      ) : null}

      {result.status === "error" ? (
        <div className="border-2 border-coral bg-coral-soft p-4" role="alert">
          <p className="text-sm font-semibold text-coral">{result.message}</p>
        </div>
      ) : null}
    </div>
  );
}