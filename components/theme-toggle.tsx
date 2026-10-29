"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isThemeChoice,
  type ThemeChoice,
} from "@/lib/theme";

const THEMES: { id: ThemeChoice; label: string; Icon: LucideIcon }[] = [
  { id: "system", label: "Ikuti sistem", Icon: Monitor },
  { id: "light", label: "Terang", Icon: Sun },
  { id: "dark", label: "Gelap", Icon: Moon },
];

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    document.documentElement.setAttribute(
      "data-theme",
      isThemeChoice(event.newValue) ? event.newValue : DEFAULT_THEME,
    );
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readTheme(): ThemeChoice {
  const value = document.documentElement.getAttribute("data-theme");
  return isThemeChoice(value) ? value : DEFAULT_THEME;
}

/**
 * Pemilih tema untuk halaman akun. Membaca `data-theme` pada <html> (diisi
 * skrip awal di layout) agar server dan render klien pertama identik.
 * Preferensi hanya disimpan di localStorage.
 */
export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);

  const apply = (next: ThemeChoice) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Penyimpanan ditolak (mis. mode privat); tema tetap berlaku sesi ini.
    }
    emit();
  };

  return (
    <div
      role="group"
      aria-label="Pilihan tema tampilan"
      className="flex flex-wrap gap-2"
    >
      {THEMES.map(({ id, label, Icon }) => {
        const active = choice === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => apply(id)}
            aria-pressed={active}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 border-2 px-3 py-2 text-sm font-bold transition-colors sm:flex-none ${
              active
                ? "border-ink bg-lime text-on-lime"
                : "border-line-strong bg-surface text-ink hover:border-ink"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
