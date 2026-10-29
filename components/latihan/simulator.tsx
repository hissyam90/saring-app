"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  RotateCcw,
  Trophy,
} from "lucide-react";
import {
  createRandom,
  pickSessionScenarios,
  scoreSession,
  SESSION_MODES,
} from "@/data/scenarios";
import type {
  AnswerRecord,
  ScenarioOption,
  SessionMode,
  TrainingScenario,
} from "@/data/scenarios";
import { LIBRARY } from "@/data/resources";

type Phase = "intro" | "question" | "summary";

function seedFromMode(mode: SessionMode): number {
  // Seed tetap per mode agar E2E deterministik; tombol ulangi memakai seed baru.
  return mode === "quick" ? 101 : mode === "standard" ? 202 : 303;
}

export function Simulator() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [scenarios, setScenarios] = useState<TrainingScenario[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  const start = (nextMode: SessionMode, seedOffset = 0) => {
    const list = pickSessionScenarios(
      SESSION_MODES.find((m) => m.id === nextMode)!.count,
      createRandom(seedFromMode(nextMode) + seedOffset),
    );
    setScenarios(list);
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setPhase("question");
  };

  const restart = () => {
    setPhase("intro");
    setScenarios([]);
    setIndex(0);
    setSelected(null);
    setAnswers([]);
  };

  if (phase === "intro") return <Intro onStart={start} />;
  if (phase === "summary") return <Summary answers={answers} onRestart={restart} />;

  const scenario = scenarios[index];
  const chosen = selected
    ? (scenario.options.find((option) => option.id === selected) ?? null)
    : null;

  const choose = (option: ScenarioOption) => {
    if (selected) return;
    setSelected(option.id);
  };

  const next = () => {
    if (!chosen) return;
    const updated = [...answers, { scenario, option: chosen }];
    setAnswers(updated);
    setSelected(null);
    if (index + 1 >= scenarios.length) {
      setPhase("summary");
    } else {
      setIndex((current) => current + 1);
    }
  };

  return (
    <QuestionView
      scenario={scenario}
      index={index}
      total={scenarios.length}
      selected={selected}
      chosen={chosen}
      onChoose={choose}
      onNext={next}
    />
  );
}

