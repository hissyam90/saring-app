/**
 * Format konten artikel kaya untuk Saring.
 *
 * Sumber tunggal untuk tiga hal sekaligus:
 * 1. **Validasi** dokumen yang dikirim browser sebelum disimpan (allowlist ketat).
 * 2. **Proyeksi teks biasa** untuk kolom `submissions.body` (kompatibilitas lama,
 *    pencarian, dan pratinjau).
 * 3. **Bahan render** halaman publik, admin, dan pratinjau.
 *
 * Modul ini sengaja murni: tanpa React, tanpa DOM, tanpa akses jaringan. Dengan
 * begitu kode yang sama dipakai di server (route handler) dan di peramban
 * (editor, pratinjau), sehingga tidak ada dua aturan yang bisa menyimpang.
 *
 * Format tersimpan adalah **JSON Tiptap** yang sudah dinormalisasi, bukan HTML.
 * HTML tidak pernah disimpan dan tidak pernah dirender, sehingga tidak ada
 * permukaan XSS dari markup. Renderer tetap memeriksa ulang setiap tautan
 * (lapisan kedua) karena isi database tidak boleh dianggap tepercaya.
 */

export const RICH_TEXT_LIMITS = {
  /** Sama dengan aturan lama textarea: minimal 300 karakter. */
  minCharacters: 300,
  /** Sama dengan aturan lama textarea: maksimal 12000 karakter. */
  maxCharacters: 12_000,
  /** Batas jumlah node agar dokumen tidak bisa dibuat sangat besar. */
  maxNodes: 2_000,
  /** Kedalaman maksimum (doc → list → item → paragraph → text). */
  maxDepth: 6,
  /** Panjang maksimum satu node teks. */
  maxTextNodeLength: 20_000,
  /** Panjang maksimum URL tautan. */
  maxHrefLength: 2_048,
  /** Panjang maksimum teks alternatif gambar. */
  maxAltLength: 300,
  /** Jumlah maksimum media (gambar + embed) dalam satu artikel. */
  maxMediaNodes: 40,
} as const;

/** Node yang boleh disimpan dan dirender. */
const ALLOWED_NODES = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "horizontalRule",
  "hardBreak",
  "text",
  "image",
  "imgurEmbed",
]);

/** Mark (format teks) yang boleh disimpan dan dirender. */
const ALLOWED_MARKS = new Set([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
]);

/** Protokol tautan yang diizinkan. Selain ini ditolak. */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/** Node tingkat blok (dipisah baris saat diubah menjadi teks biasa). */
const BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "bulletList",
  "orderedList",
]);

export type RichMarkType =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "link";

export interface RichMark {
  type: RichMarkType;
  /** Hanya `link` yang punya atribut, dan hanya `href` yang disimpan. */
  attrs?: { href: string };
}

export interface RichNode {
  type: string;
  attrs?: {
    level?: 2 | 3;
    /** `image` */
    src?: string;
    alt?: string;
    /** `imgurEmbed` */
    id?: string;
    kind?: ImgurKind;
  };
  content?: RichNode[];
  marks?: RichMark[];
  text?: string;
}

/**
 * Jenis media Imgur yang didukung.
 *
 * - `album`: halaman album/galeri. Di-embed sebagai iframe resmi Imgur.
 * - `image`: satu postingan gambar. Halaman postingan Imgur mengirim
 *   `X-Frame-Options: DENY` sehingga **tidak** bisa di-iframe; dirender sebagai
 *   gambar langsung `https://i.imgur.com/{id}.jpg` yang sudah diverifikasi
 *   menyajikan berkas gambar aslinya.
 */
export type ImgurKind = "album" | "image";

/** Hasil parsing URL/kode embed Imgur. */
export interface ImgurEmbedRef {
  kind: ImgurKind;
  id: string;
}

export interface RichDoc {
  type: "doc";
  content: RichNode[];
}

export const EMPTY_RICH_DOC: RichDoc = { type: "doc", content: [] };

export type RichDocParseResult =
  | { ok: true; doc: RichDoc }
  | { ok: false; error: string };

