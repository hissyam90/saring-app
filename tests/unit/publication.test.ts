import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";

/**
 * Aturan publikasi artikel: hanya pengajuan berstatus `approved` yang boleh
 * tampil di Pustaka. Diuji pada level store karena di situlah keputusan terbit
 * diambil, bukan di komponen UI.
 */

const baseInput = {
  title: "Cara memeriksa tautan yang mencurigakan",
  summary:
    "Panduan singkat untuk memeriksa struktur tautan sebelum dibuka, tanpa harus mengklik.",
  category: "Phishing",
  body: "x".repeat(320),
  references: null,
};

async function createUser(email: string, displayName = "Kontributor") {
  return getStore().createUser({
    email,
    displayName,
    passwordHash: "hash-tidak-dipakai-di-tes",
  });
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  __resetMemoryStore();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Publikasi artikel kontribusi", () => {
  it("pengajuan baru berstatus pending dan tidak tampil di Pustaka", async () => {
    const author = await createUser("penulis@contoh.test");
    const submission = await getStore().createSubmission({
      authorId: author.id,
      ...baseInput,
    });

    expect(submission.status).toBe("pending");
    expect(submission.slug).toBeNull();
    expect(await getStore().listPublishedArticles()).toHaveLength(0);
  });

  it("artikel yang disetujui benar-benar terbit dengan slug", async () => {
    const author = await createUser("penulis2@contoh.test");
    const submission = await getStore().createSubmission({
      authorId: author.id,
      ...baseInput,
    });

    const reviewed = await getStore().reviewSubmission({
      id: submission.id,
      status: "approved",
      note: null,
      reviewerId: author.id,
      reviewerName: author.displayName,
      slug: submission.title,
    });

    expect(reviewed?.status).toBe("approved");
    expect(reviewed?.slug).toBe("cara-memeriksa-tautan-yang-mencurigakan");

    const published = await getStore().listPublishedArticles();
    expect(published.map((a) => a.slug)).toContain(reviewed?.slug);

    const detail = await getStore().findPublishedArticle(reviewed!.slug!);
    expect(detail?.title).toBe(baseInput.title);
    expect(detail?.authorName).toBe(author.displayName);
  });

  it("artikel yang ditolak atau perlu revisi tidak terbit", async () => {
    const author = await createUser("penulis3@contoh.test");

    for (const status of ["rejected", "needs_revision"] as const) {
      const submission = await getStore().createSubmission({
        authorId: author.id,
        ...baseInput,
        title: `${baseInput.title} ${status}`,
      });

      const reviewed = await getStore().reviewSubmission({
        id: submission.id,
        status,
        note: "Alasan peninjauan",
        reviewerId: author.id,
        reviewerName: author.displayName,
        slug: submission.title,
      });

      expect(reviewed?.status).toBe(status);
      expect(reviewed?.slug).toBeNull();
    }

    expect(await getStore().listPublishedArticles()).toHaveLength(0);
  });

  it("slug bentrok mendapat akhiran berbeda", async () => {
    const author = await createUser("penulis4@contoh.test");
    const slugs: (string | null)[] = [];

    for (let i = 0; i < 2; i += 1) {
      const submission = await getStore().createSubmission({
        authorId: author.id,
        ...baseInput,
      });
      const reviewed = await getStore().reviewSubmission({
        id: submission.id,
        status: "approved",
        note: null,
        reviewerId: author.id,
        reviewerName: author.displayName,
        slug: baseInput.title,
      });
      slugs.push(reviewed?.slug ?? null);
    }

    expect(new Set(slugs).size).toBe(2);
  });
});
