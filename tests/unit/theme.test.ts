import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_THEME,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  isThemeChoice,
} from "@/lib/theme";

/**
 * Skrip tema berjalan sebelum hydration dan menentukan tema pada frame pertama.
 * Diuji dengan menjalankan skrip aslinya di jsdom, bukan menyalin logikanya,
 * agar perubahan pada `THEME_INIT_SCRIPT` langsung tertangkap.
 */

const readAppliedTheme = () =>
  document.documentElement.getAttribute("data-theme");

/** Menjalankan skrip inisialisasi persis seperti yang disisipkan layout. */
function runInitScript() {
  new Function(THEME_INIT_SCRIPT)();
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("Default tema", () => {
  it("default adalah light, bukan system", () => {
    expect(DEFAULT_THEME).toBe("light");
  });

  it("hanya menerima tiga nilai tema yang sah", () => {
    expect(isThemeChoice("light")).toBe(true);
    expect(isThemeChoice("dark")).toBe(true);
    expect(isThemeChoice("system")).toBe(true);
    expect(isThemeChoice("purple")).toBe(false);
    expect(isThemeChoice(null)).toBe(false);
    expect(isThemeChoice(undefined)).toBe(false);
  });
});

describe("THEME_INIT_SCRIPT", () => {
  it("localStorage kosong menghasilkan light", () => {
    runInitScript();
    expect(readAppliedTheme()).toBe("light");
  });

  it("preferensi light tersimpan tetap light", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    runInitScript();
    expect(readAppliedTheme()).toBe("light");
  });

  it("preferensi dark tersimpan tetap dark", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    runInitScript();
    expect(readAppliedTheme()).toBe("dark");
  });

  it("preferensi system tersimpan tetap system", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "system");
    runInitScript();
    expect(readAppliedTheme()).toBe("system");
  });

  it("nilai tersimpan yang tidak valid jatuh ke light", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "purple");
    runInitScript();
    expect(readAppliedTheme()).toBe("light");
  });

  it("localStorage yang diblokir tidak membuat halaman gagal dan memakai light", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage diblokir");
    });

    expect(() => runInitScript()).not.toThrow();
    expect(readAppliedTheme()).toBe("light");
  });

  it("atribut tema tidak ditulis ulang oleh skrip lain", () => {
    // Nilai yang sudah terpasang tidak menghalangi skrip memasang tema final.
    document.documentElement.setAttribute("data-theme", "system");
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    runInitScript();
    expect(readAppliedTheme()).toBe("dark");
  });
});
