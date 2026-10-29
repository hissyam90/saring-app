import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";

/**
 * Aturan arsip artikel pada level store: artikel yang diarsipkan hilang dari
 * Pustaka dan dari akses URL langsung, tetapi datanya tidak dihapus.
 */

const baseInput = {
  title: "Artikel yang akan diarsipkan",
  summary:
    "Ringkasan yang cukup panjang untuk lolos validasi pengajuan artikel pada pengujian.",
  category: "Phishing",
  body: "x".repeat(320),
  references: null,
};

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  __resetMemoryStore();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function publishedArticle() {
  const store = getStore();
  const author = await store.createUser({
    email: "arsip@contoh.test",
    displayName: "Penulis Arsip",
    passwordHash: "hash-tidak-dipakai-di-tes",
  });
  const submission = await store.createSubmission({
    authorId: author.id,
    ...baseInput,
  });
  const reviewed = await store.reviewSubmission({
    id: submission.id,
    status: "approved",
    note: null,
    reviewerId: author.id,
    reviewerName: author.displayName,
    slug: submission.title,
  });
  return { store, author, reviewed: reviewed! };
}

describe("Arsip artikel", () => {
  it("artikel yang diarsipkan hilang dari Pustaka dan dari URL langsung", async () => {
    const { store, reviewed } = await publishedArticle();
    expect(await store.findPublishedArticle(reviewed.slug!)).not.toBeNull();

    const archived = await store.setSubmissionArchived(reviewed.id, true);

    expect(archived?.archivedAt).toBeTruthy();
    expect(await store.listPublishedArticles()).toHaveLength(0);
    expect(await store.findPublishedArticle(reviewed.slug!)).toBeNull();
  });

  it("artikel dan slug tetap utuh setelah diarsipkan (soft archive)", async () => {
    const { store, reviewed } = await publishedArticle();
    await store.setSubmissionArchived(reviewed.id, true);

    const stored = await store.findSubmission(reviewed.id);
    expect(stored?.status).toBe("approved");
    expect(stored?.slug).toBe(reviewed.slug);
    expect(stored?.title).toBe(baseInput.title);
  });

  it("memulihkan artikel mengembalikannya ke Pustaka", async () => {
    const { store, reviewed } = await publishedArticle();
    await store.setSubmissionArchived(reviewed.id, true);
    await store.setSubmissionArchived(reviewed.id, false);

    expect(await store.findPublishedArticle(reviewed.slug!)).not.toBeNull();
    expect(await store.listPublishedArticles()).toHaveLength(1);
  });

  it("hitungan artikel terbit tidak menyertakan artikel yang diarsipkan", async () => {
    const { store, reviewed } = await publishedArticle();
    expect((await store.stats()).publishedSubmissions).toBe(1);

    await store.setSubmissionArchived(reviewed.id, true);

    expect((await store.stats()).publishedSubmissions).toBe(0);
  });

  it("ID yang tidak dikenal tidak mengubah apa pun", async () => {
    const { store } = await publishedArticle();
    expect(
      await store.setSubmissionArchived("00000000-0000-0000-0000-000000000000", true),
    ).toBeNull();
  });
});
