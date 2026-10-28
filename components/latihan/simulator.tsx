"use client";

import { useState } from "react";
import { ArrowRight, CircleCheck, CircleAlert, RotateCcw } from "lucide-react";
import { SCENARIOS } from "@/data/scenarios";
import type { ScenarioOption, TrainingScenario } from "@/data/scenarios";

interface AnswerRecord {
  scenario: TrainingScenario;
  option: ScenarioOption;
}

export function Simulator() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);

  const scenario = SCENARIOS[index];
  const chosen = selected
    ? (scenario.options.find((option) => option.id === selected) ?? null)
    : null;

  const choose = (option: ScenarioOption) => {
    if (selected) return;
    setSelected(option.id);
  };

  const next = () => {
    const option = chosen;
    if (!option) return;
    setAnswers((current) => [...current, { scenario, option }]);
    setSelected(null);
    if (index + 1 >= SCENARIOS.length) {
      setFinished(true);
    } else {
      setIndex((current) => current + 1);
    }
  };

  const restart = () => {
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  };

  const renderSummary = () => {
    const safest = answers.filter((answer) => answer.option.isSafest).length;
    return (
      <div className="border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-ink">Ringkasan latihan</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Kamu memilih langkah paling aman pada {safest} dari {answers.length}{" "}
            skenario.
          </p>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <ul className="grid gap-3">
            {answers.map((answer) => (
              <li
                key={answer.scenario.id}
                className="border border-line bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  {answer.option.isSafest ? (
                    <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-safe" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-coral" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {answer.scenario.title}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      Pilihanmu: {answer.option.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-soft">
                      {answer.option.isSafest
                        ? "Langkah ini tepat."
                        : "Ada cara yang lebih aman untuk situasi ini."}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 bg-paper px-4 py-3 text-xs leading-5 text-ink-muted">
            Skor ini hanya menggambarkan latihan ini dan bukan ukuran kemampuan
            keamanan digitalmu di dunia nyata, ataupun jaminan keamanan di masa
            depan.
          </p>
          <button
            type="button"
            onClick={restart}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Ulangi latihan
          </button>
        </div>
      </div>
    );
  };

  if (finished) return renderSummary();

  return (
    <div className="border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{scenario.title}</h2>
          <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper">
            {index + 1} / {SCENARIOS.length}
          </span>
        </div>
        <span className="mt-2 inline-block rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-ink-soft">
          {scenario.category}
        </span>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-1 rounded-full bg-warn transition-all"
            style={{ width: `${((index + 1) / SCENARIOS.length) * 100}%` }}
          />
        </div>

        <p className="mt-4 text-sm leading-6 text-ink-muted">{scenario.setup}</p>

        <div className="mt-3 border border-line bg-paper px-4 py-3">
          <p className="text-sm leading-6 text-ink">{scenario.message}</p>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-ink">
            Apa yang akan kamu lakukan?
          </legend>
          <div className="mt-2 grid gap-2">
            {scenario.options.map((option) => {
              const isChosen = option.id === selected;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => choose(option)}
                  disabled={selected !== null}
                  className={`border px-4 py-3 text-left text-sm leading-6 transition-colors disabled:cursor-default ${
                    isChosen
                      ? "border-ink bg-ink text-paper"
                      : "border-line bg-surface text-ink hover:border-ink-soft"
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
            className={`mt-4 border p-4 ${
              chosen.isSafest
                ? "border-safe/30 bg-safe-soft"
                : "border-coral/30 bg-coral-soft"
            }`}
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              {chosen.isSafest ? (
                <CircleCheck className="h-5 w-5 text-safe" aria-hidden="true" />
              ) : (
                <CircleAlert className="h-5 w-5 text-coral" aria-hidden="true" />
              )}
              {chosen.isSafest ? "Pilihan yang tepat" : "Perlu diwaspadai"}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {chosen.feedback}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink">
              <span className="font-semibold">Saran tindakan:</span>{" "}
              {chosen.recommendedAction}
            </p>
            <button
              type="button"
              onClick={next}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft"
            >
              {index + 1 >= SCENARIOS.length
                ? "Lihat ringkasan"
                : "Skenario berikutnya"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}