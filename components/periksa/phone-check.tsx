"use client";

import { useState } from "react";
import { Eraser, Loader2, Lock, Phone } from "lucide-react";
import { checkPhoneNoProvider, checkPhoneWithProvider } from "@/lib/analysis";
import type {
  PhoneCheckResult,
  PhoneReputationProvider,
} from "@/lib/analysis";
import { ADUANNOMOR } from "@/data/sources";
import { PhoneResult } from "./phone-result";

type Status = "idle" | "checking" | "done";

export function PhoneCheck({
  provider,
}: {
  provider?: PhoneReputationProvider;
}) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<PhoneCheckResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [copied, setCopied] = useState(false);

  const normalized =
    result && result.status !== "invalid" ? result.national : "";

  const handleCheck = async () => {
    setStatus("checking");
    const next = provider
      ? await checkPhoneWithProvider(input, provider)
      : checkPhoneNoProvider(input);
    setResult(next);
    setStatus("done");
  };

  const handleClear = () => {
    setInput("");
    setResult(null);
    setStatus("idle");
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!normalized) return;
    try {
      await navigator.clipboard.writeText(normalized);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard tidak tersedia; abaikan */
    }
  };

  return (
    <div className="border-2 border-ink bg-surface shadow-neo-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5" aria-hidden="true" />
          <h2 className="text-base font-bold">Periksa nomor telepon</h2>
        </div>
        <span className="border-2 border-ink bg-lime px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
          Tanpa API · sumber resmi
        </span>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <div className="border-2 border-ink bg-lime-soft px-3 py-2.5">
          <p className="flex items-start gap-2 text-xs leading-5 text-ink">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Nomor dinormalisasi di peramban Anda dan tidak dikirim ke server.
              Reputasi nomor diserahkan ke layanan resmi yang Anda buka sendiri.
            </span>
          </p>
        </div>

        {provider ? (
          <p className="mt-3 text-xs leading-5 text-coral" role="note">
            Mode penyedia aktif: nomor akan dikirim ke &ldquo;{provider.name}&rdquo;
            untuk pemeriksaan reputasi.
          </p>
        ) : null}

        <label
          htmlFor="phone-input"
          className="mt-4 block text-sm font-semibold text-ink"
        >
          Nomor telepon
        </label>
        <input
          id="phone-input"
          type="tel"
          inputMode="tel"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="mis. 0812-3456-7890, 6281234567890, atau +62 812-3456-7890"
          className="mt-2 w-full border-2 border-ink bg-paper px-3 py-3 font-mono text-base text-ink placeholder:text-ink-muted/60"
        />
        <p className="mt-1.5 text-xs text-ink-muted">
          Didukung: 08xx…, 62 8xx…, dan +62 8xx…. Spasi, tanda hubung, dan kurung
          diabaikan.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={status === "checking"}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-ink bg-lime px-5 text-sm font-bold text-ink shadow-neo transition-none hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
          >
            {status === "checking" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Phone className="h-4 w-4" aria-hidden="true" />
            )}
            {status === "checking" ? "Memeriksa…" : "Periksa nomor"}
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

        {status === "done" && result ? (
          <PhoneResult result={result} source={ADUANNOMOR} copied={copied} onCopy={handleCopy} />
        ) : null}
      </div>
    </div>
  );
}