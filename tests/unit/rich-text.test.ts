import { describe, expect, it } from "vitest";
import {
  EMPTY_RICH_DOC,
  RICH_TEXT_LIMITS,
  countRichTextCharacters,

  isRichDocEmpty,
  normalizeUserHref,

  parseRichDoc,
  plainTextToRichDoc,
  readRichDoc,
  richDocToPlainText,
  sanitizeImageSrc,
  sanitizeHttpsUrl,
  sanitizeLinkHref,
  type RichDoc,
} from "@/lib/content/rich-text";

const doc = (content: unknown[]): unknown => ({ type: "doc", content });

const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

describe("sanitizeLinkHref", () => {
  it("menerima http dan https", () => {
    expect(sanitizeLinkHref("https://ojk.go.id/edukasi")).toBe(
      "https://ojk.go.id/edukasi",
    );
    expect(sanitizeLinkHref("http://contoh.test/a")).toBe("http://contoh.test/a");
  });

  it("menerima mailto", () => {
    expect(sanitizeLinkHref("mailto:halo@contoh.test")).toMatch(/^mailto:/);
  });

  it("menolak javascript:", () => {
    expect(sanitizeLinkHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeLinkHref("JavaScript:alert(document.cookie)")).toBeNull();
  });

  it("menolak data:, vbscript:, dan file:", () => {
    expect(sanitizeLinkHref("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(sanitizeLinkHref("vbscript:msgbox(1)")).toBeNull();
    expect(sanitizeLinkHref("file:///etc/passwd")).toBeNull();
  });

  it("menolak penyamaran protokol memakai karakter kontrol", () => {
    expect(sanitizeLinkHref("java\nscript:alert(1)")).toBeNull();
    expect(sanitizeLinkHref("java\tscript:alert(1)")).toBeNull();
    expect(sanitizeLinkHref(" javascript:alert(1)")).toBeNull();
  });

  it("menolak URL relatif dan protocol-relative", () => {
    expect(sanitizeLinkHref("/beranda")).toBeNull();
    expect(sanitizeLinkHref("//evil.test/login")).toBeNull();
    expect(sanitizeLinkHref("evil.test")).toBeNull();
  });

  it("menolak URL yang menyembunyikan kredensial", () => {
    expect(sanitizeLinkHref("https://user:pass@evil.test/")).toBeNull();
  });

  it("menolak URL kepanjangan dan nilai bukan string", () => {
    expect(
      sanitizeLinkHref(
        `https://contoh.test/${"a".repeat(RICH_TEXT_LIMITS.maxHrefLength)}`,
      ),
    ).toBeNull();
    expect(sanitizeLinkHref(undefined)).toBeNull();
    expect(sanitizeLinkHref(42)).toBeNull();
  });
});

describe("normalizeUserHref", () => {
  it("menambahkan https:// bila pengguna tidak menulis protokol", () => {
    expect(normalizeUserHref("ojk.go.id/edukasi")).toBe(
      "https://ojk.go.id/edukasi",
    );
  });

  it("tetap menolak protokol berbahaya yang ditulis lengkap", () => {
    expect(normalizeUserHref("javascript:alert(1)")).toBeNull();
  });

  it("mengembalikan null untuk input kosong", () => {
    expect(normalizeUserHref("   ")).toBeNull();
  });
});

describe("parseRichDoc", () => {
  it("menerima dokumen yang hanya memakai node dan mark yang diizinkan", () => {
    const result = parseRichDoc(
      doc([
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Judul" }],
        },
        paragraph("Teks tebal"),
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [paragraph("Butir satu")] },
            { type: "listItem", content: [paragraph("Butir dua")] },
          ],
        },
        { type: "horizontalRule" },
      ]),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc.content).toHaveLength(4);
  });

  it("menyimpan mark yang diizinkan dan membuang mark duplikat", () => {
    const result = parseRichDoc(
      doc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Halo",
              marks: [
                { type: "bold" },
                { type: "bold" },
                { type: "italic" },
                { type: "underline" },
              ],
            },
          ],
        },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const marks = result.doc.content[0].content?.[0].marks ?? [];
    expect(marks.map((m) => m.type)).toEqual(["bold", "italic", "underline"]);
  });

  it("hanya menyimpan href pada mark link, membuang target/rel/class dari klien", () => {
    const result = parseRichDoc(
      doc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Sumber",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "https://ojk.go.id",
                    target: "_self",
                    rel: "opener",
                    class: "x",
                  },
                },
              ],
            },
          ],
        },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const attrs = result.doc.content[0].content?.[0].marks?.[0].attrs;
    expect(attrs).toEqual({ href: "https://ojk.go.id/" });
  });

  it("menolak tautan javascript di dalam dokumen", () => {
    const result = parseRichDoc(
      doc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Klik",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ]),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak node di luar allowlist", () => {
    for (const type of ["codeBlock", "image", "iframe", "script", "table"]) {
      expect(parseRichDoc(doc([{ type }])).ok).toBe(false);
    }
  });

  it("menolak mark di luar allowlist", () => {
    const result = parseRichDoc(
      doc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "textStyle", attrs: { color: "red" } }],
            },
          ],
        },
      ]),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak atribut heading di luar tingkat 2 dan 3", () => {
    for (const level of [1, 4, 5, 6, "2", undefined]) {
      const result = parseRichDoc(
        doc([
          {
            type: "heading",
            attrs: { level },
            content: [{ type: "text", text: "x" }],
          },
        ]),
      );
      expect(result.ok).toBe(false);
    }
  });  it("menolak struktur yang bukan dokumen", () => {
    expect(parseRichDoc(null).ok).toBe(false);
    expect(parseRichDoc([]).ok).toBe(false);
    expect(parseRichDoc({ type: "paragraph" }).ok).toBe(false);
    expect(parseRichDoc({ type: "doc", content: "teks" }).ok).toBe(false);
    expect(parseRichDoc({ type: "doc", content: ["bukan objek"] }).ok).toBe(false);
    expect(parseRichDoc(doc([{ type: "text" }])).ok).toBe(false);
  });

  it("menerima dokumen kosong secara struktur", () => {
    expect(parseRichDoc({ type: "doc", content: [] }).ok).toBe(true);
  });

  it("membatasi kedalaman dan jumlah node", () => {
    let deep: Record<string, unknown> = { type: "text", text: "x" };
    for (let i = 0; i < 12; i += 1) {
      deep = { type: "paragraph", content: [deep] };
    }
    expect(parseRichDoc(doc([deep])).ok).toBe(false);

    const many = Array.from({ length: RICH_TEXT_LIMITS.maxNodes + 10 }, () => ({
      type: "paragraph",
      content: [{ type: "text", text: "a" }],
    }));
    expect(parseRichDoc(doc(many)).ok).toBe(false);
  });
});

