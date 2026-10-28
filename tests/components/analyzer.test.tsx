import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Analyzer } from "@/components/periksa/analyzer";

describe("Analyzer", () => {
  it("shows validation for empty input", async () => {
    const user = userEvent.setup();
    render(<Analyzer />);

    await user.click(screen.getByRole("button", { name: /Periksa pesan/ }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Masukkan pesan/);
  });

  it("produces a result without writing to browser storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const user = userEvent.setup();
    render(<Analyzer />);

    await user.type(
      screen.getByLabelText(/Pesan yang ingin diperiksa/),
      "kirim kode OTP Anda sekarang untuk verifikasi",
    );
    await user.click(screen.getByRole("button", { name: /Periksa pesan/ }));

    expect(await screen.findByText(/Permintaan kode rahasia/)).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});