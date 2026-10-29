import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";
import type { RichDoc } from "@/lib/content/rich-text";

/**
 * Kontrak penyimpanan konten kaya.
 *
 * Diuji pada level store karena di sinilah format harus bertahan setelah
 * disimpan, dimuat ulang, dan diterbitkan. Implementasi PostgreSQL dan memory
 * memakai kontrak yang sama (interface `Store`), sehingga perilaku yang diuji
 * di sini berlaku untuk keduanya.
 */

const richDoc: RichDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Judul bagian" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Teks ", marks: [{ type: "bold" }] },
        { type: "text", text: "miring", marks: [{ type: "italic" }] },
        {
          type: "text",
          text: " tautan",
          marks: [{ type: "link", attrs: { href: "https://ojk.go.id/" } }],
        },
      ],
    },
    {
      type: "orderedList",
      content: [
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Langkah satu" }] },
          ],
        },
      ],
    },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Catatan" }] }] },
    { type: "horizontalRule" },
  ],
};

const baseInput = {
  title: "Artikel dengan format lengkap",
  summary:
    "Ringkasan artikel yang cukup panjang untuk lolos validasi isi pengajuan.",
  category: "Phishing",
  body: "Judul bagian\nTeks miring tautan\nLangkah satu\nCatatan",
  references: null,
};

async function author() {
  return getStore().createUser({
    email: "penulis@contoh.test",
    displayName: "Penulis",
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

describe("Penyimpanan konten kaya", () => {
  it("menyimpan dokumen apa adanya dan mengembalikannya saat dibaca ulang", async () => {
    const user = await author();

    const created = await getStore().createSubmission({
      authorId: user.id,
      ...baseInput,
      bodyJson: richDoc,
    });

    const reloaded = await getStore().findSubmission(created.id);

    expect(reloaded?.bodyJson).toEqual(richDoc);
    expect(reloaded?.body).toBe(baseInput.body);
  });

  it("mempertahankan format setelah artikel disetujui dan terbit di Pustaka", async () => {
    const user = await author();

    const created = await getStore().createSubmission({
      authorId: user.id,
      ...baseInput,
      bodyJson: richDoc,
    });

    await getStore().reviewSubmission({
      id: created.id,
      status: "approved",
      note: null,
      reviewerId: user.id,
      reviewerName: "Admin",
      slug: baseInput.title,
    });

    const published = await getStore().findPublishedArticle(
      "artikel-dengan-format-lengkap",
    );

    expect(published).not.toBeNull();
    expect(published?.bodyJson).toEqual(richDoc);
    // Format wajib masih ada: heading, mark, list, kutipan, garis pemisah.
    const types = published?.bodyJson?.content.map((node) => node.type);
    expect(types).toEqual([
      "heading",
      "paragraph",
      "orderedList",
      "blockquote",
      "horizontalRule",
    ]);
  });

  it("mempertahankan artikel lama yang hanya berupa teks biasa", async () => {
    const user = await author();

    const created = await getStore().createSubmission({
      authorId: user.id,
      ...baseInput,
      // Tanpa bodyJson: mensimulasikan baris lama sebelum migration 0002.
    });

    const reloaded = await getStore().findSubmission(created.id);

    expect(reloaded?.bodyJson).toBeNull();
    expect(reloaded?.body).toBe(baseInput.body);
  });

  it("memperbarui dokumen dan menghapus format saat pengajuan masih dapat diubah", async () => {
    const user = await author();

    const created = await getStore().createSubmission({
      authorId: user.id,
      ...baseInput,
      bodyJson: richDoc,
    });

    const plainOnly: RichDoc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hanya teks biasa." }] }],
    };

    const updated = await getStore().updateSubmission(created.id, user.id, {
      title: baseInput.title,
      summary: baseInput.summary,
      category: baseInput.category,
      body: "Hanya teks biasa.",
      bodyJson: plainOnly,
      references: null,
    });

    expect(updated?.bodyJson).toEqual(plainOnly);
    expect(updated?.status).toBe("pending");
  });

  it("menolak dokumen yang tersimpan rusak saat dibaca (fallback ke teks biasa)", async () => {
    // Simulasi data yang diubah di luar aplikasi.
    const user = await author();
    const created = await getStore().createSubmission({
      authorId: user.id,
      ...baseInput,
      bodyJson: { type: "doc", content: [{ type: "script" }] } as unknown as RichDoc,
    });

    const reloaded = await getStore().findSubmission(created.id);

    expect(reloaded?.bodyJson).toBeNull();
    expect(reloaded?.body).toBe(baseInput.body);
  });
});