describe("readRichDoc", () => {
  it("mengembalikan null untuk data database yang tidak valid", () => {
    expect(readRichDoc(null)).toBeNull();
    expect(
      readRichDoc({ type: "doc", content: [{ type: "iframe" }] }),
    ).toBeNull();
  });

  it("mengembalikan dokumen untuk data yang valid", () => {
    expect(readRichDoc(doc([paragraph("aman")]))?.content).toHaveLength(1);
  });
});

describe("richDocToPlainText", () => {
  it("menggabungkan blok dengan baris baru dan memangkas spasi tepi", () => {
    const text = richDocToPlainText({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Judul" }],
        },
        paragraph("Paragraf pertama."),
        paragraph("Paragraf kedua."),
      ],
    });

    expect(text).toBe("Judul\nParagraf pertama.\nParagraf kedua.");
  });

  it("memisahkan butir daftar menjadi baris sendiri", () => {
    const text = richDocToPlainText({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [paragraph("Satu")] },
            { type: "listItem", content: [paragraph("Dua")] },
          ],
        },
      ],
    });

    expect(text.split("\n").filter(Boolean)).toEqual(["Satu", "Dua"]);
  });

  it("mengembalikan string kosong untuk dokumen kosong", () => {
    expect(richDocToPlainText(EMPTY_RICH_DOC)).toBe("");
    expect(richDocToPlainText(null)).toBe("");
  });
});

