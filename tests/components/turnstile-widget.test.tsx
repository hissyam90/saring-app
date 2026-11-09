import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

/**
 * Uji mesin status widget Turnstile secara deterministik. Cloudflare script
 * TIDAK dimuat sungguhan: `window.turnstile` dipalsukan sehingga path render
 * mengembalikan api mock secara langsung, dan kita memanggil `callback` /
 * `expired-callback` / `error-callback` yang direkam oleh mock.
 */

interface WidgetOptions {
  sitekey: string;
  action?: string;
  theme?: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

interface FakeTurnstile {
  render: (container: HTMLElement, options: WidgetOptions) => string;
  remove: (widgetId?: string) => void;
}

function installTurnstile() {
  const renderMock = vi.fn<(container: HTMLElement, options: WidgetOptions) => string>(
    () => "widget-1",
  );
  const removeMock = vi.fn();
  (window as unknown as { turnstile: FakeTurnstile }).turnstile = {
    render: renderMock,
    remove: removeMock,
  };
  return { renderMock, removeMock };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as unknown as { turnstile?: FakeTurnstile }).turnstile;
});

describe("TurnstileWidget: mesin status", () => {
  it("menampilkan petunjuk not-configured saat siteKey tidak tersedia", () => {
    const onStatus = vi.fn();
    render(<TurnstileWidget siteKey={null} action="submission" onStatus={onStatus} />);

    expect(screen.getByText(/belum dikonfigurasi/i)).toBeTruthy();
    expect(onStatus).not.toHaveBeenCalled();
  });

  it("menampilkan petunjuk loading, lalu ready dengan token saat callback terpanggil", async () => {
    const onStatus = vi.fn();
    const { renderMock } = installTurnstile();

    render(<TurnstileWidget siteKey="site-key" action="submission" onStatus={onStatus} />);

    expect(screen.getByText(/Menyiapkan verifikasi keamanan/i)).toBeTruthy();

    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));
    expect(onStatus).not.toHaveBeenCalled();

    const options = renderMock.mock.calls[0][1];
    expect(options.sitekey).toBe("site-key");
    expect(options.action).toBe("submission");
    expect(options.theme).toBe("light");

    act(() => options.callback?.("token-abc"));
    expect(onStatus).toHaveBeenLastCalledWith({ state: "ready", token: "token-abc" });
  });

  it("expired-callback segera membatalkan status verified", async () => {
    const onStatus = vi.fn();
    const { renderMock } = installTurnstile();

    render(<TurnstileWidget siteKey="site-key" action="submission" onStatus={onStatus} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));

    act(() => renderMock.mock.calls[0][1].callback?.("token-abc"));
    expect(onStatus).toHaveBeenLastCalledWith({ state: "ready", token: "token-abc" });

    act(() => renderMock.mock.calls[0][1]["expired-callback"]?.());
    expect(onStatus).toHaveBeenLastCalledWith({ state: "expired", token: null });
  });

  it("error-callback melaporkan error dan menampilkan tombol coba lagi", async () => {
    const onStatus = vi.fn();
    const { renderMock } = installTurnstile();

    render(<TurnstileWidget siteKey="site-key" action="submission" onStatus={onStatus} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));

    act(() => renderMock.mock.calls[0][1]["error-callback"]?.());
    expect(onStatus).toHaveBeenLastCalledWith({ state: "error", token: null });

    expect(
      screen.getByRole("button", { name: "Coba verifikasi lagi" }),
    ).toBeTruthy();
  });

  it("tombol coba lagi merender ulang widget dan bisa menghasilkan token baru", async () => {
    const onStatus = vi.fn();
    const { renderMock } = installTurnstile();
    renderMock.mockImplementation(() => "widget-2");

    render(<TurnstileWidget siteKey="site-key" action="submission" onStatus={onStatus} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));

    act(() => renderMock.mock.calls[0][1]["error-callback"]?.());
    fireEvent.click(screen.getByRole("button", { name: "Coba verifikasi lagi" }));

    // Tombol "coba lagi" mengembalikan status ke loading sebelum render ulang.
    expect(onStatus).toHaveBeenLastCalledWith({ state: "loading", token: null });

    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));

    act(() => renderMock.mock.calls[1][1].callback?.("token-2"));
    expect(onStatus).toHaveBeenLastCalledWith({ state: "ready", token: "token-2" });
  });
});

describe("TurnstileWidget: pembersihan saat unmount", () => {
  it("memanggil turnstile.remove pada unmount", async () => {
    const onStatus = vi.fn();
    const { renderMock, removeMock } = installTurnstile();
    renderMock.mockReturnValue("widget-id-unmount");

    const view = render(
      <TurnstileWidget siteKey="site-key" action="submission" onStatus={onStatus} />,
    );
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));

    view.unmount();
    expect(removeMock).toHaveBeenCalledWith("widget-id-unmount");
  });
});