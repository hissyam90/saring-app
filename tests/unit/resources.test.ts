import { describe, expect, it } from "vitest";
import { LIBRARY, ARTICLE_CATEGORIES, readingMinutes } from "@/data/resources";

describe("Pustaka: data artikel", () => {
  it("menyediakan sedikitnya 12 artikel dengan slug unik", () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(12);
    const ids = new Set(LIBRARY.map((a) => a.id));
    expect(ids.size).toBe(LIBRARY.length);
  });

  it("setiap artikel punya kategori yang valid dan ringkasan", () => {
    for (const article of LIBRARY) {
      expect(ARTICLE_CATEGORIES).toContain(article.category);
      expect(article.summary.length).toBeGreaterThan(40);
      expect(article.title.length).toBeGreaterThan(10);
    }
  });

  it("setiap artikel punya isi substantif", () => {
    for (const article of LIBRARY) {
      expect(article.sections.length, article.id).toBeGreaterThanOrEqual(4);
      // Hitung seluruh teks artikel, termasuk sorotan, karena itu bagian dari isi.
      const words = article.sections
        .flatMap((s) => [s.body, ...(s.bullets ?? []), s.callout ?? ""])
        .join(" ")
        .split(/\s+/)
        .filter(Boolean).length;
      expect(words, article.id).toBeGreaterThan(250);
    }
  });

  it("estimasi waktu baca dihitung dari panjang isi", () => {
    for (const article of LIBRARY) {
      const minutes = readingMinutes(article);
      expect(minutes).toBeGreaterThanOrEqual(1);
      expect(minutes).toBeLessThanOrEqual(10);
    }

    // Waktu baca harus mengikuti panjang teks, bukan angka tetap.
    const base = LIBRARY[0];
    const short = { ...base, sections: base.sections.slice(0, 1) };
    const long = {
      ...base,
      sections: Array.from({ length: 10 }, (_, i) => ({
        ...base.sections[0],
        heading: `${base.sections[0].heading} ${i}`,
      })),
    };
    expect(readingMinutes(long)).toBeGreaterThan(readingMinutes(short));
  });

  it("semua tautan terkait menunjuk artikel yang ada", () => {
    const ids = new Set(LIBRARY.map((a) => a.id));
    for (const article of LIBRARY) {
      for (const related of article.related ?? []) {
        expect(ids.has(related), `${article.id} -> ${related}`).toBe(true);
      }
    }
  });

  it("semua sumber memakai URL https resmi", () => {
    for (const article of LIBRARY) {
      for (const source of article.sources ?? []) {
        expect(source.url.startsWith("https://"), source.url).toBe(true);
        expect(source.label.length).toBeGreaterThan(5);
      }
    }
  });

  it("mencakup seluruh kategori yang dideklarasikan", () => {
    const used = new Set(LIBRARY.map((a) => a.category));
    for (const category of ARTICLE_CATEGORIES) {
      expect(used.has(category), category).toBe(true);
    }
  });
});