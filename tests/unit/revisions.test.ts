import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";
import type { RichDoc } from "@/lib/content/rich-text";

/**
 * Versioning artikel publik.
 *
 * Aturan inti yang diuji:
 *   - konten publik berada di `submissions` dan tidak berubah saat revisi dibuat;
 *   - revisi menjadi publik hanya lewat `publishRevision` (atomik di PostgreSQL);
 *   - penolakan / permintaan perbaikan tidak menghapus artikel tayang;
 *   - slug publik dipertahankan saat revisi diterbitkan.
 */

const originalDoc: RichDoc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Isi versi pertama." }] },
  ],
};

const revisionDoc: RichDoc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Isi versi kedua." }] },
  ],
};

const base = {
  title: "Artikel yang akan direvisi",
  summary:
    "Ringkasan artikel yang cukup panjang untuk lolos validasi isi pengajuan.",
  category: "Phishing",
  body: "Isi versi pertama.",
  bodyJson: originalDoc,
  references: null,
};

async function setup() {
  const author = await getStore().createUser({
    email: "penulis@contoh.test",
    displayName: "Penulis",
    passwordHash: "hash-tidak-dipakai-di-tes",
  });

  const created = await getStore().createSubmission({
    authorId: author.id,
    ...base,
  });

  const approved = await getStore().reviewSubmission({
    id: created.id,
    status: "approved",
    note: null,
    reviewerId: author.id,
    reviewerName: "Admin",
    slug: base.title,
  });

  return { author, submission: approved! };
}

function newRevisionInput(authorId: string, submissionId: string) {
  return {
    submissionId,
    authorId,
    title: "Judul versi kedua",
    summary: base.summary,
    category: base.category,
    body: "Isi versi kedua.",
    bodyJson: revisionDoc,
    references: null,
  };
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  __resetMemoryStore();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Revisi artikel terbit: penyimpanan", () => {
  it("artikel terbit punya slug dan tampil di Pustaka", async () => {
    const { submission } = await setup();

    expect(submission.status).toBe("approved");
    expect(submission.slug).toBe("artikel-yang-akan-direvisi");

    const published = await getStore().findPublishedArticle(submission.slug!);
    expect(published?.title).toBe(base.title);
    expect(published?.authorId).toBe(submission.authorId);
    expect(published?.submissionId).toBe(submission.id);
  });

  it("membuat revisi tidak mengubah artikel publik", async () => {
    const { author, submission } = await setup();

    await getStore().createRevision(
      newRevisionInput(author.id, submission.id),
    );

    const published = await getStore().findPublishedArticle(submission.slug!);
    expect(published?.title).toBe(base.title);
    expect(published?.body).toBe("Isi versi pertama.");

    const current = await getStore().findSubmission(submission.id);
    expect(current?.status).toBe("approved");
    expect(current?.title).toBe(base.title);

    const open = await getStore().findOpenRevision(submission.id);
    expect(open?.status).toBe("pending");
    expect(open?.title).toBe("Judul versi kedua");
  });

  it("revisi pending tidak muncul di daftar artikel publik", async () => {
    const { author, submission } = await setup();

    await getStore().createRevision(
      newRevisionInput(author.id, submission.id),
    );

    const published = await getStore().listPublishedArticles();
    expect(published.map((a) => a.title)).not.toContain("Judul versi kedua");
  });
});

