"use client";

import { useState } from "react";
import { Link2, MessageSquareText, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Analyzer } from "./analyzer";
import { PhoneCheck } from "./phone-check";
import { LinkCheck } from "./link-check";

type Mode = "message" | "number" | "link";

const TABS: { id: Mode; label: string; icon: LucideIcon; hint: string }[] = [
  {
    id: "message",
    label: "Periksa Pesan",
    icon: MessageSquareText,
    hint: "Tempel pesan mencurigakan",
  },
  { id: "number", label: "Periksa Nomor", icon: Phone, hint: "Normalisasi & arahkan ke sumber resmi" },
  { id: "link", label: "Periksa Tautan", icon: Link2, hint: "Inspeksi URL tanpa membukanya" },
];

export function Checker() {
  const [mode, setMode] = useState<Mode>("message");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Jenis pemeriksaan"
        className="flex flex-col gap-2 sm:flex-row"
      >
        {TABS.map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`checker-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`checker-panel-${tab.id}`}
              onClick={() => setMode(tab.id)}
              className={`flex items-center gap-3 border-2 px-4 py-3 text-left transition-none ${
                active
                  ? "border-ink bg-lime text-ink shadow-neo"
                  : "border-ink bg-surface text-ink hover:bg-lime-soft"
              }`}
            >
              <tab.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>
                <span className="block text-sm font-bold">{tab.label}</span>
                <span className="block text-xs text-ink-soft">{tab.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`checker-panel-${mode}`}
        className="mt-5"
        role="tabpanel"
        aria-labelledby={`checker-tab-${mode}`}
      >
        {mode === "message" ? (
          <Analyzer />
        ) : mode === "number" ? (
          <PhoneCheck />
        ) : (
          <LinkCheck />
        )}
      </div>
    </div>
  );
}