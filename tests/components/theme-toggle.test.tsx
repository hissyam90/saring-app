import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Kontrak warna kontrol tema (segmented control "Ikuti sistem" / "Terang" /
 * "Gelap" pada halaman akun).
 *
 * Ini adalah penjaga regresi untuk kegagalan audit kontras E2E di mode gelap:
 * setelah hydration, snapshot server (`light`) dikoreksi menjadi `dark`,
 * sehingga tombol yang tadinya aktif berubah nonaktif (dan sebaliknya).
 * `transition-colors` membuat perubahan itu terlihat sebagai animasi 150 ms
 * yang melintasi warna berontras rendah. Dua kontrak di bawah memastikan:
 *   1. token final yang benar (`bg-lime text-on-lime` untuk aktif,
 *      `bg-surface text-ink` untuk nonaktif) tetap dipakai, dan
 *   2. transisi latar/teks tidak boleh dihidupkan kembali lewat
 *      `transition-colors` (hanya `border-color` yang dianimasikan).
 */

function setTheme(value: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", value);
}

beforeEach(() => setTheme("dark"));
afterEach(() => document.documentElement.removeAttribute("data-theme"));

describe("ThemeToggle — kontras kontrol tema", () => {
  it("di dark mode, kontrol aktif (Gelap) memakai lime/on-lime dan nonaktif (Terang) memakai surface/ink", () => {
    render(<ThemeToggle />);

    const gelap = screen.getByRole("button", { name: "Gelap" });
    const terang = screen.getByRole("button", { name: "Terang" });

    expect(gelap).toHaveAttribute("aria-pressed", "true");
    expect(terang).toHaveAttribute("aria-pressed", "false");

    expect(gelap.className).toContain("bg-lime");
    expect(gelap.className).toContain("text-on-lime");
    expect(terang.className).toContain("bg-surface");
    expect(terang.className).toContain("text-ink");
  });

  it("di light mode, kontrol aktif (Terang) tetap memakai lime/on-lime dan nonaktif (Gelap) memakai surface/ink", () => {
    setTheme("light");
    render(<ThemeToggle />);

    const terang = screen.getByRole("button", { name: "Terang" });
    const gelap = screen.getByRole("button", { name: "Gelap" });

    expect(terang).toHaveAttribute("aria-pressed", "true");
    expect(gelap).toHaveAttribute("aria-pressed", "false");

    expect(terang.className).toContain("bg-lime");
    expect(terang.className).toContain("text-on-lime");
    expect(gelap.className).toContain("bg-surface");
    expect(gelap.className).toContain("text-ink");
  });

  it("tidak boleh menganimasikan warna latar/teks (transition-colors) yang memicu kegagalan kontras", () => {
    render(<ThemeToggle />);

    for (const button of screen.getAllByRole("button")) {
      expect(button.className).not.toContain("transition-colors");
      expect(button.className).toContain("transition-[border-color]");
    }
  });
});