describe("Aturan panjang isi artikel", () => {
  const build = (length: number): RichDoc => ({
    type: "doc",
    content: [paragraph("a".repeat(length))],
  });

  it("menghitung karakter dari isi, bukan markup", () => {
    expect(countRichTextCharacters(build(350))).toBe(350);
  });

  it("menganggap markup kosong sebagai artikel kosong", () => {
    const emptyParagraphs: RichDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [] },
        { type: "paragraph", content: [] },
      ],
    };

    expect(isRichDocEmpty(emptyParagraphs)).toBe(true);
    expect(isRichDocEmpty(build(300))).toBe(false);
  });

  it("memakai ambang yang sama dengan aturan lama", () => {
    expect(RICH_TEXT_LIMITS.minCharacters).toBe(300);
    expect(RICH_TEXT_LIMITS.maxCharacters).toBe(12000);
  });
});

describe("plainTextToRichDoc", () => {
  it("mengubah teks biasa lama menjadi paragraf agar bisa diedit", () => {
    const doc = plainTextToRichDoc("Paragraf pertama.\n\nParagraf kedua.");

    expect(doc.content).toHaveLength(2);
    expect(doc.content[0].content?.[0].text).toBe("Paragraf pertama.");
    expect(richDocToPlainText(doc)).toBe("Paragraf pertama.\nParagraf kedua.");
  });

  it("mengembalikan dokumen kosong untuk teks kosong", () => {
    expect(plainTextToRichDoc("   ")).toEqual(EMPTY_RICH_DOC);
  });

  it("menghasilkan dokumen yang lolos validasi server", () => {
    const doc = plainTextToRichDoc("a".repeat(400));
    expect(parseRichDoc(doc).ok).toBe(true);
    expect(countRichTextCharacters(doc)).toBe(400);
  });
});

describe("sanitizeHttpsUrl", () => {
  it("menerima URL HTTPS apa pun tanpa daftar host", () => {
    for (const url of [
      "https://i.imgur.com/L0pP68gl.jpg",
      "https://contoh.test/gambar/12345",
      "https://sub.domain.contoh.test/a/b?c=1",
    ]) {
      expect(sanitizeHttpsUrl(url)).not.toBeNull();
    }
  });

  it("menolak protokol selain HTTPS", () => {
    expect(sanitizeHttpsUrl("http://contoh.test/foto.jpg")).toBeNull();
    expect(sanitizeHttpsUrl("ftp://contoh.test/foto.jpg")).toBeNull();
    expect(sanitizeHttpsUrl("javascript:alert(1)")).toBeNull();
  });

  it("menolak kredensial di dalam URL", () => {
    expect(sanitizeHttpsUrl("https://u:p@contoh.test/x")).toBeNull();
  });
});

describe("sanitizeImageSrc", () => {
  it("menerima URL gambar HTTPS dari hosting mana pun", () => {
    for (const url of [
      "https://i.imgur.com/L0pP68gl.jpg",
      "https://i.postimg.cc/abcd1234/foto.jpg",
      "https://i.ibb.co/abcd1234/foto.png",
      "https://images2.imgbox.com/aa/bb/foto.jpeg",
      "https://contoh.test/galeri/foto.webp",
      // Tanpa ekstensi: layanan CDN sering menyajikan gambar dari path polos.
      "https://cdn.contoh.test/gambar/12345",
      "https://contoh.test/foto.avif",
    ]) {
      expect(sanitizeImageSrc(url)).not.toBeNull();
    }
  });

  it("menolak HTTP biasa (wajib HTTPS)", () => {
    expect(sanitizeImageSrc("http://i.imgur.com/L0pP68gl.jpg")).toBeNull();
  });

  it("menolak data:, blob:, javascript:, dan file:", () => {
    expect(sanitizeImageSrc("data:image/png;base64,AAAA")).toBeNull();
    expect(sanitizeImageSrc("blob:https://saring.test/1234")).toBeNull();
    expect(sanitizeImageSrc("javascript:alert(1)//.jpg")).toBeNull();
    expect(sanitizeImageSrc("file:///C:/foto.jpg")).toBeNull();
  });

  it("menolak URL dengan kredensial", () => {
    expect(sanitizeImageSrc("https://user:pass@contoh.test/foto.jpg")).toBeNull();
  });

  it("menolak halaman galeri provider yang dikenal", () => {
    expect(sanitizeImageSrc("https://imgur.com/a/l4mKcOj")).toBeNull();
    expect(sanitizeImageSrc("https://postimg.cc/abcd1234")).toBeNull();
    expect(sanitizeImageSrc("https://imgbox.com/abcd1234")).toBeNull();
    expect(sanitizeImageSrc("https://ibb.co/abcd1234")).toBeNull();
  });

  it("menolak karakter kontrol dan nilai bukan string", () => {
    expect(sanitizeImageSrc("https://contoh.test/fo\nto.jpg")).toBeNull();
    expect(sanitizeImageSrc(undefined)).toBeNull();
    expect(sanitizeImageSrc(42)).toBeNull();
  });
});


