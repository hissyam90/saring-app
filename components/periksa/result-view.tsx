import Link from "next/link";
import type { AnalysisResult, Finding, Severity } from "@/lib/analysis";
import { CATEGORY_LABELS, DISCLAIMER } from "@/lib/analysis";
import {
  BookOpen,
  CircleAlert,
  Info,
  ListChecks,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

const ACCENT: Record<Severity, { bar: string; chip: string; label: string }> = {
  high: {
    bar: "border-l-coral",
    chip: "bg-coral text-white",
    label: "Prioritas tinggi",
  },
  medium: {
    bar: "border-l-amber",
    chip: "bg-amber text-white",
    label: "Perlu perhatian",
  },
  low: {
    bar: "border-l-ink-muted",
    chip: "bg-ink text-paper",
    label: "Indikasi tambahan",
  },
};

const TONE = {
  critical: {
    wrapper: "border-coral bg-coral-soft",
    eyebrow: "text-coral",
    icon: ShieldAlert,
    label: "Perlu tindakan sebelum melanjutkan",
    meter: "bg-coral",
  },
  caution: {
    wrapper: "border-amber bg-amber-soft",
    eyebrow: "text-amber",
    icon: TriangleAlert,
    label: "Periksa dulu sebelum melanjutkan",
    meter: "bg-amber",
  },
  neutral: {
    wrapper: "border-ink bg-surface",
    eyebrow: "text-ink-muted",
    icon: Info,
    label: "Sinyal bahaya masih terbatas",
    meter: "bg-ink",
  },
} as const;

function SignalCard({ finding, index }: { finding: Finding; index: number }) {
  const accent = ACCENT[finding.severity];
  return (
    <li
      className={`border-l-4 bg-surface px-4 py-3.5 last:mb-0 ${accent.bar}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] font-bold text-ink-muted">
          {String(index).padStart(2, "0")}
        </span>
        <span
          className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${accent.chip}`}
        >
          {accent.label}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
          {CATEGORY_LABELS[finding.category]}
        </span>
      </div>

      <h4 className="mt-1.5 text-[15px] font-bold leading-snug text-ink">
        {finding.title}
      </h4>

      {finding.evidence ? (
        <figure className="mt-2.5">
          <figcaption className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            Kutipan dari pesan
          </figcaption>
          <blockquote className="border-l-2 border-lime bg-ink px-3 py-2 font-mono text-xs leading-5 text-paper">
            {"\u201c"}
            {finding.evidence}
            {"\u201d"}
          </blockquote>
        </figure>
      ) : null}

      <div className="mt-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Mengapa relevan di sini
        </p>
        <p className="mt-0.5 text-sm leading-6 text-ink-soft">
          {finding.explanation}
        </p>
      </div>

      <div className="mt-2.5 flex items-start gap-2 border-t border-line pt-2.5">
        <CircleAlert
          className="mt-0.5 h-4 w-4 shrink-0 text-ink"
          aria-hidden="true"
        />
        <p className="text-sm leading-6 text-ink">
          <span className="font-semibold">Lakukan: </span>
          {finding.nextStep}
        </p>
      </div>
    </li>
  );
}

export function ResultView({ result }: { result: AnalysisResult }) {
  const tone = TONE[result.verdict.tone];
  const Icon = tone.icon;

  return (
    <section aria-label="Hasil pemeriksaan" className="border-t-2 border-ink pt-5">
      {/* 1. Keputusan sementara */}
      <div className={`border-2 ${tone.wrapper}`}>
        <div className="flex items-start gap-3 px-4 py-4">
          <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${tone.eyebrow}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              {tone.label}
            </p>
            <h2 className="mt-1 text-[22px] font-black leading-[1.15] tracking-tight text-ink">
              {result.verdict.title}
            </h2>
            <p className="mt-2 max-w-[52ch] text-sm leading-6 text-ink-soft">
              {result.verdict.summary}
            </p>
          </div>
        </div>

        <div className="border-t-2 border-ink/15 px-4 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Indikator internal. bukan peluang penipuan
            </span>
            <span className="font-mono text-xs font-bold text-ink">
              {result.score}/100
            </span>
          </div>
          <div
            className="mt-1.5 h-1.5 w-full bg-ink/10"
            role="img"
            aria-label={`Skor indikator internal ${result.score} dari 100`}
          >
            <div
              className={`h-full ${tone.meter}`}
              style={{ width: `${result.score}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-ink-muted">
            {result.classificationLabel}. Angka ini hanya total bobot aturan yang
            cocok, bukan probabilitas statistik.
          </p>
        </div>
      </div>

      {/* 2. Sinyal + bukti + alasan */}
      <div className="mt-6 flex items-baseline justify-between gap-2 border-b-2 border-ink pb-1.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
          Sinyal yang terdeteksi
        </h2>
        <span className="font-mono text-[11px] font-bold text-ink-muted">
          {result.findings.length}
        </span>
      </div>

      {result.findings.length > 0 ? (
        <ul className="mt-3 grid gap-2.5">
          {result.findings.map((finding, index) => (
            <SignalCard key={finding.id} finding={finding} index={index + 1} />
          ))}
        </ul>
      ) : (
        <div className="mt-3 border-l-4 border-l-ink-muted bg-surface px-4 py-3.5">
          <p className="text-sm leading-6 text-ink-soft">
            Tidak ada pola bahaya yang cocok dengan aturan yang tersedia. Ini
            bukan jaminan bahwa pesan aman.
          </p>
        </div>
      )}

      {/* 3. Langkah */}
      {result.verdict.actionSteps.length > 0 ? (
        <div className="mt-5 bg-graphite text-paper">
          <div className="flex items-center gap-2 border-b border-white/15 px-4 py-2.5">
            <span className="h-2 w-2 bg-lime" aria-hidden="true" />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime">
              Langkah yang disarankan
            </h2>
          </div>
          <ol className="grid gap-2 px-4 py-3.5">
            {result.verdict.actionSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-0.5 w-4 shrink-0 font-mono text-xs font-bold text-lime">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-paper/90">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* 4. Tautan */}
      {result.detectedUrls.length > 0 ? (
        <div className="mt-4 bg-surface">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            Tautan terdeteksi. tidak dibuka
          </h2>
          <ul className="mt-2 grid gap-1.5">
            {result.detectedUrls.map((url) => (
              <li
                key={url.url}
                className="break-all border-l-2 border-l-amber bg-paper px-2.5 py-1.5 font-mono text-xs leading-5 text-ink-soft"
              >
                {url.url}
                {url.signals.length > 0 ? (
                  <span className="ml-2 text-[10px] font-bold uppercase text-amber">
                    {url.signals.join(" / ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 5. Batasan */}
      <div className="mt-5 border-t border-line pt-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
          Yang belum dapat dipastikan
        </h2>
        <ul className="mt-1.5 grid gap-1">
          {result.verdict.uncertainties.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-xs leading-5 text-ink-soft"
            >
              <span
                className="mt-1.5 h-1 w-1 shrink-0 bg-ink-muted"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-5 text-ink-muted">{DISCLAIMER}</p>
      </div>

      {/* 6. Tindakan lanjutan */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/langkah?kondisi=received-message"
          className="inline-flex min-h-11 items-center gap-2 border-2 border-ink bg-lime px-4 py-2 text-sm font-bold text-ink"
        >
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          Susun rencana tindakan
        </Link>
        <Link
          href="/pustaka"
          className="inline-flex min-h-11 items-center gap-2 border-2 border-ink bg-surface px-4 py-2 text-sm font-bold text-ink hover:bg-lime-soft"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Baca panduan terkait
        </Link>
      </div>
    </section>
  );
}