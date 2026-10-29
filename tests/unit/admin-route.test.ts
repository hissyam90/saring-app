import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";

/**
 * Endpoint moderasi admin diuji langsung (bukan lewat UI) untuk memastikan
 * penolakan terjadi di server: pengguna biasa, request lintas situs, dan
 * perubahan role sendiri harus gagal tanpa menyentuh data.
 */

const admin = vi.hoisted(() => ({
  user: {
    id: "",
    email: "admin@contoh.test",
    displayName: "Admin Uji",
    role: "admin" as const,
    createdAt: "",
  },
}));

vi.mock("@/lib/auth/guards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/guards")>();
  return {
    ...actual,
    requireAdmin: vi.fn(async () => ({ user: admin.user, role: "admin" as const })),
  };
});

const { HttpError, requireAdmin } = await import("@/lib/auth/guards");
const { POST } = await import("@/app/api/admin/moderate/route");

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://saring.test/api/admin/moderate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://saring.test",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function createUser(email: string, displayName: string) {
  return getStore().createUser({
    email,
    displayName,
    passwordHash: "hash-tidak-dipakai-di-tes",
  });
}

beforeEach(async () => {
  vi.stubEnv("DATABASE_URL", "");
  __resetMemoryStore();
  const record = await createUser("admin@contoh.test", "Admin Uji");
  await getStore().setUserRole(record.id, "admin");
  admin.user = { ...admin.user, id: record.id };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(requireAdmin).mockClear();
});

describe("POST /api/admin/moderate", () => {
  it("menolak pengguna biasa dengan 403", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(
      new HttpError(403, "Akses ditolak."),
    );

    const response = await POST(post({ action: "set-user-role" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Akses ditolak.",
    });
  });

  it("menolak request lintas situs sebelum memeriksa apa pun", async () => {
    const response = await POST(
      post({ action: "set-user-role" }, { origin: "https://penipu.test" }),
    );

    expect(response.status).toBe(403);
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  it("menolak admin yang mencoba mengubah role akunnya sendiri", async () => {
    const response = await POST(
      post({ action: "set-user-role", userId: admin.user.id, role: "user" }),
    );

    expect(response.status).toBe(409);

    // Role tidak berubah: eskalasi/penurunan diri sendiri tidak terjadi.
    expect((await getStore().findUserById(admin.user.id))?.role).toBe("admin");
  });

  it("mewajibkan alasan saat menolak pengajuan", async () => {
    const author = await createUser("penulis@contoh.test", "Penulis");
    const submission = await getStore().createSubmission({
      authorId: author.id,
      title: "Judul pengajuan yang akan ditolak",
      summary: "Ringkasan pengajuan yang cukup panjang untuk lolos validasi isi.",
      category: "Phishing",
      body: "x".repeat(320),
      references: null,
    });

    const response = await POST(
      post({ action: "reject-submission", submissionId: submission.id }),
    );

    expect(response.status).toBe(400);
    expect((await getStore().findSubmission(submission.id))?.status).toBe("pending");
  });

  it("menyetujui pengajuan sehingga artikel terbit di Pustaka", async () => {
    const author = await createUser("penulis2@contoh.test", "Penulis Dua");
    const submission = await getStore().createSubmission({
      authorId: author.id,
      title: "Artikel yang akan disetujui admin",
      summary: "Ringkasan artikel yang cukup panjang untuk lolos validasi isi.",
      category: "Rekayasa sosial",
      body: "x".repeat(320),
      references: null,
    });

    const response = await POST(
      post({ action: "approve-submission", submissionId: submission.id }),
    );

    expect(response.status).toBe(200);

    const reviewed = await getStore().findSubmission(submission.id);
    expect(reviewed?.status).toBe("approved");

    const published = await getStore().listPublishedArticles();
    expect(published.map((a) => a.title)).toContain(
      "Artikel yang akan disetujui admin",
    );
  });

  it("mencatat tindakan moderasi pada riwayat", async () => {
    const author = await createUser("penulis3@contoh.test", "Penulis Tiga");
    const submission = await getStore().createSubmission({
      authorId: author.id,
      title: "Artikel untuk uji riwayat moderasi",
      summary: "Ringkasan artikel yang cukup panjang untuk lolos validasi isi.",
      category: "Transaksi",
      body: "x".repeat(320),
      references: null,
    });

    await POST(
      post({
        action: "request-revision",
        submissionId: submission.id,
        note: "Tambahkan sumber resmi.",
      }),
    );

    const log = await getStore().listModerationLog(10);
    expect(log[0]).toMatchObject({
      action: "request-revision",
      targetType: "submission",
      targetId: submission.id,
      note: "Tambahkan sumber resmi.",
    });
  });

  it("menolak aksi yang tidak dikenal", async () => {
    const response = await POST(post({ action: "hapus-semua-data" }));
    expect(response.status).toBe(400);
  });
});
