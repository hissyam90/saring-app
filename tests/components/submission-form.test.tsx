import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SubmissionForm } from "@/components/komunitas/submission-form";

/**
 * Uji gate Turnstile pada form pengajuan artikel secara deterministik.
 *
 * `TurnstileWidget` dan `RichTextEditor` dipalsukan agar status verifikasi dan
 * isi editor dapat dikendalikan langsung dari test. Fetch di-stub untuk
 * memeriksa payload `captchaToken` yang dikirim.
 */

const mocks = vi.hoisted(() => ({
  turnstile: {
    onStatus: null as null | ((s: { state: string; token: string | null }) => void),
  },
  editor: {
    onChange: null as null | ((doc: unknown) => void),
  },
}));

vi.mock("@/components/security/turnstile-widget", () => ({
  TurnstileWidget: (props: {
    onStatus: (s: { state: string; token: string | null }) => void;
  }) => {
    mocks.turnstile.onStatus = props.onStatus;
    return null;
  },
}));

vi.mock("@/components/komunitas/rich-text-editor", () => ({
  RichTextEditor: (props: { onChange: (doc: unknown) => void }) => {
    mocks.editor.onChange = props.onChange;
    return null;
  },
}));

vi.mock("@/components/pustaka/rich-content", () => ({
  RichContent: () => null,
}));

vi.mock("@/components/komunitas/use-draft-autosave", () => ({
  draftStateLabel: () => "",
  useDraftAutosave: () => ({
    state: "idle" as const,
    savedAt: null,
    draftId: null,
    discard: vi.fn(async () => {}),
  }),
}));

vi.mock("next/link", () => ({
  default: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

function makeDoc(length = 320) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "x".repeat(length) }],
      },
    ],
  };
}

function fillValidFields() {
  fireEvent.change(screen.getByLabelText("Judul artikel"), {
    target: { value: "Judul artikel uji yang valid" },
  });
  fireEvent.change(screen.getByLabelText("Ringkasan"), {
    target: {
      value: "Ringkasan artikel uji coba yang cukup panjang lebih dari empat puluh karakter.",
    },
  });
  fireEvent.change(screen.getByLabelText("Kategori"), {
    target: { value: "Rekayasa sosial" },
  });
  act(() => mocks.editor.onChange?.(makeDoc(320)));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mocks.turnstile.onStatus = null;
  mocks.editor.onChange = null;
  fetchMock = vi.fn(async () => {
    return new Response(JSON.stringify({}), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function submitForm() {
  const form = document.querySelector("form");
  if (!form) throw new Error("form tidak ditemukan di DOM");
  fireEvent.submit(form);
}

describe("SubmissionForm: gate verifikasi Turnstile", () => {
  it("tidak mengirim request saat verifikasi masih loading", () => {
    render(<SubmissionForm />);
    act(() => mocks.turnstile.onStatus?.({ state: "loading", token: null }));

    expect(screen.getByRole("button", { name: "Ajukan artikel" })).toBeDisabled();
    submitForm();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tidak mengirim request dan menampilkan petunjuk saat belum ada token", () => {
    render(<SubmissionForm />);
    act(() => mocks.turnstile.onStatus?.({ state: "error", token: null }));

    fillValidFields();
    submitForm();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Verifikasi keamanan/)).toBeTruthy();
  });

  it("mengirim captchaToken saat token ready", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<SubmissionForm />);
    act(() => mocks.turnstile.onStatus?.({ state: "ready", token: "tok-123" }));

    expect(screen.getByRole("button", { name: "Ajukan artikel" })).toBeEnabled();

    fillValidFields();
    submitForm();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.captchaToken).toBe("tok-123");
    expect(init.method).toBe("POST");
  });

  it("token expired membuat submit kembali tidak aktif dan tidak mengirim", async () => {
    render(<SubmissionForm />);
    act(() => mocks.turnstile.onStatus?.({ state: "ready", token: "tok-123" }));
    expect(screen.getByRole("button", { name: "Ajukan artikel" })).toBeEnabled();

    act(() => mocks.turnstile.onStatus?.({ state: "expired", token: null }));
    expect(screen.getByRole("button", { name: "Ajukan artikel" })).toBeDisabled();

    fillValidFields();
    submitForm();
    await waitFor(() =>
      expect(screen.getByText(/verifikasi kedaluwarsa/i)).toBeTruthy(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("widget error tidak memungkinkan pengiriman", () => {
    render(<SubmissionForm />);
    act(() => mocks.turnstile.onStatus?.({ state: "error", token: null }));

    expect(screen.getByRole("button", { name: "Ajukan artikel" })).toBeDisabled();

    fillValidFields();
    submitForm();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("token ditolak server tidak menghapus isi editor", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Token verifikasi ditolak." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<SubmissionForm />);
    act(() => mocks.turnstile.onStatus?.({ state: "ready", token: "tok-bad" }));

    const title = "Judul yang tidak boleh hilang";
    fireEvent.change(screen.getByLabelText("Judul artikel"), {
      target: { value: title },
    });
    fireEvent.change(screen.getByLabelText("Ringkasan"), {
      target: {
        value: "Ringkasan artikel uji coba yang cukup panjang lebih dari empat puluh karakter.",
      },
    });
    fireEvent.change(screen.getByLabelText("Kategori"), {
      target: { value: "Rekayasa sosial" },
    });
    act(() => mocks.editor.onChange?.(makeDoc(320)));

    submitForm();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Judul artikel")).toHaveValue(title);
    expect(screen.getByText("Token verifikasi ditolak.")).toBeTruthy();
  });

  it("meminta token baru setelah token dipakai/ditolak server", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Token verifikasi ditolak." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<SubmissionForm />);
    act(() => mocks.turnstile.onStatus?.({ state: "ready", token: "tok-once" }));
    expect(screen.getByRole("button", { name: "Ajukan artikel" })).toBeEnabled();

    fillValidFields();
    submitForm();

    // Setelah token ditolak server, form kembali menunggu token baru: tombol
    // dinonaktifkan lagi meski `pending` sudah selesai.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ajukan artikel" })).toBeDisabled(),
    );

    // Token baru yang valid mengaktifkan kembali tombol kirim.
    act(() => mocks.turnstile.onStatus?.({ state: "ready", token: "tok-2" }));
    expect(screen.getByRole("button", { name: "Ajukan artikel" })).toBeEnabled();
  });
});