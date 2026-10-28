"use client";

import { useState } from "react";
import { Eraser, Link2, Loader2, Lock, ScanSearch } from "lucide-react";
import { inspectLink, SEVERITY_LABELS } from "@/lib/analysis";
import type { LinkInspection, Severity } from "@/lib/analysis";

export function LinkCheck() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<LinkInspection | null>(null);
  const [lookup, setLookup] = useState<PhishTankResult | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClear = () => {
    setInput("");
    setResult(null);
    setLookup(null);
    setConsent(false);
  };

  const handleLookup = async () => {
    const inspected = inspectLink(input);
    setResult(inspected);
    if (!inspected.isValid || !consent) return;
    setLoading(true);
    try {
      const response = await fetch("/api/url-reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input.trim(), consent: true }),
      });
      const payload = (await response.json()) as PhishTankResult & { error?: string };
      setLookup(response.ok ? payload : { provider: "PhishTank", status: "unavailable", matched: false, verified: null, valid: null, checkedAt: new Date().toISOString(), message: payload.error ?? "Pemeriksaan tidak tersedia." });
    } catch {
      setLookup({ provider: "PhishTank", status: "unavailable", matched: false, verified: null, valid: null, checkedAt: new Date().toISOString(), message: "Pemeriksaan eksternal tidak tersedia." });
    } finally { setLoading(false); }
  };

  return (
    <div className="border-2 border-ink bg-surface shadow-neo-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" aria-hidden="true" />
          <h2 className="text-base font-bold">Periksa tautan</h2>
        </div>
        <span className="border-2 border-ink bg-lime px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
          Inspeksi teks · tanpa fetch
        </span>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <div className="border-2 border-ink bg-lime-soft px-3 py-2.5">
          <p className="flex items-start gap-2 text-xs leading-5 text-ink">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Tautan hanya diperiksa sebagai teks di peramban Anda — tidak pernah
              dibuka, diunduh, atau dihubungi.
            </span>
          </p>
        </div>

        <label
          htmlFor="link-input"
          className="mt-4 block text-sm font-semibold text-ink"
        >
          Tautan
        </label>
        <input
          id="link-input"
          type="url"
          inputMode="url"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="mis. https://situs.com atau bca-verifikasi.net/login"
          className="mt-2 w-full border-2 border-ink bg-paper px-3 py-3 font-mono text-sm text-ink placeholder:text-ink-muted/60"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleLookup}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-ink bg-lime px-5 text-sm font-bold text-ink shadow-neo transition-none hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-4 w-4" aria-hidden="true" />}
            {loading ? "Memeriksa sumber…" : "Periksa tautan"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-ink bg-surface px-4 text-sm font-semibold text-ink hover:bg-line"
          >
            <Eraser className="h-4 w-4" aria-hidden="true" />
            Bersihkan
          </button>
        </div>
        <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-soft">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-lime" />
          <span>Saya setuju URL ini dikirim ke PhishTank untuk pemeriksaan reputasi. Jangan kirim tautan pribadi yang memuat token, sesi, atau undangan rahasia.</span>
        </label>

        {result ? <LinkResult result={result} lookup={lookup} /> : null}
      </div>
    </div>
  );
}

const SEVERITY_CLASS: Record<Severity, string> = {
  high: "border-coral bg-coral-soft text-coral",
  medium: "border-amber bg-amber-soft text-amber",
  low: "border-ink bg-paper text-ink-soft",
};

type PhishTankResult = { provider: string; status: "match" | "no-match" | "rate-limited" | "unavailable"; matched: boolean; verified: boolean | null; valid: boolean | null; checkedAt: string; detailUrl?: string; message: string };

function LinkResult({ result, lookup }: { result: LinkInspection; lookup: PhishTankResult | null }) {
  if (!result.isValid) {
    return (
      <div className="mt-5 border-2 border-coral bg-coral-soft p-4" role="alert">
        <h3 className="text-sm font-bold text-coral">Tautan tidak dapat diproses</h3>
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
      <div className="border-2 border-ink bg-surface p-4">
        <h3 className="text-sm font-bold text-ink">Struktur yang dikenali</h3>
        <dl className="mt-2 grid gap-1 font-mono text-xs text-ink-soft sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Host</dt>
            <dd>{result.host || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Skema</dt>
            <dd>{result.scheme || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Path</dt>
            <dd className="break-all">{result.pathname || "—"}</dd>
          </div>
        </dl>
      </div>

      {result.findings.length > 0 ? (
        <ul className="grid gap-3">
          {result.findings.map((finding) => (
            <li key={finding.signal} className="border-2 border-ink bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-bold uppercase ${SEVERITY_CLASS[finding.severity]}`}
                >
                  {SEVERITY_LABELS[finding.severity]}
                </span>
                <h3 className="text-sm font-bold text-ink">{finding.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                {finding.explanation}
              </p>
              <p className="mt-2 break-all rounded-sm bg-paper px-2 py-1 font-mono text-xs text-ink-soft">
                {finding.evidence}
              </p>
              <p className="mt-2 text-sm text-ink">
                <span className="font-semibold">Langkah:</span> {finding.nextStep}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-2 border-ink bg-lime-soft p-4">
          <p className="text-sm leading-6 text-ink">
            Tidak ada indikator yang dikenali dari teks tautan ini. Ini bukan
            jaminan bahwa tautan aman.
          </p>
        </div>
      )}

      <div className={`border-2 border-ink p-4 ${lookup?.status === "match" ? "bg-coral-soft" : "bg-paper"}`}>
        <h3 className="text-sm font-bold text-ink">Reputasi eksternal</h3>
        <p className="mt-1 text-sm leading-6 text-ink">{lookup ? lookup.message : "Belum diperiksa ke sumber eksternal. Centang persetujuan lalu jalankan pemeriksaan."}</p>
        {lookup ? <p className="mt-2 text-xs text-ink-muted">Sumber: {lookup.provider} · Dicek: {new Date(lookup.checkedAt).toLocaleString("id-ID")}</p> : null}
        {lookup?.detailUrl ? <a href={lookup.detailUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold underline">Lihat detail PhishTank</a> : null}
      </div>
      <p className="border-2 border-ink bg-paper p-3 text-xs leading-5 text-ink-muted">
        Heuristik lokal dan reputasi provider adalah sinyal, bukan bukti mutlak. No-match tidak berarti aman; URL tidak pernah dibuka atau diikuti.
      </p>
    </div>
  );
}