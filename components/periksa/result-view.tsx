import type { AnalysisResult, Finding, Severity } from "@/lib/analysis";
import { CATEGORY_LABELS, DISCLAIMER, SEVERITY_LABELS } from "@/lib/analysis";
import { ArrowRight, Info, ShieldAlert, TriangleAlert } from "lucide-react";

const SEVERITY_STYLES: Record<Severity, string> = {
  high: "bg-coral-soft text-coral",
  medium: "bg-warn-soft text-warn",
  low: "bg-line text-ink-muted",
};

const CLASSIFICATION_STYLES = {
  "many-signals": {
    icon: ShieldAlert,
    box: "border-coral/30 bg-coral-soft text-coral",
  },
  "needs-review": {
    icon: TriangleAlert,
    box: "border-warn/30 bg-warn-soft text-warn",
  },
  "limited-signals": {
    icon: Info,
    box: "border-safe/30 bg-safe-soft text-safe",
  },
} as const;

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[severity]}`}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={finding.severity} />
        <span className="text-xs font-medium text-ink-muted">
          {CATEGORY_LABELS[finding.category]}
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold text-ink">{finding.title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-ink-soft">
        {finding.explanation}
      </p>
      {finding.evidence ? (
        <blockquote className="mt-3 overflow-hidden rounded-lg border-l-2 border-warn bg-paper px-3 py-2 font-mono text-xs leading-5 text-ink-soft">
          “{finding.evidence}”
        </blockquote>
      ) : null}
      <p className="mt-3 flex items-start gap-2 text-sm text-ink">
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
        <span>{finding.nextStep}</span>
      </p>
    </li>
  );
}

export function ResultView({ result }: { result: AnalysisResult }) {
  const config = CLASSIFICATION_STYLES[result.classification];
  const Icon = config.icon;

  return (
    <section aria-label="Hasil pemeriksaan">
      <div
        className={`rounded-xl border px-4 py-4 sm:px-5 ${config.box}`}
        role="status"
      >
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">{result.classificationLabel}</h2>
            <p className="mt-1 text-sm leading-6 opacity-90">
              {result.classificationDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-ink-muted">
        <span className="font-semibold text-ink">Skor sinyal:</span>{" "}
        {result.score}/100 — total bobot indikator heuristik yang terdeteksi.
        Angka ini bukan peluang bahwa pesan tersebut penipuan.
      </div>

      {result.findings.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {result.findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl border border-line bg-surface p-5">
          <p className="text-sm leading-6 text-ink-soft">
            Tidak ada indikator bahaya yang dikenali dari pola yang tersedia. Ini
            bukan jaminan bahwa pesan aman.
          </p>
        </div>
      )}

      {result.detectedUrls.length > 0 ? (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-ink">Tautan yang terdeteksi</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Hanya diperiksa dari teksnya, tanpa pernah dibuka atau dihubungi.
          </p>
          <ul className="mt-3 grid gap-2">
            {result.detectedUrls.map((url) => (
              <li
                key={url.url}
                className="font-mono text-xs leading-5 text-ink-soft"
              >
                {url.url}
                {url.signals.length > 0 ? (
                  <span className="ml-2 text-warn">
                    ({url.signals.join(", ")})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 rounded-lg bg-paper px-4 py-3 text-xs leading-5 text-ink-muted">
        {DISCLAIMER}
      </p>
    </section>
  );
}