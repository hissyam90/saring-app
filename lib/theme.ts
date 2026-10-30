/**
 * Preferensi tema Saring.
 *
 * Modul ini **tanpa** `"use client"` dan tanpa dependensi React karena dipakai
 * dari dua tempat:
 *   - `app/layout.tsx` (server component) menyisipkan `THEME_INIT_SCRIPT` agar
 *     tema sudah benar sebelum halaman digambar,
 *   - `components/theme-toggle.tsx` (client component) membaca/menulis pilihan.
 *
 * Tiga nilai yang sah: `light`, `dark`, `system`. Default untuk pengunjung baru
 * adalah `light` agar tampilan pertama selalu terang, terlepas dari pengaturan
 * sistem operasi. Nilai `system` hanya berlaku bila pengguna memilihnya sendiri
 * (atau sudah memilihnya sebelum default berubah): CSS lalu mengikuti
 * `prefers-color-scheme` lewat selektor `:root[data-theme="system"]`.
 */

export const THEME_STORAGE_KEY = "saring.theme";

export type ThemeChoice = "system" | "light" | "dark";

export const DEFAULT_THEME: ThemeChoice = "light";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Skrip sebaris yang dijalankan sebelum React melakukan hydration.
 *
 * - Hanya menulis atribut `data-theme` pada `<html>`; tidak menyentuh React
 *   state, sehingga tidak mungkin terjadi hydration mismatch.
 * - Tanpa preferensi tersimpan, nilai tak dikenal, atau localStorage yang
 *   diblokir, atribut diisi `light` sehingga pengunjung baru tidak pernah
 *   melihat dark mode walau sistemnya gelap.
 * - Pilihan tersimpan (`light`, `dark`, `system`) tidak ditimpa, sehingga
 *   preferensi pengguna lama tetap berlaku.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var v=window.localStorage.getItem(k);if(v!=="light"&&v!=="dark"&&v!=="system"){v="light";}document.documentElement.setAttribute("data-theme",v);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
