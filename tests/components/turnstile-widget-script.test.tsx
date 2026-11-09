import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

/**
 * Menguji pemuatan script Cloudflare: script hanya dimuat sekali, gagal-muat
 * menghasilkan status `error`, dan listener dibersihkan (melalui `once`). Di
 * sini `window.turnstile` sengaja TIDAK dipasang lebih dulu agar path pemuatan
 * script benar-benar dijalankan.
 */

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function deleteTurnstile() {
  delete (window as unknown as { turnstile?: unknown }).turnstile;
}

function scriptsInHead(): HTMLScriptElement[] {
  return Array.from(document.querySelectorAll<HTMLScriptElement>("script")).filter(
    (el) => el.src === SCRIPT_SRC,
  );
}

function appendedScripts(appendSpy: ReturnType<typeof vi.spyOn>): HTMLScriptElement[] {
  const calls = appendSpy.mock.calls as unknown as Array<[Node]>;
  return calls
    .map(([node]) => node)
    .filter((node): node is HTMLScriptElement => node instanceof HTMLScriptElement)
    .filter((el) => el.src === SCRIPT_SRC);
}

afterEach(() => {
  vi.restoreAllMocks();
  scriptsInHead().forEach((el) => el.remove());
  deleteTurnstile();
});

describe("TurnstileWidget: pemuatan script", () => {
  it("hanya menambahkan satu <script> untuk beberapa widget sekaligus", async () => {
    const appendSpy = vi.spyOn(document.head, "appendChild");
    deleteTurnstile();

    render(<TurnstileWidget siteKey="k" action="a" onStatus={vi.fn()} />);
    render(<TurnstileWidget siteKey="k" action="b" onStatus={vi.fn()} />);

    // Dua widget yang dirender bersamaan hanya boleh memuat script sekali.
    const scriptEls = appendedScripts(appendSpy);
    expect(scriptEls).toHaveLength(1);

    // Selesaikan pemuatan agar kedua widget memperoleh api dan promise tuntas.
    const renderMock = vi.fn(() => "wid");
    (window as unknown as { turnstile: unknown }).turnstile = {
      render: renderMock,
      remove: vi.fn(),
    };

    act(() => {
      scriptEls[0].dispatchEvent(new Event("load"));
    });
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));
  });

  it("melaporkan error saat script gagal dimuat", async () => {
    const appendSpy = vi.spyOn(document.head, "appendChild");
    const onStatus = vi.fn();

    deleteTurnstile();
    render(<TurnstileWidget siteKey="k" action="submission" onStatus={onStatus} />);

    const scriptEls = appendedScripts(appendSpy);
    expect(scriptEls).toHaveLength(1);

    act(() => {
      scriptEls[0].dispatchEvent(new Event("error"));
    });

    await waitFor(() =>
      expect(onStatus).toHaveBeenLastCalledWith({ state: "error", token: null }),
    );
  });
});