describe("parseRichDoc: node media", () => {
  const imageNode = (attrs: Record<string, unknown>) => ({ type: "image", attrs });

  it("menerima gambar lintas hosting dan embed yang valid", () => {
    const result = parseRichDoc(
      doc([
        paragraph("Teks pembuka."),
        imageNode({
          src: "https://i.postimg.cc/abcd1234/foto.jpg",
          alt: "Contoh gambar",
        }),
        imageNode({ src: "https://i.ibb.co/abcd1234/foto.png" }),
        { type: "mediaEmbed", attrs: { provider: "imgur", id: "l4mKcOj" } },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.content.map((node) => node.type)).toEqual([
      "paragraph",
      "image",
      "image",
      "mediaEmbed",
    ]);
    expect(result.doc.content[3].attrs).toEqual({
      provider: "imgur",
      id: "l4mKcOj",
    });
  });

  it("menormalkan node lama imgurEmbed menjadi mediaEmbed", () => {
    const result = parseRichDoc(
      doc([{ type: "imgurEmbed", attrs: { id: "l4mKcOj", kind: "album" } }]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.content[0].type).toBe("mediaEmbed");
    expect(result.doc.content[0].attrs).toEqual({
      provider: "imgur",
      id: "l4mKcOj",
    });
  });

  it("mengubah imgurEmbed kind=image lama menjadi node gambar", () => {
    const result = parseRichDoc(
      doc([{ type: "imgurEmbed", attrs: { id: "L0pP68gl", kind: "image" } }]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.content[0]).toEqual({
      type: "image",
      attrs: { src: "https://i.imgur.com/L0pP68gl.jpg", alt: "" },
    });
  });

  it("membuang atribut gambar di luar allowlist", () => {
    const result = parseRichDoc(
      doc([
        imageNode({
          src: "https://i.imgur.com/L0pP68gl.jpg",
          alt: "x",
          title: "judul",
          width: 999,
          onerror: "alert(1)",
          class: "jahat",
        }),
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.content[0].attrs).toEqual({
      src: "https://i.imgur.com/L0pP68gl.jpg",
      alt: "x",
    });
  });

  it("menolak gambar dengan sumber tidak aman", () => {
    for (const src of [
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "blob:https://saring.test/1",
      "http://i.imgur.com/L0pP68gl.jpg",
      "https://imgur.com/a/l4mKcOj",
      "",
      undefined,
    ]) {
      expect(parseRichDoc(doc([imageNode({ src })])).ok).toBe(false);
    }
  });

  it("menolak embed dengan provider atau id tidak valid", () => {
    const invalid = [
      { provider: "evil", id: "l4mKcOj" },
      { provider: "imgur", id: "ab" },
      { provider: "imgur", id: "<script>" },
      { provider: "imgur" },
    ];

    for (const attrs of invalid) {
      expect(parseRichDoc(doc([{ type: "mediaEmbed", attrs }])).ok).toBe(false);
    }
  });

  it("membuang atribut tambahan pada embed (mis. src/script dari klien)", () => {
    const result = parseRichDoc(
      doc([
        {
          type: "mediaEmbed",
          attrs: {
            provider: "imgur",
            id: "l4mKcOj",
            src: "https://evil.test/iframe",
            script: "alert(1)",
          },
        },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.content[0].attrs).toEqual({
      provider: "imgur",
      id: "l4mKcOj",
    });
  });

  it("membatasi jumlah media per artikel", () => {
    const many = Array.from({ length: RICH_TEXT_LIMITS.maxMediaNodes + 1 }, () =>
      imageNode({ src: "https://i.imgur.com/L0pP68gl.jpg" }),
    );

    expect(parseRichDoc(doc(many)).ok).toBe(false);
  });

  it("tidak menghitung media sebagai karakter isi", () => {
    const withImage: RichDoc = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://i.imgur.com/L0pP68gl.jpg" } },
      ],
    };

    expect(countRichTextCharacters(withImage)).toBe(0);
    expect(isRichDocEmpty(withImage)).toBe(true);
  });
});

