import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Guide } from "@/components/langkah/guide";
import { SAFETY_GUIDES } from "@/data/guides";

describe("Rencana tindakan", () => {
  it("menampilkan lima bagian rencana untuk setiap kondisi", async () => {
    const user = userEvent.setup();
    render(<Guide />);

    for (const guide of SAFETY_GUIDES) {
      await user.click(screen.getByRole("button", { name: guide.situation }));
      expect(await screen.findByText(guide.summary)).toBeInTheDocument();
      expect(screen.getByText("Lakukan sekarang")).toBeInTheDocument();
      expect(screen.getByText("Setelah itu")).toBeInTheDocument();
      expect(
        screen.getByText("Bukti yang perlu disimpan"),
      ).toBeInTheDocument();
      expect(screen.getByText("Yang perlu diperiksa")).toBeInTheDocument();
      expect(screen.getByText("Sumber bantuan resmi")).toBeInTheDocument();
    }
  });

  it("menampilkan langkah spesifik untuk kredensial yang bocor", async () => {
    const user = userEvent.setup();
    render(<Guide />);

    await user.click(
      screen.getByRole("button", { name: /memasukkan kata sandi atau OTP/ }),
    );
    expect(
      screen.getByText(/ganti kata sandi akun terkait/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cabut atau keluarkan semua sesi/),
    ).toBeInTheDocument();
  });

  it("menampilkan sumber IASC dan Kontak 157 untuk transfer", async () => {
    const user = userEvent.setup();
    render(<Guide />);

    await user.click(
      screen.getByRole("button", { name: /sudah mentransfer uang/ }),
    );

    const iasc = screen.getByRole("link", {
      name: /Indonesia Anti-Scam Centre/,
    });
    expect(iasc).toHaveAttribute("href", "https://iasc.ojk.go.id/");
    expect(iasc).toHaveAttribute("rel", "noopener noreferrer");

    expect(
      screen.getByRole("link", { name: /Kontak 157 OJK/ }),
    ).toBeInTheDocument();
  });

  it("membuka kondisi awal dari tautan hasil pemeriksaan", () => {
    render(<Guide initialSituation="entered-credentials" />);
    expect(screen.getByText(SAFETY_GUIDES[2].summary)).toBeInTheDocument();
  });

  it("mengabaikan kondisi awal yang tidak dikenal", () => {
    render(<Guide initialSituation="tidak-ada" />);
    expect(screen.getByText(SAFETY_GUIDES[0].summary)).toBeInTheDocument();
  });

  it("tidak menjanjikan dana kembali", async () => {
    const user = userEvent.setup();
    render(<Guide />);
    await user.click(
      screen.getByRole("button", { name: /sudah mentransfer uang/ }),
    );
    expect(screen.getByText(/tidak menjamin dana kembali/)).toBeInTheDocument();
  });
});