class RichTextError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}


/**
 * Membersihkan dan memvalidasi URL tautan.
 *
 * Mengembalikan URL yang sudah dinormalisasi, atau `null` bila ditolak.
 * Yang ditolak antara lain `javascript:`, `data:`, `vbscript:`, `file:`, URL
 * relatif, karakter kontrol (dipakai untuk menyamarkan protokol), dan URL yang
 * menyembunyikan kredensial.
 */
export function sanitizeLinkHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (value.length === 0 || value.length > RICH_TEXT_LIMITS.maxHrefLength) {
    return null;
  }

  // Karakter kontrol dan spasi bisa dipakai mengelabui pemeriksaan protokol
  // (mis. "java\nscript:").
  if (/[\u0000-\u0020\u007f]/.test(value)) return null;

  let parsed: URL;
  try {
    // Tanpa base: URL relatif seperti "/beranda" atau "//evil.test" gagal diurai.
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
  if (parsed.username || parsed.password) return null;

  return parsed.toString();
}

/**
 * Mengubah input URL dari pengguna menjadi href yang aman.
 *
 * Menambahkan `https://` bila pengguna menulis tanpa protokol (mis.
 * "contoh.com"), lalu memvalidasi hasilnya. Mengembalikan `null` bila tetap
 * tidak aman.
 */
export function normalizeUserHref(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return null;
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
  return sanitizeLinkHref(hasScheme ? value : `https://${value}`);
}

/**
 * Ekstensi berkas gambar yang diizinkan untuk gambar langsung.
 *
 * SVG sengaja tidak diizinkan: walaupun `<img src>` tidak mengeksekusi script,
 * berkas SVG dapat memuat sumber daya eksternal dan tidak diperlukan untuk
 * artikel edukasi.
 */
const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
] as const;

/** Host Imgur yang dikenali untuk keperluan embed. */
const IMGUR_HOSTS = new Set([
  "imgur.com",
  "www.imgur.com",
  "m.imgur.com",
  "i.imgur.com",
]);

/** Id media Imgur: alfanumerik pendek (album maupun gambar). */
const IMGUR_ID = /^[A-Za-z0-9]{5,15}$/;

/**
 * Membersihkan dan memvalidasi URL gambar langsung.
 *
 * Hanya `https:` yang diterima (tidak ada mixed content dan tidak ada
 * `data:`/`blob:`/`javascript:`). Path harus berakhiran ekstensi gambar yang
 * diizinkan, sehingga URL halaman HTML tidak bisa dipakai sebagai "gambar".
 *
 * Fungsi ini **tidak** melakukan permintaan jaringan: mem-fetch URL arbitrer
 * dari server untuk menebak apakah sebuah URL adalah gambar tidak dilakukan.
 * Kegagalan muat ditangani oleh renderer (fallback tautan).
 */
export function sanitizeImageSrc(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (value.length === 0 || value.length > RICH_TEXT_LIMITS.maxHrefLength) {
    return null;
  }
  // Karakter kontrol/spasi dapat dipakai untuk mengelabui pemeriksaan protokol.
  if (/[\u0000-\u0020\u007f]/.test(value)) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;

  const path = parsed.pathname.toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext))) return null;

  return parsed.toString();
}

/** URL gambar langsung Imgur untuk satu postingan. */
export function imgurDirectImageUrl(id: string): string {
  return `https://i.imgur.com/${id}.jpg`;
}

/** Halaman publik Imgur (dipakai untuk tautan fallback yang aman). */
export function imgurPageUrl(ref: ImgurEmbedRef): string {
  return ref.kind === "album"
    ? `https://imgur.com/a/${ref.id}`
    : `https://imgur.com/${ref.id}`;
}

/**
 * URL iframe embed resmi Imgur untuk album.
 *
 * Diverifikasi manual: `https://imgur.com/a/{id}/embed?pub=true` tidak
 * mengirim `X-Frame-Options`, sedangkan halaman album biasa mengirim
 * `X-Frame-Options: DENY`. Hanya bentuk ini yang boleh menjadi `src` iframe.
 */
