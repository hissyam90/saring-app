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
      expect(
        await screen.findByText(guide.summary, {}, { timeout: 10_000 }),
      ).toBeInTheDocument();
      expect(screen.getByText("Lakukan sekarang")).toBeInTheDocument();
      expect(screen.getByText("Setelah itu")).toBeInTheDocument();
      expect(
        screen.getByText("Bukti yang perlu disimpan"),
      ).toBeInTheDocument();
      expect(screen.getByText("Yang perlu diperiksa")).toBeInTheDocument();
      expect(screen.getByText("Sumber bantuan resmi")).toBeInTheDocument();
    }
  }, 30_000);

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

  it("menyediakan checklist bukti yang hanya interaktif di halaman", async () => {
    const user = userEvent.setup();
    render(<Guide />);
    const checkbox = screen.getAllByRole("checkbox")[0];
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText(/Jangan unggah NIK, KTP/)).toBeInTheDocument();
  });

  it("menampilkan kanal resmi untuk nomor dan konten", async () => {
    const user = userEvent.setup();
    render(<Guide />);
    const aduanNomor = screen.getByRole("link", { name: /AduanNomor/ });
    expect(aduanNomor).toHaveAttribute("href", "https://aduannomor.id/");
    // Penjelasan layanan harus sama dengan yang dipakai mode Periksa Nomor.
    expect(aduanNomor).toHaveTextContent(/mengadukan nomor seluler/);
    expect(aduanNomor).toHaveTextContent(/melacak tiket aduan/);
    await user.click(screen.getByRole("button", { name: /mengklik tautan/ }));
    expect(screen.getByRole("link", { name: /AduanKonten/ })).toHaveAttribute(
      "href",
      "https://www.aduankonten.id/",
    );
  });

  it("menyiapkan checklist IASC dan menegaskan data sensitif tidak lewat Saring", async () => {
    const user = userEvent.setup();
    render(<Guide />);
    await user.click(
      screen.getByRole("button", { name: /sudah mentransfer uang/ }),
    );

    for (const item of [
      /Identitas dan dokumen pelapor/,
      /rekening atau akun pembayaran Anda dan rekening\/akun terlapor/,
      /Kronologi kejadian dengan tanggal dan waktu transaksi/,
      /Bukti transfer dan mutasi rekening/,
      /Bukti komunikasi dengan pelaku/,
    ]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(
      screen.getByText(/hanya diberikan langsung melalui portal resmi IASC/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("menonjolkan tindakan darurat IASC saat uang sudah ditransfer", async () => {
    const user = userEvent.setup();
    render(<Guide />);
    await user.click(
      screen.getByRole("button", { name: /sudah mentransfer uang/ }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/Tindakan darurat/);
    expect(screen.getByRole("link", { name: /Buka IASC/ })).toHaveAttribute(
      "href",
      "https://iasc.ojk.go.id/",
    );
    expect(
      screen.getByText(/jalur hukum yang berbeda/),
    ).toBeInTheDocument();
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