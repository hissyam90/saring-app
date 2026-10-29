/**
 * Adapter media eksternal untuk Saring.
 *
 * Saring tidak bergantung pada satu layanan hosting gambar. Modul ini mengubah
 * input pengguna (URL, HTML `<img>`, BBCode `[img]`, atau kode embed resmi)
 * menjadi **representasi terstruktur** yang aman disimpan:
 *
 *   { kind: "image", src }                    → node `image`
 *   { kind: "embed", provider, id, pageUrl }   → node `mediaEmbed`
 *   { kind: "unsupported", hint }              → tidak disimpan, tampilkan petunjuk
 *
 * Prinsip keamanan:
 * - Tidak ada HTML/BBCode/script yang disimpan; hanya URL atau ID yang lolos
 *   validasi. Markup embed dibangun ulang oleh aplikasi dari ID tersebut.
 * - Tidak ada permintaan jaringan ke URL pengguna (tidak ada SSRF, tidak ada
 *   proxy gambar, tidak ada penebakan "apakah ini gambar" di server).
 * - "URL gambar langsung" tidak diverifikasi lewat ekstensi saja: URL dianggap
 *   kandidat gambar bila bukan halaman galeri yang dikenal, dan kegagalan muat
 *   ditangani renderer lewat fallback tautan.
 *
 * Modul ini murni (tanpa DOM/jaringan) agar dipakai server dan klien dengan
 * aturan yang sama.
 */

import { sanitizeHttpsUrl } from "./rich-text";

export type MediaProvider = "imgur";

export type ResolvedMedia =
  | { kind: "image"; src: string }
  | {
      kind: "embed";
      provider: MediaProvider;
      id: string;
      /** Halaman publik provider, dipakai untuk tautan fallback yang aman. */
      pageUrl: string;
    }
  | { kind: "unsupported"; hint: string };

/** Hasil klasifikasi URL tanpa melakukan permintaan jaringan. */
export type UrlClass =
  | { kind: "image"; src: string }
  | { kind: "embed"; provider: MediaProvider; id: string; pageUrl: string }
  | { kind: "gallery-page"; provider: string; hint: string };

const MEDIA_ID = /^[A-Za-z0-9]{5,15}$/;

/** Host CDN yang menyajikan berkas gambar langsung (bukan halaman). */
const DIRECT_IMAGE_HOSTS = new Set([
  "i.imgur.com",
  "i.postimg.cc",
  "i.ibb.co",
  "images2.imgbox.com",
  "images3.imgbox.com",
  "thumbs2.imgbox.com",
  "thumbs3.imgbox.com",
]);

/** Host halaman (bukan berkas) dari provider yang dikenal. */
const GALLERY_HOSTS = new Set([
  "imgur.com",
  "www.imgur.com",
  "m.imgur.com",
  "postimg.cc",
  "www.postimg.cc",
  "imgbox.com",
  "www.imgbox.com",
  "ibb.co",
  "www.ibb.co",
]);

export const UNSUPPORTED_HINT =
  "URL ini tampaknya halaman galeri, bukan berkas gambar. Buka gambar di layanan tersebut lalu salin tautan gambarnya (direct link), atau gunakan kode embed resmi bila tersedia.";

/**
 * Saring sengaja **tidak** memuat halaman galeri provider ini ke iframe: hanya
 * origin yang sudah diverifikasi yang boleh menjadi `frame-src`. Pengguna
 * diarahkan memakai tautan gambar langsung.
 */
function galleryHint(provider: string): string {
  return `${provider} belum menyediakan embed yang dapat diverifikasi untuk Saring. ${UNSUPPORTED_HINT}`;
}

function imgurAlbumId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  if (segments[0] !== "a" && segments[0] !== "gallery") return null;
  const id = segments[1];
  return MEDIA_ID.test(id) ? id : null;
}

/**
 * Mengklasifikasikan URL tanpa jaringan.
 *
 * Urutan penting: adapter provider dijalankan lebih dulu agar halaman album
 * tidak pernah dianggap sebagai berkas gambar.
 */