export function imgurEmbedUrl(id: string): string {
  return `https://imgur.com/a/${id}/embed?pub=true`;
}

function imgurRefFromPath(pathname: string): ImgurEmbedRef | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  // /a/{id} atau /gallery/{id} (+ segmen opsional seperti /embed)
  if (
    (segments[0] === "a" || segments[0] === "gallery") &&
    segments.length >= 2
  ) {
    const id = segments[1];
    return IMGUR_ID.test(id) ? { kind: "album", id } : null;
  }

  // /{id}
  const id = segments[0];
  return IMGUR_ID.test(id) ? { kind: "image", id } : null;
}

/**
 * Mengurai URL Imgur atau kode embed resmi menjadi referensi media.
 *
 * Menerima:
 * - `https://imgur.com/a/{id}` dan `https://imgur.com/gallery/{id}` → album
 * - `https://imgur.com/a/{id}/embed?pub=true` → album (dinormalisasi)
 * - `https://imgur.com/{id}` → satu gambar
 * - kode embed resmi:
 *   `<blockquote class="imgur-embed-pub" data-id="a/{id}">…</blockquote><script …>`
 *
 * **Script di dalam snippet tidak pernah disimpan atau dijalankan.** Yang
 * diambil hanya `data-id` (atau `href` pada anchor di dalam blockquote) yang
 * sudah divalidasi terhadap pola id Imgur.
 */
