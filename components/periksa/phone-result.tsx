"use client";

import { ArrowUpRight, Copy, Info, ShieldAlert, TriangleAlert } from "lucide-react";
import type { PhoneAssessment, VerificationLevel } from "@/lib/analysis";

const LEVEL_STYLE: Record<
  VerificationLevel,
  { box: string; icon: typeof Info; iconColor: string }
> = {
  high: { box: "border-coral bg-coral-soft", icon: ShieldAlert, iconColor: "text-coral" },
  medium: { box: "border-amber bg-amber-soft", icon: TriangleAlert, iconColor: "text-amber" },
  low: { box: "border-ink bg-paper", icon: Info, iconColor: "text-ink-soft" },
};

export function PhoneResult({
  national,
  e164,
  assessment,
  copied,
  onCopy,
  officialSource,
}: {
  national: string;
  e164: string;
  assessment: PhoneAssessment;
  copied: boolean;
  onCopy: () => void;
  officialSource: { label: string; url: string; note: string };
}) {
  const style = LEVEL_STYLE[assessment.level];
  const Icon = style.icon;

  return (
    <section
      aria-label="Hasil penilaian nomor"
      className="mt-5 border-t-2 border-ink pt-5"
    >
      <div className={`border-2 ${style.box}`} role="status">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <Icon
            className={`mt-0.5 h-6 w-6 shrink-0 ${style.iconColor}`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Penilaian berdasarkan perilaku yang Anda laporkan
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold leading-tight text-ink">
              {assessment.levelLabel}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-ink-soft">
              {assessment.summary}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 border-2 border-ink bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-paper px-3 py-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Nomor ternormalisasi
          </h2>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex min-h-8 items-center gap-1.5 border-2 border-ink bg-surface px-2 py-1 text-[11px] font-bold text-ink hover:bg-lime"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>
        <dl className="grid gap-2 px-3 py-2.5 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
              Domestik
            </dt>
            <dd className="font-mono text-sm text-ink">{national}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
              Internasional (E.164)
            </dt>
            <dd className="font-mono text-sm text-ink">{e164}</dd>
          </div>
        </dl>
      </div>

      {assessment.indicators.length > 0 ? (
        <>
          <h2 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Perilaku yang Anda tandai ({assessment.indicators.length})
          </h2>
          <ul className="mt-2 grid gap-2.5">
            {assessment.indicators.map((indicator) => (
              <li key={indicator.id} className="border-l-4 border-l-ink bg-surface px-4 py-3">
                <h3 className="text-[15px] font-bold text-ink">{indicator.label}</h3>
                <div className="mt-1.5">
                  <p className="text-sm leading-6 text-ink-soft">
                    {indicator.explanation}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-ink">
                    <span className="font-semibold">Saran: </span>
                    {indicator.step}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="mt-4 bg-graphite text-paper">
        <div className="flex items-center gap-2 border-b border-white/15 px-4 py-2.5">
          <span className="h-2 w-2 bg-lime" aria-hidden="true" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime">
            Langkah berikutnya
          </h2>
        </div>
        <ol className="grid gap-2 px-4 py-3.5">
          {assessment.actionSteps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="mt-0.5 w-4 shrink-0 font-mono text-xs font-bold text-lime">
                {index + 1}
              </span>
              <span className="text-sm leading-6 text-paper/90">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 border-2 border-ink bg-paper px-3 py-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Yang belum dapat dipastikan
        </h2>
        <ul className="mt-1.5 grid gap-1">
          {assessment.uncertainties.map((item) => (
            <li
              key={item}
              className="flex items-start gap-1.5 text-xs leading-5 text-ink-soft"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 bg-ink-muted" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <details className="mt-3 border-2 border-ink bg-surface">
        <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-bold text-ink">
          Opsional: cek juga di portal resmi
        </summary>
        <div className="border-t-2 border-ink px-3 py-2.5">
          <p className="text-xs leading-5 text-ink-soft">
            Saring tidak menerima hasil dari portal ini — Anda memeriksanya
            sendiri di situs resmi.
          </p>
          <a
            href={officialSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center gap-2 border-2 border-ink bg-surface px-3 py-2 text-sm font-bold text-ink hover:bg-lime"
          >
            Buka {officialSource.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            {officialSource.note}
          </p>
        </div>
      </details>
    </section>
  );
}