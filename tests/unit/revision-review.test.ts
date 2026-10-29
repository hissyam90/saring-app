import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";
import type { RichDoc } from "@/lib/content/rich-text";

/**
 * Aksi admin untuk revisi artikel publik.
 *
 * Dua hal yang dijaga:
 *   1. Hanya admin yang dapat menyetujui revisi (role diperiksa di server).
 *   2. Persetujuan menerbitkan versi baru; penolakan/perbaikan tidak menghapus
 *      artikel publik, dan penulis menerima notifikasi nyata.
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

const LONG_TEXT =
  "Penipu sering meminta kode OTP dengan alasan verifikasi akun. Langkah aman: " +
  "jangan pernah membagikan kode, tutup percakapan, dan hubungi layanan resmi " +
  "melalui aplikasi yang Anda pasang sendiri. Ingat bahwa bank dan marketplace " +
  "tidak pernah meminta kode OTP melalui pesan singkat maupun telepon.";

const docOf = (text: string): RichDoc => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

function post(body: unknown) {
  return new Request("https://saring.test/api/admin/moderate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "saring.test",
      origin: "https://saring.test",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}

async function setup() {
  const author = await getStore().createUser({
    email: "penulis@contoh.test",
    displayName: "Penulis",
    passwordHash: "x",
  });
  const created = await getStore().createSubmission({
    authorId: author.id,
    title: "Artikel publik untuk revisi",
    summary:
      "Ringkasan artikel yang cukup panjang untuk lolos validasi isi pengajuan.",
    category: "Phishing",
    body: LONG_TEXT,
    bodyJson: docOf(LONG_TEXT),
    references: null,
  });
  const approved = await getStore().reviewSubmission({
    id: created.id,
    status: "approved",
    note: null,
    reviewerId: admin.user.id,
    reviewerName: admin.user.displayName,
    slug: "artikel-publik-untuk-revisi",
  });
  const revisedBody = `${LONG_TEXT} Tambahan penjelasan versi kedua.`;
  const revision = await getStore().createRevision({
    submissionId: approved!.id,
    authorId: author.id,
    title: "Artikel publik untuk revisi (v2)",
    summary:
      "Ringkasan versi kedua yang cukup panjang untuk lolos validasi isi pengajuan.",
    category: "Rekayasa sosial",
    body: revisedBody,
    bodyJson: docOf(revisedBody),
    references: "https://ojk.go.id",
  });

  return { author, submission: approved!, revision };
}

beforeEach(async () => {
  vi.stubEnv("DATABASE_URL", "");
  __resetMemoryStore();
  const record = await getStore().createUser({
    email: "admin@contoh.test",
    displayName: "Admin Uji",
    passwordHash: "x",
  });
  await getStore().setUserRole(record.id, "admin");
  admin.user = { ...admin.user, id: record.id };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(requireAdmin).mockClear();
});

describe("Admin: menyetujui revisi", () => {
  it("menerbitkan versi baru dan memberi notifikasi ke penulis", async () => {
    const { author, submission, revision } = await setup();

    const response = await POST(
      post({ action: "approve-revision", revisionId: revision.id }),
    );

    expect(response.status).toBe(200);

    const published = await getStore().findPublishedArticle(submission.slug!);
    expect(published?.title).toBe("Artikel publik untuk revisi (v2)");
    expect(published?.category).toBe("Rekayasa sosial");
    expect(published?.references).toBe("https://ojk.go.id");

    const notifications = await getStore().listNotifications(author.id, 10);
    expect(notifications.items[0].kind).toBe("revision_approved");
    expect(notifications.items[0].href).toBe(`/pustaka/${submission.slug}`);
  });

  it("menolak revisi yang sudah diputuskan (tidak menerbitkan dua kali)", async () => {
    const { revision } = await setup();

    await POST(post({ action: "approve-revision", revisionId: revision.id }));
    const second = await POST(
      post({ action: "approve-revision", revisionId: revision.id }),
    );

    expect(second.status).toBe(409);
  });

  it("menolak pengguna biasa", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(
      new HttpError(403, "Akses ditolak."),
    );
    const { revision } = await setup();

    const response = await POST(
      post({ action: "approve-revision", revisionId: revision.id }),
    );

    expect(response.status).toBe(403);
  });
});

describe("Admin: keputusan selain persetujuan", () => {
  it("permintaan perbaikan mempertahankan artikel publik dan memberi notifikasi", async () => {
    const { author, submission, revision } = await setup();

    const response = await POST(
      post({
        action: "request-revision-change",
        revisionId: revision.id,
        note: "Tambahkan sumber resmi.",
      }),
    );

    expect(response.status).toBe(200);

    const published = await getStore().findPublishedArticle(submission.slug!);
    expect(published?.title).toBe("Artikel publik untuk revisi");

    const updated = await getStore().findRevision(revision.id);
    expect(updated?.status).toBe("needs_revision");
    expect(updated?.reviewNote).toBe("Tambahkan sumber resmi.");

    const notifications = await getStore().listNotifications(author.id, 10);
    expect(notifications.items[0].kind).toBe("revision_needs_revision");
  });

  it("penolakan revisi tidak menghapus artikel publik", async () => {
    const { author, submission, revision } = await setup();

    await POST(
      post({
        action: "reject-revision",
        revisionId: revision.id,
        note: "Belum sesuai pedoman komunitas.",
      }),
    );

    expect((await getStore().findRevision(revision.id))?.status).toBe("rejected");
    expect((await getStore().findPublishedArticle(submission.slug!))?.title).toBe(
      "Artikel publik untuk revisi",
    );

    const notifications = await getStore().listNotifications(author.id, 10);
    expect(notifications.items[0].kind).toBe("revision_rejected");
  });

  it("mewajibkan alasan untuk permintaan perbaikan dan penolakan", async () => {
    const { revision } = await setup();

    for (const action of ["request-revision-change", "reject-revision"]) {
      const response = await POST(post({ action, revisionId: revision.id }));
      expect(response.status).toBe(400);
    }

    expect((await getStore().findRevision(revision.id))?.status).toBe("pending");
  });

  it("menolak revisi yang tidak ada", async () => {
    const response = await POST(
      post({
        action: "approve-revision",
        revisionId: "00000000-0000-4000-8000-000000000000",
      }),
    );

    expect(response.status).toBe(404);
  });
});

