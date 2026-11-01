import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultView } from "@/components/periksa/result-view";
import { analyzeText } from "@/lib/analysis";

const LINK_ONLY = "Buka tautan ini untuk konfirmasi: http://bit.ly/konfirmasi-akun";
const OTP_ONLY = "kirim kode OTP Anda sekarang";
const MONEY_ONLY = "kirim uang sekarang untuk biaya admin";
const NEUTRAL = "besok kita makan siang di kantin kampus";
const LINK_AND_MONEY =
  "Ini biaya admin, transfer sekarang ke http://bit.ly/bayar sebelum akun ditutup";
const LINK_AND_OTP = "Kirim kode OTP Anda sekarang lewat http://bit.ly/verifikasi-otp";
const OTP_AND_MONEY =
  "Kirim kode OTP Anda sekarang, lalu transfer biaya admin 150 ribu hari ini";
const LINK_OTP_AND_MONEY =
  "Kirim kode OTP Anda lewat http://bit.ly/verifikasi, lalu transfer biaya admin sekarang";

const PRIORITY_NOTE = /Beberapa sinyal terdeteksi sekaligus/;

function guideLinks(): HTMLElement[] {
  return screen
    .getAllByRole("link")
    .filter((link) =>
      (link.getAttribute("href") ?? "").startsWith("/langkah?"),
    );
}

function guideHrefs(): string[] {
  return guideLinks().map((link) => link.getAttribute("href") ?? "");
}

function guideLabels(): string[] {
  return guideLinks().map((link) => link.textContent?.trim() ?? "");
}

describe("ResultView", () => {
  it("menawarkan pilihan sudah transfer tanpa menganggap korban", () => {
    render(<ResultView result={analyzeText(MONEY_ONLY)} />);

    expect(
      screen.getByRole("link", { name: "Saya baru menerima pesan" }),
    ).toHaveAttribute("href", "/langkah?kondisi=received-message");
    expect(screen.getByRole("link", { name: "Saya sudah transfer" })).toHaveAttribute(
      "href",
      "/langkah?kondisi=transferred-money",
    );
    expect(
      screen.queryByRole("link", { name: "Saya sudah membuka tautan" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(PRIORITY_NOTE)).not.toBeInTheDocument();
  });

  it("menawarkan pilihan sudah membuka tautan", () => {
    render(<ResultView result={analyzeText(LINK_ONLY)} />);

    expect(
      screen.getByRole("link", { name: "Saya baru menerima pesan" }),
    ).toHaveAttribute("href", "/langkah?kondisi=received-message");
    expect(
      screen.getByRole("link", { name: "Saya sudah membuka tautan" }),
    ).toHaveAttribute("href", "/langkah?kondisi=clicked-link");
    expect(screen.queryByRole("link", { name: "Saya sudah transfer" })).not.toBeInTheDocument();
    expect(screen.queryByText(PRIORITY_NOTE)).not.toBeInTheDocument();
  });

  it("menawarkan pilihan sudah memasukkan data untuk permintaan kredensial", () => {
    render(<ResultView result={analyzeText(OTP_ONLY)} />);

    expect(
      screen.getByRole("link", { name: "Saya baru menerima pesan" }),
    ).toHaveAttribute("href", "/langkah?kondisi=received-message");
    expect(
      screen.getByRole("link", { name: "Saya sudah memasukkan data" }),
    ).toHaveAttribute("href", "/langkah?kondisi=entered-credentials");
    expect(screen.queryByText(PRIORITY_NOTE)).not.toBeInTheDocument();
  });

  it("hanya menawarkan kondisi awal untuk pesan netral", () => {
    render(<ResultView result={analyzeText(NEUTRAL)} />);

    expect(guideLabels()).toEqual(["Saya baru menerima pesan"]);
    expect(guideHrefs()).toEqual(["/langkah?kondisi=received-message"]);
    expect(screen.queryByText(PRIORITY_NOTE)).not.toBeInTheDocument();
  });

  it("menampilkan bantuan prioritas untuk URL dan permintaan transfer", () => {
    render(<ResultView result={analyzeText(LINK_AND_MONEY)} />);

    expect(screen.getByText(PRIORITY_NOTE)).toBeInTheDocument();
    expect(guideLabels()).toEqual([
      "Saya baru menerima pesan",
      "Saya sudah transfer",
      "Saya sudah membuka tautan",
    ]);
  });

  it("menempatkan kredensial sebelum tautan untuk URL dan OTP", () => {
    render(<ResultView result={analyzeText(LINK_AND_OTP)} />);

    expect(screen.getByText(PRIORITY_NOTE)).toBeInTheDocument();
    expect(guideLabels()).toEqual([
      "Saya baru menerima pesan",
      "Saya sudah memasukkan data",
      "Saya sudah membuka tautan",
    ]);
  });

  it("menempatkan transfer sebelum kredensial untuk OTP dan transfer", () => {
    render(<ResultView result={analyzeText(OTP_AND_MONEY)} />);

    expect(screen.getByText(PRIORITY_NOTE)).toBeInTheDocument();
    expect(guideLabels()).toEqual([
      "Saya baru menerima pesan",
      "Saya sudah transfer",
      "Saya sudah memasukkan data",
    ]);
  });

  it("menampilkan semua pilihan berurutan prioritas untuk URL, OTP, dan transfer", () => {
    render(<ResultView result={analyzeText(LINK_OTP_AND_MONEY)} />);

    expect(screen.getByText(PRIORITY_NOTE)).toBeInTheDocument();
    expect(guideHrefs()).toEqual([
      "/langkah?kondisi=received-message",
      "/langkah?kondisi=transferred-money",
      "/langkah?kondisi=entered-credentials",
      "/langkah?kondisi=clicked-link",
    ]);
  });

  it("tidak menghasilkan tautan panduan yang duplikat", () => {
    for (const message of [
      LINK_ONLY,
      OTP_ONLY,
      MONEY_ONLY,
      LINK_AND_MONEY,
      LINK_AND_OTP,
      OTP_AND_MONEY,
      LINK_OTP_AND_MONEY,
    ]) {
      const { unmount } = render(<ResultView result={analyzeText(message)} />);
      const hrefs = guideHrefs();
      expect(hrefs.length).toBeGreaterThan(0);
      expect(new Set(hrefs).size).toBe(hrefs.length);
      unmount();
    }
  });
});
