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

/**
 * Kontrol tema: Ikuti sistem / Terang / Gelap.
 *
 * Preferensi disimpan **hanya di localStorage** peramban. Tidak dikirim ke
 * server dan tidak ditulis ke PostgreSQL, sehingga tidak ada data pribadi baru
 * yang perlu disimpan dan tidak ada permintaan jaringan tambahan.
 *
 * Penerapan nilai awal dilakukan oleh skrip sebaris di `app/layout.tsx` sebelum
 * halaman digambar, sehingga tidak ada kilatan tema yang salah. Komponen ini
 * hanya menampilkan status dan mengubah nilai saat pengguna memilih.
 *
 * Status dibaca lewat `useSyncExternalStore` dari atribut `data-theme` pada
 * <html> — satu-satunya sumber kebenaran, yang sudah diisi skrip awal.
 * `getServerSnapshot` mengembalikan `system`, sehingga HTML server dan render
 * klien pertama identik (tidak ada hydration mismatch); React lalu memperbarui
 * tampilan setelah hydration bila pilihan tersimpan berbeda.
 *
 * Nilai `system` sengaja TIDAK diterjemahkan menjadi terang/gelap di sini: CSS
 * yang memutuskan lewat `prefers-color-scheme`, sehingga perubahan preferensi
 * sistem langsung berlaku tanpa reload.
 */

const THEMES: { id: ThemeChoice; label: string; short: string; Icon: LucideIcon }[] = [
  { id: "system", label: "Ikuti sistem", short: "Sistem", Icon: Monitor },
  { id: "light", label: "Terang", short: "Terang", Icon: Sun },
  { id: "dark", label: "Gelap", short: "Gelap", Icon: Moon },
];

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Sinkronkan antar-tab: pilihan di satu tab langsung berlaku di tab lain
  // tanpa reload.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    const next = isThemeChoice(event.newValue) ? event.newValue : DEFAULT_THEME;
    document.documentElement.setAttribute("data-theme", next);
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

export function ThemeToggle({ variant }: { variant: "desktop" | "mobile" }) {
  // Server dan render klien pertama sama-sama "system" agar markup identik.
  const choice = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);

  const apply = (next: ThemeChoice) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Mode privat dapat menolak penulisan; tema tetap berlaku untuk sesi ini.
    }
    notify();
  };

  const mobile = variant === "mobile";

  return (
    <div className={mobile ? "mt-3" : ""}>
      <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-graphite-ink/70">
        Tema tampilan
      </p>
      <div
        role="group"
        aria-label="Pilihan tema tampilan"
        className="flex border-2 border-white/20"
      >
        {THEMES.map(({ id, label, short, Icon }) => {
          const active = choice === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => apply(id)}
              aria-pressed={active}
              aria-label={label}
              title={label}
              className={`flex flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                mobile ? "min-h-12" : "min-h-11"
              } ${
                active
                  ? "bg-lime text-on-lime"
                  : "text-graphite-ink/75 hover:bg-white/10 hover:text-graphite-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
