"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Eraser,
  Loader2,
  Lock,
  RefreshCw,
  ScanSearch,
} from "lucide-react";
import { analyzeText, MAX_INPUT_LENGTH } from "@/lib/analysis";
import type { AnalysisResult } from "@/lib/analysis";
import { EXAMPLES } from "@/data/examples";
import type { AnalysisExample } from "@/data/examples";
import { ResultView } from "./result-view";

type Status = "idle" | "analyzing" | "done";

const RESULT_ANNOUNCEMENT = "Analisis selesai — hasil pemeriksaan tersedia.";

export function Analyzer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const timeoutRef = useRef<number | null>(null);
  // Token untuk membatalkan pemeriksaan yang sudah tidak relevan (race condition).
  const runRef = useRef(0);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const examplesRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  // Arahkan perhatian ke hasil ketika pemeriksaan selesai, tanpa memindahkan
  // fokus keyboard. Hormati prefers-reduced-motion agar tidak beranimasi.
  useEffect(() => {
    if (status !== "done" || !result) return;
    const target = resultRef.current;
    if (!target) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [status, result]);

  const schedule = (value: string) => {
    const run = ++runRef.current;
    const next = analyzeText(value);
    if (!next.isValid) {
      setResult(null);
      setStale(false);
      setError(next.errors.join(" "));
      setStatus("idle");
      setAnnouncement("");
      return;
    }
    setError(null);
    setStale(false);
    setStatus("analyzing");
    setResult(null);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      // Teks sudah berubah saat pemeriksaan berjalan: batalkan hasil lama.
      if (runRef.current !== run) return;
      setResult(next);
      setStatus("done");
      setAnnouncement(RESULT_ANNOUNCEMENT);
    }, 250);
  };

  const handleAnalyze = () => schedule(text);

  const handleTextChange = (value: string) => {
    // Inklusi `stale` membuat tanda kedaluwarsa "lengket": begitu hasil lama
    // ditandai basi, penekanan tombol berikutnya tidak menghidupkan kembali
    // placeholder selagi teks belum diperiksa ulang.
    const hadResult = result !== null || status === "analyzing" || stale;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    runRef.current += 1;
    setText(value);
    setResult(null);
    setStatus("idle");
    setError(null);
    setAnnouncement("");
    // Hasil lama tidak relevan lagi dengan teks yang baru diketik.
    setStale(hadResult && value.trim().length > 0);
  };

  const handleClear = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    runRef.current += 1;
    setText("");
    setResult(null);
    setStatus("idle");
    setError(null);
    setStale(false);
    setAnnouncement("");
  };

  const applyExample = (example: AnalysisExample) => {
    setText(example.text);
    if (examplesRef.current) examplesRef.current.open = false;
    schedule(example.text);
  };

  const handleRandomExample = () => {
    const current = EXAMPLES.find((example) => example.text === text);
    const pool = EXAMPLES.filter((example) => example.id !== current?.id);
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (next) applyExample(next);
  };

  return (
    <div className="border-2 border-ink bg-surface shadow-neo-lg">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-base font-bold">Periksa pesan</h2>
          <p className="text-xs text-ink-muted">
            Tempel pesan, lihat sinyal yang terdeteksi beserta alasannya.
          </p>
        </div>
        <span className="border-2 border-ink bg-lime px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-on-lime">
          Lokal · tanpa kirim data
        </span>
      </div>

      <div className="px-4 py-5 sm:px-5">
        {/* 2. Informasi privasi */}
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

        {/* 3. Textarea */}
        <label
          htmlFor="message-input"
          className="mt-4 block text-sm font-semibold text-ink"
        >
          Pesan yang ingin diperiksa
        </label>
        <textarea
          id="message-input"
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          maxLength={MAX_INPUT_LENGTH}
          aria-describedby="message-help char-count"
          aria-invalid={Boolean(error)}
          rows={6}
          placeholder="Tempelkan isi pesan di sini…"
          className="mt-2 w-full resize-y border-2 border-ink bg-paper px-3 py-3 text-sm leading-6 text-ink placeholder:text-placeholder"
        />
        <div id="message-help" className="sr-only">
          Maksimal {MAX_INPUT_LENGTH} karakter. Pesan diproses lokal dan tidak dikirim.
        </div>

        {/* 4. Penghitung karakter */}
        <div id="char-count" className="mt-1 text-right font-mono text-xs text-ink-muted">
          {text.length} / {MAX_INPUT_LENGTH} karakter
        </div>

        {/* 5. Pesan validasi */}
        {error ? (
          <p
            className="mt-2 border-2 border-coral bg-coral-soft px-3 py-2 text-sm font-semibold text-coral"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {/* 6. Tombol aksi */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={status === "analyzing"}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-ink bg-lime px-5 text-sm font-bold text-on-lime shadow-neo transition-none hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
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
      </div>

      {/* 7–8. Status dan hasil pemeriksaan */}
      <div className="scroll-mt-24 px-4 py-5 sm:px-5" ref={resultRef}>
        {status === "analyzing" ? (
          <div
            className="flex items-center gap-2 border-2 border-ink bg-paper px-4 py-6 text-sm text-ink-muted"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Menganalisis pola di dalam pesan…
          </div>
        ) : null}

        {stale ? (
          <p
            className="border-2 border-amber bg-amber-soft px-4 py-3 text-sm font-semibold text-amber"
            role="status"
          >
            Pesan berubah. Periksa ulang untuk mendapatkan hasil terbaru.
          </p>
        ) : null}

        {status === "done" && result ? <ResultView result={result} /> : null}

        {status === "idle" && !stale ? (
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

      {/* 9. Accordion contoh fiktif */}
      <div className="px-4 pb-5 sm:px-5">
        <details ref={examplesRef} className="group border-2 border-ink bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-bold text-ink">Coba pesan contoh</span>
            <ChevronDown
              className="h-5 w-5 shrink-0 text-ink transition-transform duration-150 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t-2 border-ink px-4 py-4">
            <p className="text-xs leading-5 text-ink-muted">
              {EXAMPLES.length} contoh pesan fiktif untuk mencoba fitur pemeriksaan.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  onClick={() => applyExample(example)}
                  className="flex min-h-11 flex-col items-start justify-center border-2 border-ink bg-paper px-3 py-2 text-left text-ink shadow-neo-sm transition-none hover:bg-lime-soft"
                >
                  <span className="text-sm font-bold leading-tight">
                    {example.label}
                  </span>
                  {example.note ? (
                    <span className="mt-0.5 text-xs leading-4 text-ink-muted">
                      {example.note}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </details>
      </div>

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}