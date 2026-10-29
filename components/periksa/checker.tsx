"use client";

import { useState } from "react";
import { Link2, MessageSquareText, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Analyzer } from "./analyzer";
import { PhoneCheck } from "./phone-check";
import { LinkCheck } from "./link-check";

type Mode = "message" | "phone" | "link";

const TABS: { id: Mode; label: string; icon: LucideIcon; hint: string }[] = [
  {
    id: "message",
    label: "Periksa Pesan",
    icon: MessageSquareText,
    hint: "Tempel pesan mencurigakan",
  },
  {
    id: "phone",
    label: "Periksa Nomor",
    icon: Phone,
    hint: "Nilai perilaku pengirim di Saring",
  },
  { id: "link", label: "Periksa Tautan", icon: Link2, hint: "Inspeksi URL tanpa membukanya" },
];

export function Checker() {
  const [mode, setMode] = useState<Mode>("message");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Jenis pemeriksaan"
        className="grid gap-1.5 border-2 border-ink bg-paper p-1.5 sm:grid-cols-3"
      >
        {TABS.map((tab, index) => {
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
              className={`flex min-h-16 items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                active
                  ? "bg-ink text-on-ink"
                  : "bg-surface text-ink hover:bg-lime-soft"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 ${
                  active
                    ? "border-lime bg-lime text-on-lime"
                    : "border-ink bg-paper text-ink"
                }`}
              >
                <tab.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      active ? "text-lime" : "text-ink-muted"
                    }`}
                  >
                    0{index + 1}
                  </span>
                  <span className="block text-sm font-bold leading-tight">
                    {tab.label}
                  </span>
                </span>
                <span
                  className={`mt-0.5 block text-xs leading-4 ${
                    active ? "text-on-ink/70" : "text-ink-muted"
                  }`}
                >
                  {tab.hint}
                </span>
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
        ) : mode === "phone" ? (
          <PhoneCheck />
        ) : (
          <LinkCheck />
        )}
      </div>
    </div>
  );
}