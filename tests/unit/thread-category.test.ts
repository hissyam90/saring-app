import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";
import {
  DEFAULT_THREAD_CATEGORY,
  THREAD_CATEGORIES,
  threadCategoryLabel,
} from "@/lib/db/types";
import { threadSchema, firstError } from "@/lib/security/validation";

/**
 * Kategori pertanyaan "Lainnya".
 *
 * Wajib: menjadi default untuk pertanyaan baru, diterima validasi server, dapat
 * disimpan, dan dapat difilter. Kategori pertanyaan lama tidak diubah otomatis
 * (tidak ada UPDATE massal di migration).
 */

const validThread = {
  title: "Pertanyaan tentang pesan yang mencurigakan",
  body: "Isi pertanyaan yang cukup panjang untuk lolos validasi minimal tiga puluh karakter.",
  captchaToken: "token",
};

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  __resetMemoryStore();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Kategori pertanyaan", () => {
  it("menyediakan Lainnya dan menjadikannya default", () => {
    expect(DEFAULT_THREAD_CATEGORY).toBe("lainnya");
    expect(THREAD_CATEGORIES.map((c) => c.id)).toContain("lainnya");
    expect(threadCategoryLabel("lainnya")).toBe("Lainnya");
  });

  it("mempertahankan semua kategori lama", () => {
    const ids = THREAD_CATEGORIES.map((c) => c.id);
    for (const id of ["phishing", "transaksi", "lowongan", "penyamaran", "akun"]) {
      expect(ids).toContain(id);
    }
  });

  it("validasi server menerima kategori lainnya", () => {
    const parsed = threadSchema.safeParse({ ...validThread, category: "lainnya" });
    expect(parsed.success).toBe(true);
  });

  it("validasi server menolak kategori di luar daftar", () => {
    const parsed = threadSchema.safeParse({ ...validThread, category: "penipuan-barU" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(firstError(parsed.error)).toMatch(/kategori/i);
    }
  });

  it("pertanyaan tersimpan dengan kategori lainnya dan dapat difilter", async () => {
    const author = await getStore().createUser({
      email: "kategori@contoh.test",
      displayName: "Penanya",
      passwordHash: "x",
    });

    await getStore().createThread({
      authorId: author.id,
      title: "Pertanyaan kategori lainnya",
      category: "lainnya",
      body: "Isi pertanyaan yang cukup panjang untuk lolos validasi.",
      articleSlug: null,
    });
    await getStore().createThread({
      authorId: author.id,
      title: "Pertanyaan kategori phishing",
      category: "phishing",
      body: "Isi pertanyaan lain yang cukup panjang untuk lolos validasi.",
      articleSlug: null,
    });

    const filtered = await getStore().listThreads({
      category: "lainnya",
      page: 1,
      pageSize: 10,
    });

    expect(filtered.total).toBe(1);
    expect(filtered.items[0].title).toBe("Pertanyaan kategori lainnya");
    expect(filtered.items[0].category).toBe("lainnya");
  });

  it("filter kategori lain tidak terpengaruh kategori baru", async () => {
    const author = await getStore().createUser({
      email: "kategori2@contoh.test",
      displayName: "Penanya",
      passwordHash: "x",
    });

    await getStore().createThread({
      authorId: author.id,
      title: "Pertanyaan phishing",
      category: "phishing",
      body: "Isi pertanyaan yang cukup panjang untuk lolos validasi.",
      articleSlug: null,
    });

    const filtered = await getStore().listThreads({
      category: "phishing",
      page: 1,
      pageSize: 10,
    });

    expect(filtered.total).toBe(1);
    expect(filtered.items[0].category).toBe("phishing");
  });
});
