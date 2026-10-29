/**
 * Preferensi tema Saring.
 *
 * Modul ini **tanpa** `"use client"` dan tanpa dependensi React karena dipakai
 * dari dua tempat:
 *   - `app/layout.tsx` (server component) menyisipkan `THEME_INIT_SCRIPT` agar
 *     tema sudah benar sebelum halaman digambar,
 *   - `components/theme-toggle.tsx` (client component) membaca/menulis pilihan.
 *
 * Tiga nilai yang sah: `system`, `light`, `dark`. Nilai `system` tidak diubah
 * menjadi terang/gelap oleh JavaScript: CSS yang memutuskan lewat
 * `prefers-color-scheme`, sehingga perubahan preferensi sistem langsung
 * berlaku tanpa reload dan tanpa listener tambahan.
 */

export const THEME_STORAGE_KEY = "saring.theme";

export type ThemeChoice = "system" | "light" | "dark";

export const DEFAULT_THEME: ThemeChoice = "system";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Skrip sebaris yang dijalankan sebelum React melakukan hydration.
 *
 * - Hanya menulis atribut `data-theme` pada `<html>`; tidak menyentuh React
 *   state, sehingga tidak mungkin terjadi hydration mismatch.
 * - Nilai tak dikenal atau localStorage yang diblokir jatuh ke `system`.
 * - Nilai valid disimpan kembali agar atribut halaman baru selalu terisi.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var v=window.localStorage.getItem(k);if(v!=="light"&&v!=="dark"){v="system";}document.documentElement.setAttribute("data-theme",v);}catch(e){document.documentElement.setAttribute("data-theme","system");}})();`;