describe("Revisi artikel terbit: penerbitan", () => {
  it("menyetujui revisi menggantikan konten publik dan mempertahankan slug", async () => {
    const { author, submission } = await setup();

    const revision = await getStore().createRevision({
      ...newRevisionInput(author.id, submission.id),
      title: "Artikel yang akan direvisi",
      category: "Rekayasa sosial",
      references: "https://ojk.go.id",
    });

    const published = await getStore().publishRevision({
      revisionId: revision.id,
      reviewerId: author.id,
      note: null,
    });

    expect(published).not.toBeNull();
    expect(published?.slug).toBe(submission.slug);
    expect(published?.body).toBe("Isi versi kedua.");
    expect(published?.category).toBe("Rekayasa sosial");
    expect(published?.references).toBe("https://ojk.go.id");

    const reloaded = await getStore().findPublishedArticle(submission.slug!);
    expect(reloaded?.body).toBe("Isi versi kedua.");
    expect(reloaded?.bodyJson).toEqual(revisionDoc);

    expect((await getStore().findRevision(revision.id))?.status).toBe("approved");
    expect(await getStore().findOpenRevision(submission.id)).toBeNull();
  });

  it("menolak revisi tidak menghapus artikel publik", async () => {
    const { author, submission } = await setup();

    const revision = await getStore().createRevision(
      newRevisionInput(author.id, submission.id),
    );

    await getStore().reviewRevision({
      id: revision.id,
      status: "rejected",
      note: "Belum sesuai pedoman.",
      reviewerId: author.id,
      reviewerName: "Admin",
    });

    const published = await getStore().findPublishedArticle(submission.slug!);
    expect(published?.body).toBe("Isi versi pertama.");
    expect((await getStore().findSubmission(submission.id))?.status).toBe("approved");

    const rejected = await getStore().findRevision(revision.id);
    expect(rejected?.status).toBe("rejected");
    expect(rejected?.reviewNote).toBe("Belum sesuai pedoman.");
  });

  it("meminta perbaikan mempertahankan artikel publik dan revisi dapat dilanjutkan", async () => {
    const { author, submission } = await setup();

    const revision = await getStore().createRevision(
      newRevisionInput(author.id, submission.id),
    );

    await getStore().reviewRevision({
      id: revision.id,
      status: "needs_revision",
      note: "Tambahkan sumber resmi.",
      reviewerId: author.id,
      reviewerName: "Admin",
    });

    expect((await getStore().findPublishedArticle(submission.slug!))?.body).toBe(
      "Isi versi pertama.",
    );

    const updated = await getStore().updateRevision(revision.id, author.id, {
      title: "Judul versi kedua (diperbaiki)",
      summary: base.summary,
      category: base.category,
      body: "Isi versi kedua dengan sumber.",
      bodyJson: revisionDoc,
      references: "https://ojk.go.id",
    });

    expect(updated?.status).toBe("pending");
    expect(updated?.reviewNote).toBeNull();
    expect(updated?.references).toBe("https://ojk.go.id");

    expect((await getStore().findPublishedArticle(submission.slug!))?.body).toBe(
      "Isi versi pertama.",
    );
  });

  it("penulis lain tidak dapat memperbarui revisi (cegah IDOR)", async () => {
    const { author, submission } = await setup();
    const other = await getStore().createUser({
      email: "lain@contoh.test",
      displayName: "Pengguna Lain",
      passwordHash: "x",
    });

    const revision = await getStore().createRevision(
      newRevisionInput(author.id, submission.id),
    );

    const hijacked = await getStore().updateRevision(revision.id, other.id, {
      title: "Diambil alih",
      summary: base.summary,
      category: base.category,
      body: "Isi jahat.",
      references: null,
    });

    expect(hijacked).toBeNull();
    expect((await getStore().findRevision(revision.id))?.title).toBe(
      "Judul versi kedua",
    );
  });

  it("revisi tidak dapat diterbitkan dua kali", async () => {
    const { author, submission } = await setup();

    const revision = await getStore().createRevision(
      newRevisionInput(author.id, submission.id),
    );

    const first = await getStore().publishRevision({
      revisionId: revision.id,
      reviewerId: author.id,
      note: null,
    });
    const second = await getStore().publishRevision({
      revisionId: revision.id,
      reviewerId: author.id,
      note: null,
    });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("revisi untuk artikel yang tidak lagi terbit tidak diterbitkan", async () => {
    const { author, submission } = await setup();

    const revision = await getStore().createRevision(
      newRevisionInput(author.id, submission.id),
    );

    await getStore().reviewSubmission({
      id: submission.id,
      status: "rejected",
      note: "Ditarik.",
      reviewerId: author.id,
      reviewerName: "Admin",
      slug: null,
    });

    const published = await getStore().publishRevision({
      revisionId: revision.id,
      reviewerId: author.id,
      note: null,
    });

    expect(published).toBeNull();
    expect((await getStore().findRevision(revision.id))?.status).toBe("pending");
  });
});

