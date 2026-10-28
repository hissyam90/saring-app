import type { AnalysisResult, Finding, Severity } from "@/lib/analysis";
import { CATEGORY_LABELS, DISCLAIMER, SEVERITY_LABELS } from "@/lib/analysis";
import { CircleAlert, Info, ShieldAlert, TriangleAlert } from "lucide-react";

const SEVERITY_CHIP: Record<Severity, string> = {
  high: "border-coral bg-coral-soft text-ink",
  medium: "border-amber bg-amber-soft text-ink",
  low: "border-ink bg-paper text-ink-soft",
};

const TONE = {
  critical: {
    box: "border-coral bg-coral-soft",
    icon: ShieldAlert,
    iconColor: "text-coral",
    label: "Perlu tindakan sebelum melanjutkan",
  },
  caution: {
    box: "border-amber bg-amber-soft",
    icon: TriangleAlert,
    iconColor: "text-amber",
    label: "Perlu diperiksa lebih dulu",
  },
  neutral: {
    box: "border-ink bg-paper",
    icon: Info,
    iconColor: "text-ink-soft",
    label: "Belum banyak sinyal",
  },
} as const;

function SignalCard({ finding, index }: { finding: Finding; index: number }) {
  return (
    <li className="border-2 border-ink bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-paper px-3 py-2">
        <span className="flex h-5 min-w-5 items-center justify-center border border-ink bg-ink px-1 font-mono text-[10px] font-bold text-paper">
          {index}
        </span>
        <span
          className={`border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SEVERITY_CHIP[finding.severity]}`}
        >
          {SEVERITY_LABELS[finding.severity]}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
          {CATEGORY_LABELS[finding.category]}
        </span>
      </div>

      <div className="px-3 py-3">
        <h4 className="text-sm font-bold leading-snug text-ink">{finding.title}</h4>

        {finding.evidence ? (
          <div className="mt-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
              Bukti dari teks
            </p>
            <blockquote className="mt-1 border-l-4 border-ink bg-paper px-2.5 py-2 font-mono text-xs leading-5 text-ink">
              â€œ{finding.evidence}â€
            </blockquote>
          </div>
        ) : null}

        <div className="mt-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
            Mengapa ini relevan
          </p>
          <p className="mt-0.5 text-sm leading-6 text-ink-soft">
            {finding.explanation}
          </p>
        </div>

        <div className="mt-2 border-t border-ink/15 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
            Untuk sinyal ini
          </p>
          <p className="mt-0.5 flex items-start gap-1.5 text-sm leading-6 text-ink">
            <CircleAlert
              className="mt-1 h-3.5 w-3.5 shrink-0 text-coral"
              aria-hidden="true"
            />
            <span>{finding.nextStep}</span>
          </p>
        </div>
      </div>
    </li>
  );
}

export function ResultView({ result }: { result: AnalysisResult }) {
  const tone = TONE[result.verdict.tone];
  const Icon = tone.icon;

  return (
    <section aria-label="Hasil pemeriksaan" className="border-t-2 border-ink pt-5">
      {/* 1. Ringkasan temuan */}
      <div className={`border-2 ${tone.box}`} role="status">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${tone.iconColor}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              {tone.label}
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold leading-tight text-ink">
              {result.verdict.title}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-ink-soft">
              {result.verdict.summary}
            </p>
            <h3 className="mt-2 inline-block border border-ink/30 bg-surface/70 px-2 py-0.5 text-[11px] font-bold text-ink">
              {result.classificationLabel}
            </h3>
          </div>
        </div>

        <div className="border-t-2 border-ink/15 px-4 py-2">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wide text-ink-soft">
            <span>Indikator internal (bukan peluang penipuan)</span>
            <span>{result.score}/100</span>
          </div>
          <div
            className="mt-1 h-1.5 w-full border border-ink bg-surface"
            role="img"
            aria-label={`Skor indikator internal ${result.score} dari 100`}
          >
            <div
              className={`h-full ${result.verdict.tone === "critical" ? "bg-coral" : result.verdict.tone === "caution" ? "bg-amber" : "bg-ink"}`}
              style={{ width: `${result.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Sinyal + 3. Bukti + 4. Alasan */}
      <div className="mt-5 flex items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Sinyal yang terdeteksi
        </h2>
        <span className="font-mono text-[11px] text-ink-muted">
          {result.findings.length} sinyal
        </span>
      </div>

      {result.findings.length > 0 ? (
        <ul className="mt-2 grid gap-2.5">
          {result.findings.map((finding, index) => (
            <SignalCard key={finding.id} finding={finding} index={index + 1} />
          ))}
        </ul>
      ) : (
        <div className="mt-2 border-2 border-ink bg-surface p-4">
          <p className="text-sm leading-6 text-ink-soft">
            Tidak ada pola bahaya yang cocok dengan aturan yang tersedia. Ini
            bukan jaminan bahwa pesan aman.
          </p>
        </div>
      )}

      {/* 5. Langkah berikutnya */}
      {result.verdict.actionSteps.length > 0 ? (
        <div className="mt-5 border-2 border-ink bg-ink text-paper">
          <h2 className="border-b border-paper/20 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-lime">
            Langkah yang disarankan
          </h2>
          <ol className="grid gap-2 px-4 py-3.5">
            {result.verdict.actionSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-lime font-mono text-[10px] font-bold text-lime">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-paper/90">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {result.detectedUrls.length > 0 ? (
        <div className="mt-3 border-2 border-ink bg-surface">
          <h2 className="border-b-2 border-ink bg-paper px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Tautan terdeteksi Â· tidak dibuka
          </h2>
          <ul className="grid gap-1.5 px-3 py-2.5">
            {result.detectedUrls.map((url) => (
              <li
                key={url.url}
                className="break-all font-mono text-xs leading-5 text-ink-soft"
              >
                {url.url}
                {url.signals.length > 0 ? (
                  <span className="ml-2 border border-ink bg-amber-soft px-1 text-[10px] font-bold uppercase text-ink">
                    {url.signals.join(" Â· ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 6. Yang belum dapat dipastikan */}
      <div className="mt-3 border-2 border-ink bg-paper px-3 py-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Yang belum dapat dipastikan
        </h2>
        <ul className="mt-1.5 grid gap-1">
          {result.verdict.uncertainties.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-xs leading-5 text-ink-soft">
              <span className="mt-1.5 h-1 w-1 shrink-0 bg-ink-muted" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 border-t border-ink/15 pt-2 text-xs leading-5 text-ink-muted">
          {DISCLAIMER}
        </p>
      </div>
    </section>
  );
}
