import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Simulator } from "@/components/latihan/simulator";

describe("Simulator", () => {
  it("menjelaskan sistem poin sebelum latihan dimulai", () => {
    render(<Simulator />);
    expect(screen.getByText("Cara penilaian")).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(
      screen.getByText(/bukan jaminan keamanan/i),
    ).toBeInTheDocument();
  });

  it("menyediakan tiga mode sesi dengan jumlah soal yang benar", () => {
    render(<Simulator />);
    expect(
      screen.getByRole("button", { name: /Latihan cepat/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Latihan standar/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Latihan lengkap/ }),
    ).toBeInTheDocument();
  });

  it("menjalankan sesi cepat 5 soal sampai ringkasan", async () => {
    const user = userEvent.setup();
    render(<Simulator />);

    await user.click(screen.getByRole("button", { name: /Latihan cepat/ }));
    expect(screen.getByText("1/5")).toBeInTheDocument();

    for (let i = 0; i < 5; i += 1) {
      const options = screen
        .getAllByRole("button")
        .filter(
          (b) =>
            !/Soal berikutnya|Lihat hasil|Mulai sesi baru/.test(
              b.textContent ?? "",
            ),
        );
      await user.click(options[0]);
      await user.click(
        screen.getByRole("button", { name: /Soal berikutnya|Lihat hasil/ }),
      );
    }

    expect(screen.getByText("Hasil sesi")).toBeInTheDocument();
    expect(screen.getByText(/dari 5 soal dijawab/)).toBeInTheDocument();
  });

  it("menampilkan poin dan umpan balik sesuai pilihan", async () => {
    const user = userEvent.setup();
    render(<Simulator />);
    await user.click(screen.getByRole("button", { name: /Latihan cepat/ }));

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    expect(screen.getByText(/poin$/)).toBeInTheDocument();
    expect(screen.getByText(/Langkah yang seharusnya/)).toBeInTheDocument();
  });

  it("memungkinkan memulai sesi baru dari ringkasan", async () => {
    const user = userEvent.setup();
    render(<Simulator />);
    await user.click(screen.getByRole("button", { name: /Latihan cepat/ }));

    for (let i = 0; i < 5; i += 1) {
      const options = screen
        .getAllByRole("button")
        .filter(
          (b) =>
            !/Soal berikutnya|Lihat hasil|Mulai sesi baru/.test(
              b.textContent ?? "",
            ),
        );
      await user.click(options[0]);
      await user.click(
        screen.getByRole("button", { name: /Soal berikutnya|Lihat hasil/ }),
      );
    }

    await user.click(screen.getByRole("button", { name: /Mulai sesi baru/ }));
    expect(screen.getByText("Cara penilaian")).toBeInTheDocument();
  });
});