export function classifyUrl(raw: string): UrlClass | null {
  const src = sanitizeHttpsUrl(raw);
  if (!src) return null;

  const url = new URL(src);
  const host = url.hostname.toLowerCase();

  // --- Imgur -------------------------------------------------------------
  if (host === "imgur.com" || host === "www.imgur.com" || host === "m.imgur.com") {
    const albumId = imgurAlbumId(url.pathname);
    if (albumId) {
      return {
        kind: "embed",
        provider: "imgur",
        id: albumId,
        pageUrl: `https://imgur.com/a/${albumId}`,
      };
    }

    // `/{id}` adalah halaman postingan tunggal. Halaman itu mengirim
    // `X-Frame-Options: DENY`, sehingga dirender sebagai berkas gambar.
    const first = url.pathname.split("/").filter(Boolean)[0];
    if (first && MEDIA_ID.test(first)) {
      return { kind: "image", src: `https://i.imgur.com/${first}.jpg` };
    }

    return { kind: "gallery-page", provider: "Imgur", hint: UNSUPPORTED_HINT };
  }

  // --- Host CDN gambar langsung -----------------------------------------
  if (DIRECT_IMAGE_HOSTS.has(host)) {
    return { kind: "image", src };
  }

  // --- Halaman galeri provider lain -------------------------------------
  if (GALLERY_HOSTS.has(host)) {
    const label = host.includes("postimg")
      ? "Postimages"
      : host.includes("imgbox")
        ? "Imgbox"
        : "ImgBB";
    return {
      kind: "gallery-page",
      provider: label,
      hint: galleryHint(label),
    };
  }

  // --- Host lain: kandidat gambar langsung ------------------------------
  // Sebelum menerima host arbitrer, tolak host yang **menyerupai** provider
  // dikenal (mis. `imgur.com.evil.test`). Tanpa aturan ini, halaman galeri palsu
  // akan tampil seolah-olah berkas gambar.
  if (/imgur|postimg|postimages|imgbox|ibb\./i.test(host)) {
    return {
      kind: "gallery-page",
      provider: "Provider",
      hint: `Host "${host}" menyerupai layanan galeri yang dikenal, tetapi bukan domain resminya. ${UNSUPPORTED_HINT}`,
    };
  }

  // Host lain yang tidak menyerupai provider mana pun: kandidat gambar langsung.
  // Tidak dibatasi daftar provider dan tidak mensyaratkan ekstensi. Bila
  // ternyata bukan berkas gambar, renderer menampilkan fallback tautan.
  return { kind: "image", src };
}

/** True bila URL adalah halaman galeri provider yang tidak dapat di-embed. */
export function isGalleryPage(raw: string): boolean {
  return classifyUrl(raw)?.kind === "gallery-page";
}

/**
 * Mengambil URL dari HTML `<img>`, BBCode `[img]`, atau kode embed resmi.
 *
 * Hanya atribut/isi URL yang diambil. Tag, atribut event (`onerror`), dan
 * `<script>` diabaikan sepenuhnya dan tidak pernah dikembalikan.
 */
export function extractUrlFromMarkup(raw: string): string | null {
  const text = raw.trim();
  if (text.length === 0) return null;

  // Kode embed Imgur resmi: <blockquote class="imgur-embed-pub" data-id="a/ID">
  if (/imgur-embed-pub|data-id/i.test(text)) {
    const dataId = text.match(/data-id\s*=\s*["']([^"']+)["']/i)?.[1]?.trim();
    if (dataId) {
      const cleaned = dataId.replace(/^a\//i, "");
      if (MEDIA_ID.test(cleaned)) {
        return /^a\//i.test(dataId)
          ? `https://imgur.com/a/${cleaned}`
          : `https://imgur.com/${cleaned}`;
      }
      return null;
    }
    const href = text.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) return href;
  }

  // BBCode: [img]URL[/img] atau [img=WxH]URL[/img]
  const bbcode = text.match(/\[img(?:=[^\]]*)?\]\s*([^[]+?)\s*\[\/img\]/i)?.[1];
  if (bbcode) return bbcode.trim();

  // HTML <img src="...">
  const imgSrc = text.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  if (imgSrc) return imgSrc.trim();

  // <iframe src="..."> / <a href="...">
  const iframeSrc = text.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  if (iframeSrc) return iframeSrc.trim();

  const anchor = text.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  if (anchor) return anchor.trim();

  return null;
}

/**
 * Titik masuk tunggal untuk dialog media.
 *
 * Menerima URL langsung, HTML `<img>`, BBCode `[img]`, atau kode embed resmi,
 * lalu mengembalikan representasi yang aman disimpan.
 */
export function resolveMediaInput(raw: unknown): ResolvedMedia | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (text.length === 0 || text.length > 4_000) return null;

  const isMarkup = /[<[]/.test(text);
  const candidate = isMarkup ? extractUrlFromMarkup(text) : text;
  if (!candidate) return null;

  // Tambahkan https:// bila pengguna menulis tanpa protokol.
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(candidate);
  const normalized = hasScheme ? candidate : `https://${candidate}`;

  const classified = classifyUrl(normalized);
  if (!classified) return null;

  if (classified.kind === "gallery-page") {
    return { kind: "unsupported", hint: classified.hint };
  }
  if (classified.kind === "embed") {
    return {
      kind: "embed",
      provider: classified.provider,
      id: classified.id,
      pageUrl: classified.pageUrl,
    };
  }
  return { kind: "image", src: classified.src };
}

/** URL iframe embed resmi (satu-satunya origin embed yang diverifikasi). */
export function mediaEmbedUrl(provider: MediaProvider, id: string): string {
  if (provider === "imgur" && MEDIA_ID.test(id)) {
    return `https://imgur.com/a/${id}/embed?pub=true`;
  }
  return "";
}

/** Halaman publik provider untuk tautan fallback yang aman. */
export function mediaPageUrl(provider: MediaProvider, id: string): string {
  if (provider === "imgur" && MEDIA_ID.test(id)) {
    return `https://imgur.com/a/${id}`;
  }
  return "https://imgur.com/";
}

export function isSupportedProvider(value: unknown): value is MediaProvider {
  return value === "imgur";
}

export function isValidMediaId(value: unknown): value is string {
  return typeof value === "string" && MEDIA_ID.test(value);
}

