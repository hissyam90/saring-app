"use client";

import { useState } from "react";
import { Eraser, Phone, ScanSearch } from "lucide-react";
import {
  assessPhoneBehavior,
  normalizePhone,
  PHONE_BEHAVIORS,
} from "@/lib/analysis";
import type { PhoneBehaviorId } from "@/lib/analysis";
import { ADUANNOMOR } from "@/data/sources";
import { PhoneResult } from "./phone-result";

interface Submitted {
  national: string;
  e164: string;
  behaviorIds: PhoneBehaviorId[];
}

export function PhoneCheck() {
  const [input, setInput] = useState("");
  const [behaviorIds, setBehaviorIds] = useState<PhoneBehaviorId[]>([]);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggle = (id: PhoneBehaviorId) => {
    setBehaviorIds((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (id === "normal") return ["normal"];
      return [...current.filter((x) => x !== "normal"), id];
    });
  };

  const handleCheck = () => {
    const normalized = normalizePhone(input);
    if (!normalized.isValid) {
      setError(normalized.errors.join(" "));
      setSubmitted(null);
      return;
    }
    if (behaviorIds.length === 0) {
      setError("Pilih minimal satu hal yang dilakukan pengirim.");
      setSubmitted(null);
      return;
    }
    setError(null);
    setSubmitted({
      national: normalized.national,
      e164: normalized.e164,
      behaviorIds,
    });
  };

  const handleClear = () => {
    setInput("");
    setBehaviorIds([]);
    setSubmitted(null);
    setError(null);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!submitted) return;
    try {
      await navigator.clipboard.writeText(submitted.national);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const assessment = submitted ? assessPhoneBehavior(submitted.behaviorIds) : null;

  return (
    <div className="border-2 border-ink bg-surface shadow-neo-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5" aria-hidden="true" />
          <h2 className="text-base font-bold">Periksa nomor telepon</h2>
        </div>
        <span className="border-2 border-ink bg-lime px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
          Penilaian perilaku · bukan reputasi
        </span>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <div className="border-2 border-ink bg-lime-soft px-3 py-2.5">
          <p className="text-xs leading-5 text-ink">
            Saring <strong>tidak</strong> memiliki database reputasi nomor.
            Penilaian di bawah disusun dari perilaku pengirim yang Anda pilih,
            bukan dari pencarian data laporan.
          </p>
        </div>

        <label
          htmlFor="phone-input"
          className="mt-4 block text-sm font-semibold text-ink"
        >
          Nomor telepon pengirim
        </label>
        <input
          id="phone-input"
          type="tel"
          inputMode="tel"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="0812-3456-7890 / 6281234567890 / +62 812 3456 7890"
          className="mt-2 w-full border-2 border-ink bg-paper px-3 py-3 font-mono text-base text-ink placeholder:text-ink-muted/60"
        />
        <p className="mt-1.5 text-xs text-ink-muted">
          Spasi, tanda hubung, dan kurung diabaikan. Nomor dinormalisasi di
          peramban Anda dan tidak dikirim ke server.
        </p>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-ink">
            Apa yang dilakukan atau diminta pengirim?
          </legend>
          <p className="mt-0.5 text-xs text-ink-muted">
            Pilih semua yang sesuai. pilihan inilah yang menentukan penilaian.
          </p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {PHONE_BEHAVIORS.map((behavior) => {
              const checked = behaviorIds.includes(behavior.id);
              return (
                <label
                  key={behavior.id}
                  className={`flex min-h-11 cursor-pointer items-start gap-2.5 border-2 px-3 py-2.5 text-sm transition-none ${
                    checked
                      ? "border-ink bg-lime-soft"
                      : "border-line bg-surface hover:border-ink"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(behavior.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug text-ink">
                      {behavior.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-4 text-ink-muted">
                      {behavior.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error ? (
          <p
            className="mt-3 border-2 border-coral bg-coral-soft px-3 py-2 text-sm font-semibold text-ink"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCheck}
            className="inline-flex h-11 items-center justify-center gap-2 border-2 border-ink bg-lime px-5 text-sm font-bold text-ink shadow-neo transition-none hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            Nilai nomor ini
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

        {submitted && assessment ? (
          <PhoneResult
            national={submitted.national}
            e164={submitted.e164}
            assessment={assessment}
            copied={copied}
            onCopy={handleCopy}
            officialSource={ADUANNOMOR}
          />
        ) : null}
      </div>
    </div>
  );
}