import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Guide } from "@/components/langkah/guide";
import { SAFETY_GUIDES } from "@/data/guides";

describe("Guide", () => {
  it("shows the correct checklist for every situation", async () => {
    const user = userEvent.setup();
    render(<Guide />);

    for (const guide of SAFETY_GUIDES) {
      await user.click(screen.getByRole("button", { name: guide.situation }));
      expect(await screen.findByText(guide.summary)).toBeInTheDocument();
    }
  });

  it("shows official OJK resources for a money transfer", async () => {
    const user = userEvent.setup();
    render(<Guide />);

    await user.click(
      screen.getByRole("button", { name: /sudah mentransfer uang/ }),
    );

    expect(
      screen.getByText("Indonesia Anti-Scam Centre (IASC)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Kontak 157 OJK — Portal Pengaduan/),
    ).toBeInTheDocument();
  });
});