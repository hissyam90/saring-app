import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Library } from "@/components/pustaka/library";
import { LIBRARY } from "@/data/resources";

describe("Pustaka: halaman indeks", () => {
  it("menampilkan seluruh artikel sebagai tautan ke halaman detail", () => {
    render(<Library />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(LIBRARY.length);
    for (const article of LIBRARY) {
      const link = links.find(
        (l) => l.getAttribute("href") === `/pustaka/${article.id}`,
      );
      expect(link, article.id).toBeDefined();
    }
  });

  it("tidak membuka isi artikel di tempat", () => {
    render(<Library />);
    const first = LIBRARY[0];
    // Isi bagian artikel tidak boleh tampil sebelum navigasi.
    expect(
      screen.queryByText(first.sections[0].heading),
    ).not.toBeInTheDocument();
  });

  it("menyaring artikel berdasarkan kata kunci", async () => {
    const user = userEvent.setup();
    render(<Library />);

    await user.type(screen.getByLabelText("Cari topik pustaka"), "qris");
    expect(await screen.findByText(/dari 14 artikel/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /QR code dan QRIS/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Lowongan kerja yang meminta/ }),
    ).not.toBeInTheDocument();
  });

  it("menyaring artikel berdasarkan kategori", async () => {
    const user = userEvent.setup();
    render(<Library />);

    await user.click(screen.getByRole("button", { name: "Kredensial" }));
    expect(
      screen.getByRole("link", { name: /OTP, PIN, dan kata sandi/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Investasi dengan untung pasti/ }),
    ).not.toBeInTheDocument();
  });

  it("menampilkan keadaan kosong yang bisa direset", async () => {
    const user = userEvent.setup();
    render(<Library />);

    await user.type(
      screen.getByLabelText("Cari topik pustaka"),
      "katakunciyangtidakada",
    );
    expect(
      await screen.findByText("Tidak ada artikel yang cocok"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset pencarian" }));
    expect(
      screen.getByRole("link", { name: /Nomor baru, minta pinjaman/ }),
    ).toBeInTheDocument();
  });

  it("menampilkan estimasi waktu baca pada setiap kartu", () => {
    render(<Library />);
    const labels = screen.getAllByText(/menit$/);
    expect(labels.length).toBeGreaterThanOrEqual(LIBRARY.length);
  });
});