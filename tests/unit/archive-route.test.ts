import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";

/**
 * Endpoint arsip artikel diuji langsung: otorisasi pemilik/admin harus
 * ditegakkan server, bukan oleh tombol di UI.
 */

const session = vi.hoisted(() => ({ userId: undefined as string | undefined }));

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ userId: session.userId }),
}));

const { POST } = await import("@/app/api/community/submissions/[id]/archive/route");

const baseInput = {
  title: "Artikel untuk uji arsip",
  summary:
    "Ringkasan yang cukup panjang untuk lolos validasi pengajuan artikel pada pengujian ini.",
  category: "Phishing",
  body: "x".repeat(320),
  references: null,
};

function request(body: unknown, origin = "https://saring.test") {
  return new Request("https://saring.test/api/community/submissions/x/archive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "saring.test",
      origin,
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}

function call(id: string, body: unknown, origin?: string) {
  return POST(request(body, origin), { params: Promise.resolve({ id }) });
}

async function user(email: string, displayName: string, role: "user" | "admin" = "user") {
  const store = getStore();
  const created = await store.createUser({
    email,
    displayName,
    passwordHash: "hash-tidak-dipakai-di-tes",
  });
  if (role === "admin") await store.setUserRole(created.id, "admin");
  return created;
}

/** Artikel milik `author` yang sudah terbit. */
async function approvedBy(authorId: string, title: string) {
  const store = getStore();
  const submission = await store.createSubmission({
    authorId,
    ...baseInput,
    title,
  });
  const reviewed = await store.reviewSubmission({
    id: submission.id,
    status: "approved",
    note: null,
    reviewerId: authorId,
    reviewerName: "Peninjau",
    slug: title,
  });
  return reviewed!;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  __resetMemoryStore();
});

afterEach(() => {
  vi.unstubAllEnvs();
  session.userId = undefined;
});

describe("POST /api/community/submissions/[id]/archive", () => {
  it("menolak request tanpa sesi", async () => {
    const owner = await user("pemilik@contoh.test", "Pemilik");
    const article = await approvedBy(owner.id, "Artikel tanpa sesi");

    session.userId = undefined;
    expect((await call(article.id, { archived: true })).status).toBe(401);
  });

  it("menolak request lintas origin", async () => {
    const owner = await user("pemilik2@contoh.test", "Pemilik");
    const article = await approvedBy(owner.id, "Artikel lintas origin");

    session.userId = owner.id;
    const response = await call(article.id, { archived: true }, "https://jahat.test");

    expect(response.status).toBe(403);
    expect((await getStore().findSubmission(article.id))?.archivedAt).toBeNull();
  });

  it("pemilik dapat mengarsipkan artikelnya sendiri", async () => {
    const owner = await user("pemilik3@contoh.test", "Pemilik");
    const article = await approvedBy(owner.id, "Artikel milik sendiri");

    session.userId = owner.id;
    const response = await call(article.id, { archived: true });

    expect(response.status).toBe(200);
    expect((await getStore().findPublishedArticle(article.slug!))).toBeNull();
  });

  it("pengguna lain tidak dapat mengarsipkan artikel orang lain", async () => {
    const owner = await user("pemilik4@contoh.test", "Pemilik");
    const other = await user("lain@contoh.test", "Pengguna Lain");
    const article = await approvedBy(owner.id, "Artikel orang lain");

    session.userId = other.id;
    const response = await call(article.id, { archived: true });

    // 404 agar keberadaan artikel orang lain tidak diumumkan.
    expect(response.status).toBe(404);
    expect((await getStore().findSubmission(article.id))?.archivedAt).toBeNull();
  });

  it("admin dapat mengarsipkan dan memulihkan artikel siapa pun", async () => {
    const owner = await user("pemilik5@contoh.test", "Pemilik");
    const admin = await user("admin@contoh.test", "Admin Uji", "admin");
    const article = await approvedBy(owner.id, "Artikel untuk admin");

    session.userId = admin.id;
    expect((await call(article.id, { archived: true })).status).toBe(200);
    expect((await getStore().findPublishedArticle(article.slug!))).toBeNull();

    expect((await call(article.id, { archived: false })).status).toBe(200);
    expect((await getStore().findPublishedArticle(article.slug!))?.slug).toBe(
      article.slug,
    );
  });

  it("menolak artikel yang belum terbit", async () => {
    const owner = await user("pemilik6@contoh.test", "Pemilik");
    const pending = await getStore().createSubmission({
      authorId: owner.id,
      ...baseInput,
      title: "Masih menunggu tinjauan",
    });

    session.userId = owner.id;
    expect((await call(pending.id, { archived: true })).status).toBe(409);
  });

  it("menolak body yang tidak valid", async () => {
    const owner = await user("pemilik7@contoh.test", "Pemilik");
    const article = await approvedBy(owner.id, "Artikel body tidak valid");

    session.userId = owner.id;
    expect((await call(article.id, { archived: "ya" })).status).toBe(400);
    expect((await call(article.id, {})).status).toBe(400);
  });

  it("artikel yang diarsipkan tidak dapat dibuka lewat URL langsung", async () => {
    const store = getStore();
    const owner = await user("pemilik8@contoh.test", "Pemilik");
    const article = await approvedBy(owner.id, "Artikel url langsung");

    session.userId = owner.id;
    await call(article.id, { archived: true });

    expect(await store.findPublishedArticle(article.slug!)).toBeNull();
    expect((await store.listPublishedArticles()).map((a) => a.slug)).not.toContain(
      article.slug,
    );
  });
});