export function parseImgurEmbed(raw: unknown): ImgurEmbedRef | null {
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (value.length === 0 || value.length > 4_000) return null;

  // 1) Kode embed resmi: ambil data-id lebih dulu, lalu href di dalamnya.
  if (/imgur-embed-pub|data-id|<blockquote|<iframe/i.test(value)) {
    const dataId = value.match(/data-id\s*=\s*["']([^"']+)["']/i)?.[1];
    if (dataId) {
      const cleaned = dataId.trim().replace(/^a\//i, "");
      if (IMGUR_ID.test(cleaned)) {
        // `data-id="a/{id}"` menandakan album; tanpa prefiks = satu gambar.
        return {
          kind: /^a\//i.test(dataId.trim()) ? "album" : "image",
          id: cleaned,
        };
      }
      return null;
    }

    const href = value.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) return parseImgurEmbed(href);

    const src = value.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) return parseImgurEmbed(src);

    return null;
  }

  // 2) URL biasa. Tambahkan https:// bila pengguna menulis tanpa protokol.
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
  const candidate = hasScheme ? value : `https://${value}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (parsed.username || parsed.password) return null;

  const host = parsed.hostname.toLowerCase();
  if (!IMGUR_HOSTS.has(host)) return null;

  // i.imgur.com/{id}.{ext} adalah gambar langsung, bukan embed.
  if (host === "i.imgur.com") return null;

  return imgurRefFromPath(parsed.pathname);
}

/** True bila teks yang ditempel hanya berupa satu URL gambar langsung. */
export function imageUrlFromPastedText(text: string): string | null {
  const value = text.trim();
  if (value.length === 0 || /\s/.test(value)) return null;
  return sanitizeImageSrc(value);
}

function normalizeMark(raw: unknown): RichMark {
  if (!isRecord(raw)) {
    throw new RichTextError("Format teks artikel tidak valid.");
  }

  const type = raw.type;
  if (typeof type !== "string" || !ALLOWED_MARKS.has(type)) {
    throw new RichTextError("Format teks artikel tidak didukung.");
  }

  if (type === "link") {
    const attrs = isRecord(raw.attrs) ? raw.attrs : {};
    const href = sanitizeLinkHref(attrs.href);
    if (!href) {
      throw new RichTextError(
        "Tautan pada artikel tidak valid. Gunakan alamat yang diawali https:// atau http://.",
      );
    }
    // `target` dan `rel` sengaja tidak disimpan: renderer yang menentukannya
    // agar tidak bisa dikendalikan dari input pengguna.
    return { type: "link", attrs: { href } };
  }

  return { type: type as RichMarkType };
}

function normalizeMarks(raw: unknown): RichMark[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length > 8) {
    throw new RichTextError("Format teks artikel tidak valid.");
  }

  const seen = new Set<string>();
  const marks: RichMark[] = [];
  for (const item of raw) {
    const mark = normalizeMark(item);
    if (seen.has(mark.type)) continue;
    seen.add(mark.type);
    marks.push(mark);
  }
  return marks.length > 0 ? marks : undefined;
}

function normalizeChildren(
  raw: unknown,
  depth: number,
  counter: { nodes: number; media: number },
): RichNode[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new RichTextError("Struktur artikel tidak valid.");
  }
  return raw.map((child) => normalizeNode(child, depth + 1, counter));
}

function normalizeNode(
  raw: unknown,
  depth: number,
  counter: { nodes: number; media: number },
): RichNode {
  if (depth > RICH_TEXT_LIMITS.maxDepth) {
    throw new RichTextError("Struktur artikel terlalu dalam.");
  }
  if (!isRecord(raw)) {
    throw new RichTextError("Struktur artikel tidak valid.");
  }

  const type = raw.type;
  if (typeof type !== "string" || !ALLOWED_NODES.has(type)) {
    throw new RichTextError("Elemen artikel tidak didukung.");
  }

  counter.nodes += 1;
  if (counter.nodes > RICH_TEXT_LIMITS.maxNodes) {
    throw new RichTextError("Artikel terlalu panjang untuk disimpan.");
  }

  if (type === "text") {
    if (typeof raw.text !== "string") {
      throw new RichTextError("Struktur teks artikel tidak valid.");
    }
    if (raw.text.length > RICH_TEXT_LIMITS.maxTextNodeLength) {
      throw new RichTextError("Bagian teks artikel terlalu panjang.");
    }
    const node: RichNode = { type: "text", text: raw.text };
    const marks = normalizeMarks(raw.marks);
    if (marks) node.marks = marks;
    return node;
  }

  if (type === "horizontalRule" || type === "hardBreak") {
    return { type };
  }

  if (type === "heading") {
    const level = isRecord(raw.attrs) ? raw.attrs.level : undefined;
    if (level !== 2 && level !== 3) {
      throw new RichTextError("Hanya judul tingkat 2 dan 3 yang didukung.");
    }
    return {
      type,
      attrs: { level },
      content: normalizeChildren(raw.content, depth, counter),
    };
  }

  // --- Media: gambar langsung ---------------------------------------------
  if (type === "image") {
    counter.media += 1;
    if (counter.media > RICH_TEXT_LIMITS.maxMediaNodes) {
      throw new RichTextError("Terlalu banyak media dalam satu artikel.");
    }

    const attrs = isRecord(raw.attrs) ? raw.attrs : {};
    const src = sanitizeImageSrc(attrs.src);
    if (!src) {
      throw new RichTextError(
        "URL gambar tidak valid. Gunakan tautan HTTPS yang berakhiran .jpg, .jpeg, .png, .gif, .webp, atau .avif.",
      );
    }

    const altRaw = attrs.alt;
    if (altRaw !== undefined && altRaw !== null && typeof altRaw !== "string") {
      throw new RichTextError("Teks alternatif gambar tidak valid.");
    }
    const alt = typeof altRaw === "string" ? altRaw.trim().slice(0, RICH_TEXT_LIMITS.maxAltLength) : "";

    // Hanya `src` dan `alt` yang disimpan; `title`, `width`, `height`, dan
    // atribut lain dari klien dibuang.
    return { type: "image", attrs: { src, alt } };
  }

  // --- Media: embed Imgur -------------------------------------------------
  if (type === "imgurEmbed") {
    counter.media += 1;
    if (counter.media > RICH_TEXT_LIMITS.maxMediaNodes) {
      throw new RichTextError("Terlalu banyak media dalam satu artikel.");
    }

    const attrs = isRecord(raw.attrs) ? raw.attrs : {};
    const kind = attrs.kind;
    const id = attrs.id;

    if (
      (kind !== "album" && kind !== "image") ||
      typeof id !== "string" ||
      !IMGUR_ID.test(id)
    ) {
      throw new RichTextError("Embed Imgur tidak valid.");
    }

    // Hanya id dan jenis yang disimpan. URL embed dihitung ulang oleh renderer
    // dari id, sehingga `src`/HTML dari klien tidak pernah dipakai.
    return { type: "imgurEmbed", attrs: { kind, id } };
  }

  return { type, content: normalizeChildren(raw.content, depth, counter) };
}

/**
 * Memvalidasi dokumen rich text dan mengembalikan salinan yang sudah
 * dinormalisasi: hanya node/mark/atribut yang diizinkan, tautan yang aman, dan
 * tanpa atribut tambahan dari klien.
 *
 * Dokumen kosong secara struktur tetap valid; pemeriksaan panjang isi
 * dilakukan terpisah lewat {@link countRichTextCharacters}.
 */
export function parseRichDoc(input: unknown): RichDocParseResult {
  try {
    if (!isRecord(input) || input.type !== "doc") {
      throw new RichTextError("Isi artikel tidak valid.");
    }
    if (input.content !== undefined && !Array.isArray(input.content)) {
      throw new RichTextError("Isi artikel tidak valid.");
    }

    const counter = { nodes: 0, media: 0 };
    const content = (input.content ?? []).map((child) =>
      normalizeNode(child, 0, counter),
    );

    return { ok: true, doc: { type: "doc", content } };
  } catch (error) {
    if (error instanceof RichTextError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Isi artikel tidak valid." };
  }
}

/**
 * Membaca dokumen dari sumber yang tidak sepenuhnya tepercaya (mis. kolom
 * database yang mungkin diubah di luar aplikasi). Mengembalikan `null` bila
 * dokumen tidak lolos validasi, sehingga pemanggil memakai fallback teks biasa.
 */
export function readRichDoc(value: unknown): RichDoc | null {
  if (value === null || value === undefined) return null;
  const parsed = parseRichDoc(value);
  return parsed.ok ? parsed.doc : null;
}

/**
 * Mengubah teks biasa lama menjadi dokumen yang bisa dibuka di editor.
 *
 * Dipakai saat penulis mengedit pengajuan yang dibuat sebelum editor tersedia
 * (`body_json` masih NULL). Tujuannya agar isi lama tidak hilang dan penulis
 * dapat langsung merapikan formatnya.
 */
export function plainTextToRichDoc(text: string): RichDoc {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return EMPTY_RICH_DOC;

  return {
    type: "doc",
    content: blocks.map((block) => ({
      type: "paragraph",
      content: [{ type: "text", text: block }],
    })),
  };
}

/** Mengubah dokumen menjadi teks biasa untuk pratinjau, pencarian, dan kolom `body`. */
export function richDocToPlainText(doc: RichDoc | null | undefined): string {
  if (!doc || !Array.isArray(doc.content)) return "";

  const parts: string[] = [];

  const walk = (node: RichNode): void => {
    if (node.type === "text") {
      parts.push(node.text ?? "");
      return;
    }
    if (node.type === "hardBreak") {
      parts.push("\n");
      return;
    }
    if (node.type === "horizontalRule") {
      parts.push("\n\n");
      return;
    }

    const isBlock = BLOCK_NODES.has(node.type);
    if (isBlock && parts.length > 0 && !parts[parts.length - 1].endsWith("\n")) {
      parts.push("\n");
    }
    for (const child of node.content ?? []) walk(child);
    if (isBlock) parts.push("\n");
  };

  for (const node of doc.content) walk(node);

  return parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Jumlah karakter isi artikel, dipakai untuk validasi 300–12000 karakter. */
export function countRichTextCharacters(
  doc: RichDoc | null | undefined,
): number {
  return richDocToPlainText(doc).length;
}

/** True bila artikel belum berisi teks apa pun (termasuk markup kosong). */
export function isRichDocEmpty(doc: RichDoc | null | undefined): boolean {
  return countRichTextCharacters(doc) === 0;
}

