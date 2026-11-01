import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountMenu } from "@/components/auth/account-menu";
import { notifyAuthChanged } from "@/lib/auth/events";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const RANI = { id: "u1", displayName: "Rani", role: "user" as const };
const BUDI = { id: "u2", displayName: "Budi", role: "user" as const };
const CITRA = { id: "u3", displayName: "Citra", role: "admin" as const };

function meResponse(user: typeof RANI | typeof CITRA | null): Response {
  return new Response(JSON.stringify({ user }), { status: 200 });
}

/** fetch yang bisa diselesaikan manual untuk menguji urutan respons. */
function queueFetch(): Array<{ resolve: (response: Response) => void }> {
  const queue: Array<{ resolve: (response: Response) => void }> = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        queue.push({ resolve });
      }),
  );
  return queue;
}

describe("AccountMenu", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.restoreAllMocks();
  });

  it("menyinkronkan role server setelah login dan logout tanpa reload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: null }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: { id: "u1", displayName: "Rani", role: "user" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(meResponse(null));

    const user = userEvent.setup();
    render(<AccountMenu variant="desktop" />);

    expect(await screen.findByText("Masuk")).toBeInTheDocument();
    notifyAuthChanged();
    expect(await screen.findByText("Akun saya")).toBeInTheDocument();
    expect(screen.getByText("Keluar")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keluar" }));
    expect(screen.queryByText("Akun saya")).not.toBeInTheDocument();
    expect(await screen.findByText("Daftar")).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });

  it("menampilkan menu admin berdasarkan role dari server", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { id: "a1", displayName: "Admin", role: "admin" },
        }),
        { status: 200 },
      ),
    );

    render(<AccountMenu variant="mobile" />);
    const adminLink = await screen.findByRole("link", { name: "Admin" });
    expect(adminLink).toHaveAttribute("href", "/admin");
    expect(screen.getByText("Keluar")).toBeInTheDocument();
  });

  it("menutup drawer mobile setelah memilih tautan akun", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ user: null }), { status: 200 }),
    );
    const onNavigate = vi.fn();
    const user = userEvent.setup();

    render(
      <div onClickCapture={(event) => event.preventDefault()}>
        <AccountMenu variant="mobile" onNavigate={onNavigate} />
      </div>,
    );
    await user.click(await screen.findByRole("link", { name: "Masuk" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("mempertahankan status login saat jaringan gagal", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(meResponse(RANI));

    render(<AccountMenu variant="desktop" />);
    expect(await screen.findByText("Akun saya")).toBeInTheDocument();

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    notifyAuthChanged();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("Akun saya")).toBeInTheDocument());
    expect(screen.queryByText("Masuk")).not.toBeInTheDocument();
  });

  it("mempertahankan status login saat server membalas HTTP 5xx", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(meResponse(RANI));

    render(<AccountMenu variant="desktop" />);
    expect(await screen.findByText("Akun saya")).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    notifyAuthChanged();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("Akun saya")).toBeInTheDocument());
    expect(screen.queryByText("Masuk")).not.toBeInTheDocument();
  });

  it("mengabaikan respons lama yang selesai belakangan", async () => {
    const queue = queueFetch();
    render(<AccountMenu variant="desktop" />);

    await waitFor(() => expect(queue).toHaveLength(1));
    queue[0].resolve(meResponse(RANI));
    expect(await screen.findByText("Akun saya")).toBeInTheDocument();

    notifyAuthChanged();
    notifyAuthChanged();
    await waitFor(() => expect(queue).toHaveLength(3));

    // Permintaan terbaru selesai lebih dulu.
    queue[2].resolve(meResponse(CITRA));
    expect(await screen.findByRole("link", { name: "Admin" })).toBeInTheDocument();

    // Respons lama tidak boleh menimpa hasil yang lebih baru.
    queue[1].resolve(meResponse(BUDI));
    await waitFor(() => expect(screen.getByText("Citra")).toBeInTheDocument());
    expect(screen.queryByText("Budi")).not.toBeInTheDocument();
  });

  it("tidak mengubah state setelah komponen dilepas", async () => {
    const queue = queueFetch();
    const { unmount } = render(<AccountMenu variant="desktop" />);

    await waitFor(() => expect(queue).toHaveLength(1));
    unmount();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    queue[0].resolve(meResponse(RANI));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("menampilkan error dan tetap login ketika logout gagal di server", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(meResponse(RANI))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    const user = userEvent.setup();
    render(<AccountMenu variant="desktop" />);
    await user.click(await screen.findByRole("button", { name: "Keluar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Gagal keluar/);
    expect(screen.getByText("Akun saya")).toBeInTheDocument();
    expect(screen.queryByText("Daftar")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });

  it("menampilkan error dan tetap login ketika logout gagal karena jaringan", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(meResponse(RANI))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const user = userEvent.setup();
    render(<AccountMenu variant="mobile" />);
    await user.click(await screen.findByRole("button", { name: "Keluar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Gagal keluar/);
    expect(screen.getByText("Akun saya")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
