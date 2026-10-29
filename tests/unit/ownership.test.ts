import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";

/**
 * Kepemilikan data dan keputusan moderasi diuji pada level store karena
 * aturan inilah yang menjaga data pengguna lain tidak dapat diubah.
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

describe("Kepemilikan pengajuan artikel", () => {
  it("pengguna lain tidak dapat mengubah pengajuan milik orang lain", async () => {
    const author = await createUser("pemilik@contoh.test");
    const other = await createUser("lain@contoh.test", "Pengguna lain");

    const submission = await getStore().createSubmission({
      authorId: author.id,
      ...baseInput,
    });

    const hijacked = await getStore().updateSubmission(submission.id, other.id, {
      title: "Diambil alih",
      summary: baseInput.summary,
      category: baseInput.category,
      body: baseInput.body,
      references: null,
    });

    expect(hijacked).toBeNull();
    expect((await getStore().findSubmission(submission.id))?.title).toBe(
      baseInput.title,
    );
  });

  it("pengajuan yang sudah final tidak dapat diubah penulisnya", async () => {
    const author = await createUser("penulis5@contoh.test");
    const submission = await getStore().createSubmission({
      authorId: author.id,
      ...baseInput,
    });

    await getStore().reviewSubmission({
      id: submission.id,
      status: "approved",
      note: null,
      reviewerId: author.id,
      reviewerName: author.displayName,
      slug: submission.title,
    });

    const updated = await getStore().updateSubmission(submission.id, author.id, {
      title: "Judul diubah setelah terbit",
      summary: baseInput.summary,
      category: baseInput.category,
      body: baseInput.body,
      references: null,
    });

    expect(updated).toBeNull();
  });

  it("revisi mengembalikan status ke pending dan menghapus catatan lama", async () => {
    const author = await createUser("penulis6@contoh.test");
    const submission = await getStore().createSubmission({
      authorId: author.id,
      ...baseInput,
    });

    await getStore().reviewSubmission({
      id: submission.id,
      status: "needs_revision",
      note: "Tambahkan sumber resmi.",
      reviewerId: author.id,
      reviewerName: author.displayName,
      slug: submission.title,
    });

    const updated = await getStore().updateSubmission(submission.id, author.id, {
      title: baseInput.title,
      summary: baseInput.summary,
      category: baseInput.category,
      body: `${baseInput.body} Revisi.`,
      references: "https://ojk.go.id",
    });

    expect(updated?.status).toBe("pending");
    expect(updated?.reviewNote).toBeNull();
  });
});

describe("Daftar diskusi milik sendiri", () => {
  it("hanya mengembalikan diskusi milik penulis yang diminta", async () => {
    const mine = await createUser("saya@contoh.test", "Saya");
    const other = await createUser("orang@contoh.test", "Orang lain");

    for (const [authorId, title] of [
      [mine.id, "Pertanyaan milik saya sendiri"],
      [other.id, "Pertanyaan milik orang lain"],
    ] as const) {
      await getStore().createThread({
        authorId,
        title,
        category: "phishing",
        body: "Isi pertanyaan yang cukup panjang untuk lolos validasi.",
        articleSlug: null,
      });
    }

    const result = await getStore().listThreadsByAuthor(mine.id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Pertanyaan milik saya sendiri");
  });

  it("diskusi yang disembunyikan admin hilang dari daftar publik", async () => {
    const author = await createUser("tersembunyi@contoh.test");
    const thread = await getStore().createThread({
      authorId: author.id,
      title: "Diskusi yang akan disembunyikan",
      category: "akun",
      body: "Isi diskusi yang cukup panjang untuk lolos validasi.",
      articleSlug: null,
    });

    await getStore().removeThread(thread.id);

    expect(await getStore().findThread(thread.id)).toBeNull();
    expect((await getStore().listThreads({ page: 1, pageSize: 10 })).total).toBe(0);
  });
});

describe("Laporan konten", () => {
  it("mencegah laporan ganda dari pelapor yang sama", async () => {
    const author = await createUser("pelapor@contoh.test");
    const thread = await getStore().createThread({
      authorId: author.id,
      title: "Diskusi yang dilaporkan",
      category: "transaksi",
      body: "Isi diskusi yang cukup panjang untuk lolos validasi.",
      articleSlug: null,
    });

    await getStore().createReport({
      reporterId: author.id,
      targetType: "thread",
      targetId: thread.id,
      reason: "Tautan mencurigakan",
      details: null,
    });

    expect(
      await getStore().countReportsForTarget("thread", thread.id, author.id),
    ).toBe(1);
    expect(await getStore().countOpenReports()).toBe(1);

    await getStore().resolveReport({
      id: (await getStore().listReports({ page: 1, pageSize: 10 })).items[0].id,
      status: "resolved",
    });

    expect(await getStore().countOpenReports()).toBe(0);
  });
});
