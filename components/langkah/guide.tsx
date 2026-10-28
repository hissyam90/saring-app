"use client";

import { useState } from "react";
import {
  Banknote,
  ExternalLink,
  IdCard,
  Inbox,
  Key,
  MousePointerClick,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SAFETY_GUIDES } from "@/data/guides";
import type { StepPriority } from "@/data/guides";

const ICONS: Record<string, LucideIcon> = {
  "received-message": Inbox,
  "clicked-link": MousePointerClick,
  "entered-credentials": Key,
  "transferred-money": Banknote,
  "account-takeover": UserX,
  "shared-documents": IdCard,
};

const PRIORITY_META: Record<StepPriority, { label: string; className: string }> = {
  segera: { label: "Segera", className: "bg-coral-soft text-coral" },
  penting: { label: "Penting", className: "bg-warn-soft text-warn" },
  lanjutan: { label: "Lanjutan", className: "bg-line text-ink-muted" },
};

export function Guide() {
  const [selectedId, setSelectedId] = useState(SAFETY_GUIDES[0].id);
  const guide =
    SAFETY_GUIDES.find((item) => item.id === selectedId) ?? SAFETY_GUIDES[0];
  const Icon = ICONS[guide.id] ?? Inbox;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div>
        <h2 className="text-lg font-semibold text-ink">Pilih situasi Anda</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {SAFETY_GUIDES.map((item) => {
            const ItemIcon = ICONS[item.id] ?? Inbox;
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors lg:shrink ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-surface text-ink-soft hover:border-ink-soft"
                }`}
              >
                <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.situation}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-paper">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">{guide.situation}</h2>
              <p className="mt-1 text-sm text-ink-muted">{guide.summary}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6">
          <ol className="grid gap-3">
            {guide.steps.map((step, index) => {
              const meta = PRIORITY_META[step.priority];
              return (
                <li
                  key={`${guide.id}-${index}`}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-bold text-ink-soft">
                      {index + 1}
                    </span>
                    <div>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                      <p className="mt-1.5 text-sm leading-6 text-ink">{step.text}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 rounded-xl border border-line bg-paper p-4">
            <h3 className="text-sm font-semibold text-ink">Simpan bukti yang perlu</h3>
            <ul className="mt-2 grid gap-1.5">
              {guide.evidenceChecklist.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink-soft">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {guide.resources.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-ink">Sumber resmi yang relevan</h3>
              <ul className="mt-2 grid gap-2">
                {guide.resources.map((resource) => (
                  <li key={resource.url}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm transition-colors hover:border-ink-soft"
                    >
                      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
                      <span>
                        <span className="font-medium text-ink group-hover:underline">
                          {resource.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-muted">
                          {resource.note} (tautan eksternal)
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-4 rounded-lg bg-paper px-4 py-3 text-xs leading-5 text-ink-muted">
            Panduan ini bersifat umum dan tidak menggantikan investigasi resmi,
            bantuan profesional, atau penanganan langsung dari bank, penyedia
            layanan, maupun aparat penegak hukum.
          </p>
        </div>
      </div>
    </div>
  );
}