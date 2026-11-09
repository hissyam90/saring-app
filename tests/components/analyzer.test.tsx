import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Analyzer } from "@/components/periksa/analyzer";

const RESULT = "Permintaan kode rahasia";

/**
 * Hasil pemeriksaan muncul setelah debounce 250 ms di dalam komponen. Pada
 * beban paralel penuh `npm run test` (49 file jsdom + hashing bcrypt yang
 * menyaturasi CPU), batas 1000 ms bawaan `findBy*` dapat terpotong dan gagal
 * palsu. Timeout hanya dilonggarkan untuk menanti hasil asinkron yang memang
 * sengaja di-debounce, bukan untuk menyembunyikan kegagalan.
 */
const ASYNC_TIMEOUT = { timeout: 10_000 };

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

    expect(
      await screen.findByText(/Permintaan kode rahasia/, {}, ASYNC_TIMEOUT),
    ).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});

describe("Analyzer — contoh dan urutan", () => {
  it("menutup accordion contoh secara default dan bisa dibuka-tutup", async () => {
    const user = userEvent.setup();
    const { container } = render(<Analyzer />);

    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);

    await user.click(screen.getByText("Coba pesan contoh"));
    expect(details?.open).toBe(true);

    await user.click(screen.getByText("Coba pesan contoh"));
    expect(details?.open).toBe(false);
  });

  it("menganalisis contoh otomatis dan menutup accordion saat dipilih", async () => {
    const user = userEvent.setup();
    const { container } = render(<Analyzer />);

    await user.click(screen.getByText("Coba pesan contoh"));
    const details = container.querySelector("details");
    expect(details?.open).toBe(true);

    await user.click(screen.getByRole("button", { name: /Minta kode OTP/ }));

    // Accordion tertutup setelah contoh dipilih.
    expect(details?.open).toBe(false);

    // Status "Memeriksa…" tampil seketika, lalu hasil tersedia tanpa klik kedua.
    expect(screen.getByRole("button", { name: /Memeriksa/ })).toBeInTheDocument();
    expect(await screen.findByText(new RegExp(RESULT), {}, ASYNC_TIMEOUT)).toBeInTheDocument();
  });

  it("menandai hasil kedaluwarsa saat teks diubah", async () => {
    const user = userEvent.setup();
    render(<Analyzer />);

    const textarea = screen.getByLabelText(/Pesan yang ingin diperiksa/);
    await user.type(textarea, "kirim kode OTP Anda sekarang untuk verifikasi");
    await user.click(screen.getByRole("button", { name: /Periksa pesan/ }));
    await screen.findByText(new RegExp(RESULT), {}, ASYNC_TIMEOUT);

    await user.type(textarea, " dan kirim PIN juga");

    expect(screen.getByText(/Pesan berubah/)).toBeInTheDocument();
    expect(
      screen.queryByText(new RegExp(RESULT)),
    ).not.toBeInTheDocument();
  });

  it("tidak menampilkan hasil pemeriksaan yang dibatalkan saat mengetik berjalan", async () => {
    const user = userEvent.setup();
    render(<Analyzer />);

    const textarea = screen.getByLabelText(/Pesan yang ingin diperiksa/);
    await user.type(textarea, "kirim kode OTP Anda sekarang untuk verifikasi");
    await user.click(screen.getByRole("button", { name: /Periksa pesan/ }));

    // Teks diubah saat pemeriksaan masih berjalan.
    await user.type(textarea, " tambahan");
    expect(screen.getByText(/Pesan berubah/)).toBeInTheDocument();

    // Timer dibatalkan; setelah lewat batas waktu, hasil lama tidak muncul.
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(
      screen.queryByText(new RegExp(RESULT)),
    ).not.toBeInTheDocument();
  });

  it("tombol Coba contoh lain memuat dan menganalisis contoh", async () => {
    const user = userEvent.setup();
    render(<Analyzer />);

    await user.click(screen.getByRole("button", { name: /Coba contoh lain/ }));

    expect(
      await screen.findByRole("region", { name: "Hasil pemeriksaan" }, ASYNC_TIMEOUT),
    ).toBeInTheDocument();
  });

  it("tombol Bersihkan mengembalikan kondisi awal", async () => {
    const user = userEvent.setup();
    render(<Analyzer />);

    const textarea = screen.getByLabelText(/Pesan yang ingin diperiksa/);
    await user.type(textarea, "kirim kode OTP Anda sekarang");
    await user.click(screen.getByRole("button", { name: /Periksa pesan/ }));
    await screen.findByText(new RegExp(RESULT), {}, ASYNC_TIMEOUT);

    await user.click(screen.getByRole("button", { name: /Bersihkan/ }));

    expect(textarea).toHaveValue("");
    expect(
      screen.queryByText(new RegExp(RESULT)),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Hasil akan muncul di sini")).toBeInTheDocument();
  });

  it("mengumumkan hasil selesai untuk pembaca layar", async () => {
    const user = userEvent.setup();
    render(<Analyzer />);

    await user.type(
      screen.getByLabelText(/Pesan yang ingin diperiksa/),
      "kirim kode OTP Anda sekarang",
    );
    await user.click(screen.getByRole("button", { name: /Periksa pesan/ }));

    expect(
      await screen.findByText(/Analisis selesai/, {}, ASYNC_TIMEOUT),
    ).toBeInTheDocument();
  });
});