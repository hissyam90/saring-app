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

  // Transisi warna sengaja dibatasi hanya pada `border-color`. Latar/teks
  // antara keadaan aktif dan nonaktif TIDAK boleh dianimasikan: ketika halaman
  // dimuat ulang dalam mode gelap, snapshot server (`light`) dikoreksi React
  // menjadi `dark` setelah hydration. `transition-colors` mengubah koreksi itu
  // menjadi animasi 150 ms yang melintasi perpaduan olive/abu berontras rendah
  // (audit kontras E2E menangkapnya di tengah transisi: "Terang" 1.03:1,
  // "Gelap" 1.64:1). Karena hanya border yang dianimasikan, pembalikan tema
  // menjadi seketika dan hover tetap punya umpan balik lembut.
  return (
    <div
      role="group"
      aria-label="Pilihan tema tampilan"
      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
    >
      {THEMES.map(({ id, label, Icon }) => {
        const active = choice === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => apply(id)}
            aria-pressed={active}
            className={`inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 border-2 px-3 py-2 text-sm font-bold transition-[border-color] ${
              active
                ? "border-ink bg-lime text-on-lime"
                : "border-line-strong bg-surface text-ink hover:border-ink"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
