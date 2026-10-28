import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhoneCheck } from "@/components/periksa/phone-check";
import { LinkCheck } from "@/components/periksa/link-check";

afterEach(() => vi.unstubAllGlobals());

describe("PhoneCheck", () => {
  it("produces an in-site assessment instead of an external redirect", async () => {
    const user = userEvent.setup();
    render(<PhoneCheck />);

    await user.type(screen.getByLabelText("Nomor telepon pengirim"), "+62 812-3456-7890");
    await user.click(screen.getByLabelText(/Meminta uang atau pinjaman/));
    await user.click(screen.getByRole("button", { name: "Nilai nomor ini" }));

    expect(await screen.findByText("Nomor ternormalisasi")).toBeInTheDocument();
    expect(screen.getByText("081234567890")).toBeInTheDocument();
    expect(screen.getByText("+6281234567890")).toBeInTheDocument();
    expect(
      screen.getByText(/Penilaian berdasarkan perilaku yang Anda laporkan/),
    ).toBeInTheDocument();
    expect(screen.getByText("Langkah berikutnya")).toBeInTheDocument();
    expect(
      screen.getByText(/Saring tidak memiliki data laporan atas nomor ini/),
    ).toBeInTheDocument();
  });

  it("validates the number before assessing", async () => {
    const user = userEvent.setup();
    render(<PhoneCheck />);

    await user.type(screen.getByLabelText("Nomor telepon pengirim"), "12345");
    await user.click(screen.getByRole("button", { name: "Nilai nomor ini" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Nomor ternormalisasi")).not.toBeInTheDocument();
  });

  it("requires at least one reported behaviour", async () => {
    const user = userEvent.setup();
    render(<PhoneCheck />);

    await user.type(screen.getByLabelText("Nomor telepon pengirim"), "081234567890");
    await user.click(screen.getByRole("button", { name: "Nilai nomor ini" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Pilih minimal satu/);
  });
});

describe("LinkCheck", () => {
  it("renders local indicators and survives a provider failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const user = userEvent.setup();
    render(<LinkCheck />);

    await user.type(
      screen.getByLabelText("Tautan yang dikirim pengirim"),
      "https://bit.ly/contoh-login",
    );
    await user.click(screen.getByLabelText(/Kirim URL ini ke PhishTank/));
    await user.click(screen.getByRole("button", { name: "Periksa tautan" }));

    // Local analysis must still be present.
    expect(await screen.findByText("Struktur tautan yang dikenali")).toBeInTheDocument();
    expect(screen.getByText(/Tautan pendek \(shortened URL\)/)).toBeInTheDocument();
    expect(screen.getAllByText("bit.ly").length).toBeGreaterThan(0);

    // External failure is shown without erasing local findings.
    expect(screen.getByText(/Permintaan gagal/)).toBeInTheDocument();
    expect(screen.getByText("Reputasi eksternal · PhishTank")).toBeInTheDocument();
  });

  it("does not call the provider without consent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LinkCheck />);

    await user.type(
      screen.getByLabelText("Tautan yang dikirim pengirim"),
      "https://example.test/login",
    );
    await user.click(screen.getByRole("button", { name: "Periksa tautan" }));

    expect(await screen.findByText("Struktur tautan yang dikenali")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Persetujuan belum diberikan/),
    ).toBeInTheDocument();
  });
});