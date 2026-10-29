"use client";

import { useState } from "react";
import {
  CircleAlert,
  Eraser,
  Link2,
  Loader2,
  RefreshCw,
  ScanSearch,
} from "lucide-react";
import { inspectLink, SEVERITY_LABELS } from "@/lib/analysis";
import type { LinkInspection } from "@/lib/analysis";
import type { GsbLookup } from "@/lib/reputation/googleSafeBrowsing";
import { GSB_STATUS_LABEL } from "@/lib/reputation/googleSafeBrowsing";

export function LinkCheck() {
  const [input, setInput] = useState("");
  const [local, setLocal] = useState<LinkInspection | null>(null);
  const [external, setExternal] = useState<GsbLookup | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const runLookup = async (url: string) => {
    setLoading(true);
    setRequestError(null);
    try {
      const response = await fetch("/api/url-reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, consent: true }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Permintaan ditolak server (HTTP ${response.status}).`;
        setExternal(null);
        setRequestError(message);
        return;
      }
      setExternal(payload as GsbLookup);
    } catch {
      setExternal(null);
      setRequestError(
        "Tidak dapat menghubungi server Saring. Periksa koneksi Anda lalu coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    const inspected = inspectLink(input);
    setLocal(inspected);
    setExternal(null);
    setRequestError(null);
    if (!inspected.isValid || !consent) return;
    await runLookup(input.trim());
  };

  const handleClear = () => {
    setInput("");
    setLocal(null);
    setExternal(null);
    setConsent(false);
    setRequestError(null);
  };

  return (
    <div className="border-2 border-ink bg-surface shadow-neo-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" aria-hidden="true" />
          <h2 className="text-base font-bold">Periksa tautan</h2>
        </div>
        <span className="border-2 border-ink bg-lime px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-on-lime">
          Inspeksi teks · tidak dibuka
        </span>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <label
          htmlFor="link-input"
          className="block text-sm font-semibold text-ink"
        >
          Tautan yang dikirim pengirim
        </label>
        <input
          id="link-input"
          type="url"
          inputMode="url"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="https://situs.com atau bit.ly/abc123"
          className="mt-2 w-full border-2 border-ink bg-paper px-3 py-3 font-mono text-sm text-ink placeholder:text-placeholder"
        />
        <p className="mt-1.5 text-xs text-ink-muted">
          Tautan diperiksa sebagai teks. Saring tidak pernah membuka,
          mengunduh, atau mengikuti tautan yang Anda masukkan.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 border-2 border-line bg-paper px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
          />
          <span>
            <span className="block font-semibold text-ink">
              Kirim URL ini ke Google Safe Browsing (opsional)
            </span>
            <span className="mt-0.5 block text-xs leading-4 text-ink-muted">
              Hanya URL yang dikirim, melalui server Saring. Pesan dan nomor
              telepon Anda tidak pernah dikirim.
            </span>
          </span>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-ink bg-lime px-5 text-sm font-bold text-on-lime shadow-neo transition-none hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? "Memeriksa…" : "Periksa tautan"}
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

        {local ? (
          <LinkResult
            local={local}
            external={external}
            requestError={requestError}
            loading={loading}
            consent={consent}
            onRetry={() => runLookup(input.trim())}
          />
        ) : (
          <div className="mt-5 border-2 border-dashed border-ink/40 bg-paper px-4 py-5">
            <h3 className="text-sm font-bold text-ink">Hasil akan muncul di sini</h3>
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              Inspeksi lokal selalu berjalan. Pemeriksaan reputasi eksternal
              hanya dilakukan bila Anda mencentang persetujuan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExternalPanel({
  external,
  requestError,
  consent,
  loading,
  onRetry,
}: {
  external: GsbLookup | null;
  requestError: string | null;
  consent: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  const accent =
    external?.status === "threat"
      ? "border-l-coral"
      : external?.status === "no-match"
        ? "border-l-ink-muted"
        : "border-l-amber";

  return (
    <div className={`mt-5 border-l-4 bg-surface px-4 py-3.5 ${accent}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
          Reputasi eksternal · Google Safe Browsing
        </h3>
        {external ? (
          <span
            className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              external.status === "threat"
                ? "bg-coral text-on-coral"
                : external.inconclusive
                  ? "bg-amber text-on-amber"
                  : "bg-ink text-on-ink"
            }`}
          >
            {GSB_STATUS_LABEL[external.status]}
          </span>
        ) : null}
      </div>

      <div className="px-3 py-2.5">
        {!external && !requestError ? (
          <p className="text-sm leading-6 text-ink">
            Belum diperiksa. Centang persetujuan di atas, lalu jalankan
            pemeriksaan. Inspeksi lokal di atas tetap berlaku.
          </p>
        ) : null}

        {requestError ? (
          <p className="text-sm leading-6 text-ink">
            <span className="font-semibold">Permintaan gagal: </span>
            {requestError}
          </p>
        ) : null}

        {external ? (
          <p className="text-sm leading-6 text-ink">{external.message}</p>
        ) : null}

        {external?.status === "threat" && external.threats.length > 0 ? (
          <ul className="mt-2 grid gap-1">
            {external.threats.map((threat) => (
              <li
                key={threat.url}
                className="border-l-2 border-l-coral bg-coral-soft px-2.5 py-1.5"
              >
                <p className="text-xs font-bold text-ink">
                  {threat.labels.join(", ") || threat.threatTypes.join(", ")}
                </p>
                <p className="break-all font-mono text-[10px] text-ink-soft">
                  {threat.url}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {external?.attribution ? (
          <p className="mt-2 text-[11px] leading-5 text-ink-muted">
            <a
              href={external.attribution.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline underline-offset-2"
            >
              {external.attribution.text}
            </a>
          </p>
        ) : null}

        {external ? (
          <p className="mt-1.5 font-mono text-[10px] text-ink-muted">
            dicek {new Date(external.checkedAt).toLocaleString("id-ID")}
            {external.httpStatus ? ` · HTTP ${external.httpStatus}` : ""}
            {external.cacheHit ? " · dari cache" : ""}
          </p>
        ) : null}

        {consent ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="mt-3 inline-flex min-h-11 items-center gap-2 border-2 border-ink bg-surface px-3 py-2 text-sm font-bold text-ink hover:text-on-lime hover:bg-lime disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            {loading
              ? "Memeriksa…"
              : external
                ? "Coba periksa ulang"
                : "Periksa sekarang"}
          </button>
        ) : (
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            Persetujuan belum diberikan, jadi URL ini tidak dikirim ke Google
            Safe Browsing.
          </p>
        )}
      </div>
    </div>
  );
}

function LinkResult({
  local,
  external,
  requestError,
  loading,
  consent,
  onRetry,
}: {
  local: LinkInspection;
  external: GsbLookup | null;
  requestError: string | null;
  loading: boolean;
  consent: boolean;
  onRetry: () => void;
}) {
  if (!local.isValid) {
    return (
      <div className="mt-5 border-2 border-coral bg-coral-soft p-4" role="alert">
        <h3 className="text-sm font-bold text-ink">Tautan tidak dapat diproses</h3>
        <ul className="mt-2 grid gap-1 text-sm text-ink">
          {local.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t-2 border-ink pt-5">
      <div className="border-2 border-ink bg-surface">
        <h3 className="border-b-2 border-ink bg-paper px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Struktur tautan yang dikenali
        </h3>
        <dl className="grid gap-2 px-3 py-2.5 sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
              Host
            </dt>
            <dd className="break-all font-mono text-xs text-ink">
              {local.host || ", "}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
              Skema
            </dt>
            <dd className="font-mono text-xs text-ink">{local.scheme || ", "}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
              Path
            </dt>
            <dd className="break-all font-mono text-xs text-ink">
              {local.pathname || ", "}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Indikator lokal
        </h3>
        <span className="font-mono text-[11px] text-ink-muted">
          {local.findings.length} indikator
        </span>
      </div>

      {local.findings.length > 0 ? (
        <ul className="mt-2 grid gap-2.5">
          {local.findings.map((finding, index) => (
            <li
              key={finding.signal}
              className={`border-l-4 bg-surface px-4 py-3.5 ${
                finding.severity === "high"
                  ? "border-l-coral"
                  : finding.severity === "medium"
                    ? "border-l-amber"
                    : "border-l-ink-muted"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-ink-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    finding.severity === "high"
                      ? "bg-coral text-on-coral"
                      : finding.severity === "medium"
                        ? "bg-amber text-on-amber"
                        : "bg-ink text-on-ink"
                  }`}
                >
                  {SEVERITY_LABELS[finding.severity]}
                </span>
                <h4 className="text-[15px] font-bold text-ink">{finding.title}</h4>
              </div>

              <figure className="mt-2.5">
                <figcaption className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  Bagian URL
                </figcaption>
                <blockquote className="break-all border-l-2 border-lime bg-ink px-3 py-2 font-mono text-xs leading-5 text-on-ink">
                  {finding.evidence}
                </blockquote>
              </figure>

              <p className="mt-2.5 text-sm leading-6 text-ink-soft">
                {finding.explanation}
              </p>
              <p className="mt-1.5 flex items-start gap-2 border-t border-line pt-2.5 text-sm leading-6 text-ink">
                <CircleAlert
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{finding.nextStep}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 border-l-4 border-l-ink-muted bg-surface px-4 py-3.5">
          <p className="text-sm leading-6 text-ink-soft">
            Tidak ada indikator struktural yang cocok. Ini bukan jaminan bahwa
            tautan aman.
          </p>
        </div>
      )}

      <ExternalPanel
        external={external}
        requestError={requestError}
        consent={consent}
        loading={loading}
        onRetry={onRetry}
      />

      <p className="mt-3 border-2 border-ink bg-paper px-3 py-2.5 text-xs leading-5 text-ink-muted">
        Satu indikator saja tidak membuktikan tautan berbahaya. Sebaliknya,
        &ldquo;tidak ada kecocokan&rdquo; di Google Safe Browsing hanya berarti
        URL ini tidak termasuk daftar ancaman yang diketahui saat pemeriksaan,
        bukan jaminan keamanan.
      </p>
    </div>
  );
}