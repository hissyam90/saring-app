import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Simulator } from "@/components/latihan/simulator";
import { SCENARIOS } from "@/data/scenarios";

describe("Simulator", () => {
  it("shows feedback tied to the selected answer", async () => {
    const user = userEvent.setup();
    render(<Simulator />);

    await user.click(
      screen.getByRole("button", {
        name: /Segera transfer agar tidak kehilangan kesempatan/,
      }),
    );

    expect(
      await screen.findByText(/Perusahaan resmi tidak meminta calon karyawan/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Saran tindakan:/)).toBeInTheDocument();
  });

  it("runs through every scenario to a summary", async () => {
    const user = userEvent.setup();
    render(<Simulator />);

    for (const scenario of SCENARIOS) {
      await user.click(
        screen.getByRole("button", { name: scenario.options[0].label }),
      );
      await user.click(
        screen.getByRole("button", {
          name: /Skenario berikutnya|Lihat ringkasan/,
        }),
      );
    }

    expect(screen.getByText("Ringkasan latihan")).toBeInTheDocument();
  });
});