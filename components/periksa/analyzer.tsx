"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Loader2, Lock, RefreshCw, ScanSearch } from "lucide-react";
import { analyzeText, MAX_INPUT_LENGTH } from "@/lib/analysis";
import type { AnalysisResult } from "@/lib/analysis";
import { EXAMPLES } from "@/data/examples";
import type { AnalysisExample } from "@/data/examples";
import { ResultView } from "./result-view";

type Status = "idle" | "analyzing" | "done";

export function Analyzer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const schedule = (value: string) => {
    const next = analyzeText(value);
    if (!next.isValid) {
      setResult(null);
      setError(next.errors.join(" "));
      setStatus("idle");
      return;
    }
    setError(null);
    setStatus("analyzing");
    setResult(null);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setResult(next);
      setStatus("done");
      setAnnouncement(next.classificationLabel);
    }, 250);
  };

  const handleAnalyze = () => schedule(text);

  const handleClear = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    setText("");
    setResult(null);
    setStatus("idle");
    setError(null);
    setAnnouncement("");
  };

  const applyExample = (example: AnalysisExample, autoAnalyze: boolean) => {
    setText(example.text);
    if (autoAnalyze) {
      schedule(example.text);
    } else {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      setResult(null);
      setStatus("idle");
      setError(null);
    }
  };

  const handleRandomExample = () => {
    const current = EXAMPLES.find((example) => example.text === text);
    const pool = EXAMPLES.filter((example) => example.id !== current?.id);
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (next) applyExample(next, true);
  };

  return (
    <div className="border-2 border-ink bg-surface shadow-neo-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-base font-bold">Periksa pesan</h2>
          <p className="text-xs text-ink-muted">
            Tempel pesan, lihat sinyal yang terdeteksi beserta alasannya.
          </p>
        </div>
        <span className="border-2 border-ink bg-lime px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
          Lokal · tanpa kirim data
        </span>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <div className="border-2 border-ink bg-lime-soft px-3 py-2.5">
          <p className="flex items-start gap-2 text-xs leading-5 text-ink">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Pemeriksaan berjalan sepenuhnya di peramban Anda. Pesan tidak
              dikirim ke server dan tidak disimpan. Jangan menempelkan kata
              sandi, OTP, PIN, atau data pribadi yang sebenarnya.
            </span>
          </p>
        </div>

        <label
          htmlFor="message-input"
          className="mt-4 block text-sm font-semibold text-ink"
        >
          Pesan yang ingin diperiksa
        </label>
        <textarea
          id="message-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={MAX_INPUT_LENGTH}
          aria-describedby="message-help char-count"
          aria-invalid={Boolean(error)}
          rows={6}
          placeholder="Tempelkan isi pesan di sini…"
          className="mt-2 w-full resize-y border-2 border-ink bg-paper px-3 py-3 text-sm leading-6 text-ink placeholder:text-ink-muted/60"
        />
        <div id="message-help" className="sr-only">
          Maksimal {MAX_INPUT_LENGTH} karakter. Pesan diproses lokal dan tidak dikirim.
        </div>
        <div id="char-count" className="mt-1 text-right font-mono text-xs text-ink-muted">
          {text.length} / {MAX_INPUT_LENGTH} karakter
        </div>

        {error ? (
          <p className="mt-2 border-2 border-coral bg-coral-soft px-3 py-2 text-sm font-semibold text-coral" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={status === "analyzing"}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-ink bg-lime px-5 text-sm font-bold text-ink shadow-neo transition-none hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
          >
            {status === "analyzing" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
            )}
            {status === "analyzing" ? "Memeriksa…" : "Periksa pesan"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-ink bg-surface px-4 text-sm font-semibold text-ink hover:bg-line"
          >
            <Eraser className="h-4 w-4" aria-hidden="true" />
            Bersihkan
          </button>
          <button
            type="button"
            onClick={handleRandomExample}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-ink bg-surface px-4 text-sm font-semibold text-ink hover:bg-line"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Coba contoh lain
          </button>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            Muat contoh fiktif
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                title={example.note}
                onClick={() => applyExample(example, false)}
                className="min-h-11 border-2 border-ink bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-neo-sm transition-none hover:bg-lime active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-5">
        {status === "analyzing" ? (
          <div className="flex items-center gap-2 border-2 border-ink bg-paper px-4 py-6 text-sm text-ink-muted" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Menganalisis pola di dalam pesan…
          </div>
        ) : null}

        {status === "done" && result ? <ResultView result={result} /> : null}

        {status === "idle" ? (
          <div className="border-2 border-dashed border-ink/40 bg-paper px-4 py-5">
            <h3 className="text-sm font-bold text-ink">
              Hasil akan muncul di sini
            </h3>
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              Saring menyusun hasil menjadi tiga bagian: sinyal yang ditemukan
              beserta kutipan buktinya, langkah yang bisa langsung Anda lakukan,
              dan hal yang belum dapat dipastikan.
            </p>
          </div>
        ) : null}
      </div>

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}