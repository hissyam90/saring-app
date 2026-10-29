import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

/**
 * Unit dan komponen test **selalu** memakai penyimpanan in-memory.
 *
 * Sebelum ini, `npm test` mengikuti variabel lingkungan shell: bila
 * `DATABASE_URL` sudah diekspor (mis. setelah menjalankan E2E di terminal yang
 * sama, atau dari skrip CI yang salah menaruhnya di job quality), `getStore()`
 * membuat store PostgreSQL baru pada setiap pemanggilan sehingga test yang
 * mengandalkan store in-memory gagal — dan lebih berbahaya, unit test dapat
 * menyentuh database pengembangan/produksi.
 *
 * Variabel dihapus di sini; test yang memang ingin menguji perilaku "tanpa
 * database" tetap dapat memakai `vi.stubEnv("DATABASE_URL", "")`.
 */
delete process.env.DATABASE_URL;
delete process.env.DATABASE_SSL;
delete process.env.DATABASE_POOL_MAX;
delete process.env.SARING_ALLOW_MEMORY_STORE;

/**
 * jsdom tidak mengimplementasikan layout, sementara ProseMirror (di dalam
 * Tiptap) memanggil `getClientRects()` / `getBoundingClientRect()` saat
 * menggulir seleksi. Tanpa polyfill ini pengujian editor melempar TypeError
 * walaupun logika editornya benar.
 *
 * Nilai yang dikembalikan sengaja kosong/nol: tidak ada kode aplikasi yang
 * bergantung pada ukuran nyata di lingkungan pengujian.
 */
const NO_RECTS = () => [] as unknown as DOMRectList;
const ZERO_RECT = () =>
  ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  }) as DOMRect;

interface LayoutProto {
  getClientRects?: unknown;
  getBoundingClientRect?: unknown;
}

for (const proto of [
  Text.prototype,
  Element.prototype,
  Range.prototype,
] as unknown as LayoutProto[]) {
  if (typeof proto.getClientRects !== "function") {
    Object.defineProperty(proto, "getClientRects", {
      value: NO_RECTS,
      configurable: true,
    });
  }
  if (typeof proto.getBoundingClientRect !== "function") {
    Object.defineProperty(proto, "getBoundingClientRect", {
      value: ZERO_RECT,
      configurable: true,
    });
  }
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
