import { describe, expect, it } from "vitest";
import {
  classifyUrl,
  extractUrlFromMarkup,
  isGalleryPage,
  isValidMediaId,
  mediaEmbedUrl,
  mediaPageUrl,
  resolveMediaInput,
} from "@/lib/content/media";

/**
 * Adapter media harus mengenali perbedaan tiga hal:
 * hyperlink biasa, berkas gambar langsung, dan halaman galeri yang butuh
 * representasi embed sendiri.
 */

describe("classifyUrl", () => {
  it("mengenali URL album Imgur sebagai embed", () => {
    expect(classifyUrl("https://imgur.com/a/l4mKcOj")).toEqual({
      kind: "embed",
      provider: "imgur",
      id: "l4mKcOj",
      pageUrl: "https://imgur.com/a/l4mKcOj",
    });
    expect(classifyUrl("https://imgur.com/gallery/ALc9tWx")).toEqual({
      kind: "embed",
      provider: "imgur",
      id: "ALc9tWx",
      pageUrl: "https://imgur.com/a/ALc9tWx",
    });
  });

  it("mengubah postingan Imgur tunggal menjadi berkas gambar", () => {
    expect(classifyUrl("https://imgur.com/L0pP68gl")).toEqual({
      kind: "image",
      src: "https://i.imgur.com/L0pP68gl.jpg",
    });
  });

  it("menerima berkas gambar langsung dari beberapa CDN", () => {
    for (const url of [
      "https://i.imgur.com/L0pP68gl.jpg",
      "https://i.postimg.cc/abcd1234/foto.jpg",
      "https://i.ibb.co/abcd1234/foto.png",
      "https://images2.imgbox.com/aa/bb/foto.webp",
    ]) {
      expect(classifyUrl(url)).toEqual({ kind: "image", src: url });
    }
  });

  it("menerima berkas gambar dari host HTTPS lain tanpa ekstensi", () => {
    expect(classifyUrl("https://cdn.contoh.test/gambar/12345")).toEqual({
      kind: "image",
      src: "https://cdn.contoh.test/gambar/12345",
    });
  });

  it("menandai halaman galeri provider sebagai gallery-page", () => {
    for (const url of [
      "https://postimg.cc/abcd1234",
      "https://imgbox.com/abcd1234",
      "https://ibb.co/abcd1234",
    ]) {
      expect(classifyUrl(url)?.kind).toBe("gallery-page");
    }
  });

  it("menolak host yang menyerupai provider (anti domain palsu)", () => {
    for (const url of [
      "https://imgur.com.evil.test/a/l4mKcOj",
      "https://fake-ibb.co/abcd1234",
      "https://imgur-cdn.test/foto.jpg",
    ]) {
      expect(classifyUrl(url)?.kind).toBe("gallery-page");
    }
  });

  it("menolak protokol non-HTTPS dan URL berkredensial", () => {
    expect(classifyUrl("http://i.imgur.com/L0pP68gl.jpg")).toBeNull();
    expect(classifyUrl("javascript:alert(1)")).toBeNull();
    expect(classifyUrl("data:image/png;base64,AAAA")).toBeNull();
    expect(classifyUrl("https://u:p@i.imgur.com/L0pP68gl.jpg")).toBeNull();
  });
});

describe("extractUrlFromMarkup", () => {
  it("mengambil src dari HTML <img>", () => {
    expect(
      extractUrlFromMarkup('<img src="https://i.ibb.co/a/foto.png" alt="x">'),
    ).toBe("https://i.ibb.co/a/foto.png");
  });

  it("mengambil URL dari BBCode [img]", () => {
    expect(
      extractUrlFromMarkup("[img]https://i.postimg.cc/a/foto.jpg[/img]"),
    ).toBe("https://i.postimg.cc/a/foto.jpg");
    expect(
      extractUrlFromMarkup("[img=800x600]https://i.ibb.co/a/foto.png[/img]"),
    ).toBe("https://i.ibb.co/a/foto.png");
  });

  it("mengambil data-id dari kode embed Imgur dan mengabaikan script", () => {
    const snippet = `<blockquote class="imgur-embed-pub" lang="en" data-id="a/l4mKcOj">
  <a href="//imgur.com/a/l4mKcOj">View post on imgur.com</a>
</blockquote>
<script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>`;

    const url = extractUrlFromMarkup(snippet);
    expect(url).toBe("https://imgur.com/a/l4mKcOj");
    expect(url).not.toContain("script");
  });

  it("mengembalikan null untuk data-id yang tidak valid", () => {
    expect(
      extractUrlFromMarkup('<blockquote class="imgur-embed-pub" data-id="../../etc"></blockquote>'),
    ).toBeNull();
  });
});

describe("resolveMediaInput", () => {
  it("menerima URL tanpa protokol", () => {
    expect(resolveMediaInput("imgur.com/a/l4mKcOj")).toMatchObject({
      kind: "embed",
      id: "l4mKcOj",
    });
  });

  it("mengembalikan petunjuk untuk halaman galeri yang tidak dapat di-embed", () => {
    const result = resolveMediaInput("https://postimg.cc/abcd1234");

    expect(result).toMatchObject({ kind: "unsupported" });
    if (result && result.kind === "unsupported") {
      expect(result.hint).toMatch(/Postimages|direct link/i);
    }
  });

  it("menolak input kosong, bukan string, dan markup berbahaya", () => {
    expect(resolveMediaInput("")).toBeNull();
    expect(resolveMediaInput(undefined)).toBeNull();
    expect(resolveMediaInput("<script>alert(1)</script>")).toBeNull();
  });
});

describe("helper embed", () => {
  it("membangun URL embed hanya untuk provider yang diverifikasi", () => {
    expect(mediaEmbedUrl("imgur", "l4mKcOj")).toBe(
      "https://imgur.com/a/l4mKcOj/embed?pub=true",
    );
    expect(mediaEmbedUrl("imgur", "bukan id!")).toBe("");
  });

  it("membangun URL halaman publik untuk fallback", () => {
    expect(mediaPageUrl("imgur", "l4mKcOj")).toBe("https://imgur.com/a/l4mKcOj");
  });

  it("memvalidasi id media", () => {
    expect(isValidMediaId("l4mKcOj")).toBe(true);
    expect(isValidMediaId("ab")).toBe(false);
    expect(isValidMediaId("<script>")).toBe(false);
    expect(isValidMediaId(null)).toBe(false);
  });

  it("mendeteksi halaman galeri", () => {
    expect(isGalleryPage("https://imgbox.com/abcd1234")).toBe(true);
    expect(isGalleryPage("https://i.ibb.co/abcd1234/foto.png")).toBe(false);
  });
});