function Intro({ onStart }: { onStart: (mode: SessionMode) => void }) {
  return (
    <div className="border-2 border-ink bg-surface">
      <div className="border-b-2 border-ink px-4 py-4 sm:px-5">
        <h2 className="text-lg font-black tracking-tight text-ink">
          Mulai sesi latihan
        </h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Pilih panjang sesi. Soal diambil acak dari bank {18} skenario, tanpa
          pengulangan dalam satu sesi.
        </p>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="border-2 border-ink bg-paper px-4 py-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            Cara penilaian
          </h3>
          <ul className="mt-2 grid gap-1.5">
            <li className="flex items-start gap-2 text-sm leading-6 text-ink">
              <span className="mt-0.5 w-10 shrink-0 font-mono text-xs font-bold text-safe">
                100
              </span>
              <span>Langkah terbaik yang menutup risiko utama.</span>
            </li>
            <li className="flex items-start gap-2 text-sm leading-6 text-ink">
              <span className="mt-0.5 w-10 shrink-0 font-mono text-xs font-bold text-amber-text">
                50
              </span>
              <span>
                Sudah berhati-hati, tetapi masih menyisakan celah yang bisa
                dimanfaatkan.
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm leading-6 text-ink">
              <span className="mt-0.5 w-10 shrink-0 font-mono text-xs font-bold text-coral">
                0
              </span>
              <span>Tindakan berisiko atau tidak menutup risiko.</span>
            </li>
          </ul>
          <p className="mt-2 border-t border-line pt-2 text-xs leading-5 text-ink-muted">
            Skor menunjukkan hasil dalam sesi ini saja. Bukan ukuran kemampuan
            Anda di dunia nyata, dan bukan jaminan keamanan.
          </p>
        </div>

        <div className="mt-4 grid gap-2">
          {SESSION_MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onStart(option.id)}
              className="group flex min-h-14 items-center gap-3 border-2 border-ink bg-surface px-4 py-3 text-left transition-colors hover:bg-lime"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-graphite font-mono text-sm font-bold text-lime">
                {option.count}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-ink-muted">
                  {option.description}
                </span>
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-ink transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionView({
  scenario,
  index,
  total,
  selected,
  chosen,
  onChoose,
  onNext,
}: {
  scenario: TrainingScenario;
  index: number;
  total: number;
  selected: string | null;
  chosen: ScenarioOption | null;
  onChoose: (option: ScenarioOption) => void;
  onNext: () => void;
}) {
  const perfect = chosen ? chosen.points === 100 : false;
  const partial = chosen ? chosen.points > 0 && chosen.points < 100 : false;

  return (
    <div className="border-2 border-ink bg-surface">
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            {scenario.category}
          </p>
          <h2 className="mt-0.5 truncate text-base font-bold text-ink">
            {scenario.title}
          </h2>
        </div>
        <span className="shrink-0 font-mono text-xs font-bold text-ink">
          {index + 1}/{total}
        </span>
      </div>

      <div className="h-1 w-full bg-line">
        <div
          className="h-1 bg-ink transition-all"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <div className="px-4 py-4 sm:px-5">
        <p className="text-sm leading-6 text-ink-muted">{scenario.setup}</p>
        <blockquote className="mt-2.5 border-l-4 border-l-ink bg-paper px-3 py-2.5 text-sm leading-6 text-ink">
          {scenario.message}
        </blockquote>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-ink">
            Apa yang Anda lakukan?
          </legend>
          <div className="mt-2 grid gap-1.5">
            {scenario.options.map((option) => {
              const isChosen = option.id === selected;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChoose(option)}
                  disabled={selected !== null}
                  className={`min-h-11 border-2 px-3 py-2.5 text-left text-sm leading-6 transition-colors disabled:cursor-default ${
                    isChosen
                      ? "border-ink bg-ink text-on-ink"
                      : "border-line-strong bg-surface text-ink hover:border-ink hover:bg-lime-soft"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {chosen ? (
          <div
            className={`mt-4 border-2 ${
              perfect
                ? "border-safe bg-safe-soft"
                : partial
                  ? "border-amber bg-amber-soft"
                  : "border-coral bg-coral-soft"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-ink/15 px-3 py-2">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                {perfect ? (
                  <Check className="h-4 w-4 text-safe" aria-hidden="true" />
                ) : (
                  <CircleAlert
                    className={`h-4 w-4 ${partial ? "text-amber" : "text-coral"}`}
                    aria-hidden="true"
                  />
                )}
                {perfect
                  ? "Langkah terbaik"
                  : partial
                    ? "Sudah berhati-hati, belum lengkap"
                    : "Tindakan berisiko"}
              </p>
              <span className="font-mono text-xs font-bold text-ink">
                +{chosen.points} poin
              </span>
            </div>

            <div className="px-3 py-2.5">
              <p className="text-sm leading-6 text-ink">{chosen.feedback}</p>

              {chosen.risk ? (
                <p className="mt-2 text-sm leading-6 text-ink">
                  <span className="font-semibold">Risiko pilihan ini: </span>
                  {chosen.risk}
                </p>
              ) : null}

              <p className="mt-2 text-sm leading-6 text-ink">
                <span className="font-semibold">Langkah yang seharusnya: </span>
                {chosen.betterAction}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {chosen.rationale}
              </p>

              <button
                type="button"
                onClick={onNext}
                className="mt-3 inline-flex min-h-11 items-center gap-2 bg-ink px-4 py-2 text-sm font-bold text-on-ink hover:bg-ink-soft"
              >
                {index + 1 >= total ? "Lihat hasil" : "Soal berikutnya"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Summary({
  answers,
  onRestart,
}: {
  answers: AnswerRecord[];
  onRestart: () => void;
}) {
  const score = scoreSession(answers);
  const recommended = [
    ...new Set(score.needsReview.map((a) => a.scenario.article)),
  ]
    .map((slug) => LIBRARY.find((article) => article.id === slug))
    .filter((article): article is (typeof LIBRARY)[number] => Boolean(article));

  return (
    <div className="border-2 border-ink bg-surface">
      <div className="border-b-2 border-ink px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-ink" aria-hidden="true" />
          <h2 className="text-lg font-black tracking-tight text-ink">
            Hasil sesi
          </h2>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {score.bestCount} dari {score.total} soal dijawab dengan langkah
          terbaik.
        </p>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="border-2 border-ink bg-paper px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Poin sesi
            </span>
            <span className="font-mono text-sm font-bold text-ink">
              {score.earned} / {score.max}
            </span>
          </div>
          <div
            className="mt-1.5 h-2 w-full bg-ink/10"
            role="img"
            aria-label={`Skor sesi ${score.percentage} persen`}
          >
            <div
              className="h-full bg-ink"
              style={{ width: `${score.percentage}%` }}
            />
          </div>
          <p className="mt-1.5 font-mono text-xs font-bold text-ink">
            {score.percentage}% dari poin maksimum
          </p>
        </div>

        {score.categories.length > 0 ? (
          <>
            <h3 className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              Per kategori
            </h3>
            <ul className="mt-2 grid gap-1.5">
              {score.categories.map((category) => {
                const percent = Math.round(
                  (category.earned / category.max) * 100,
                );
                return (
                  <li
                    key={category.category}
                    className="flex items-center justify-between gap-3 border-l-4 border-l-ink bg-paper px-3 py-1.5"
                  >
                    <span className="text-sm text-ink">{category.category}</span>
                    <span className="shrink-0 font-mono text-xs text-ink-muted">
                      {category.earned}/{category.max} ({percent}%)
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {score.needsReview.length > 0 ? (
          <>
            <h3 className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              Perlu dipelajari ulang ({score.needsReview.length})
            </h3>
            <ul className="mt-2 grid gap-2">
              {score.needsReview.map((answer) => (
                <li
                  key={answer.scenario.id}
                  className={`border-l-4 bg-surface px-3 py-2.5 ${
                    answer.option.points === 0
                      ? "border-l-coral"
                      : "border-l-amber"
                  }`}
                >
                  <p className="text-sm font-bold text-ink">
                    {answer.scenario.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Pilihan Anda: {answer.option.label} ({answer.option.points}{" "}
                    poin)
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-ink">
                    <span className="font-semibold">Seharusnya: </span>
                    {answer.option.betterAction}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    {answer.option.rationale}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-4 border-2 border-safe bg-safe-soft px-3 py-2.5 text-sm leading-6 text-ink">
            Semua soal dijawab dengan langkah terbaik. Tetap berlatih, karena
            modus baru terus muncul.
          </p>
        )}

        {recommended.length > 0 ? (
          <>
            <h3 className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              Bacaan lanjutan
            </h3>
            <ul className="mt-2 grid gap-1.5">
              {recommended.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/pustaka/${article.id}`}
                    className="group flex items-center gap-2 border-2 border-ink bg-surface px-3 py-2 text-sm hover:bg-lime-soft"
                  >
                    <span className="min-w-0 flex-1 font-semibold text-ink">
                      {article.title}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-ink-muted">
          Skor ini hanya menggambarkan sesi latihan ini, bukan ukuran kemampuan
          keamanan digital Anda di dunia nyata dan bukan jaminan keamanan.
        </p>

        <button
          type="button"
          onClick={onRestart}
          className="mt-4 inline-flex min-h-11 items-center gap-2 border-2 border-ink bg-lime px-4 py-2 text-sm font-bold text-on-lime"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Mulai sesi baru
        </button>
      </div>
    </div>
  );
}


