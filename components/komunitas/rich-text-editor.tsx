"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { ImagePlus, Link2 } from "lucide-react";
import {
  RICH_TEXT_LIMITS,
  countRichTextCharacters,
  sanitizeLinkHref,
  type RichDoc,
} from "@/lib/content/rich-text";
import { mediaPageUrl, resolveMediaInput, type ResolvedMedia } from "@/lib/content/media";
import { EditorToolbar } from "./editor-toolbar";
import { MediaEmbedNode } from "./extensions/media-embed";

/**
 * Editor artikel kaya (Tiptap).
 *
 * Konfigurasi sengaja dibatasi pada format yang memang didukung artikel
 * edukasi: paragraf, judul H2/H3, tebal, miring, garis bawah, coret, kode
 * sebaris, daftar butir/bernomor, kutipan, garis pemisah, dan tautan.
 * `codeBlock` dimatikan karena tidak termasuk allowlist server.
 *
 * `immediatelyRender: false` wajib di App Router: editor hanya dirender setelah
 * komponen terpasang di klien, sehingga tidak ada hydration mismatch antara
 * HTML server dan DOM ProseMirror.
 */
/**
 * Ekstensi dibuat per editor (bukan dibagi antar instance) karena halaman
 * pengajuan dapat menampilkan beberapa editor sekaligus dan ekstensi Tiptap
 * menyimpan state internal.
 */
function createExtensions() {
  return [
    StarterKit.configure({
      // Tidak termasuk allowlist konten, jadi dinonaktifkan sepenuhnya.
      codeBlock: false,
      heading: { levels: [2, 3] },
      /**
       * Trailing node menambahkan paragraf kosong di akhir dokumen setiap kali
       * blok terakhir bukan paragraf. Di Tiptap 3 plugin ini memindahkan
       * seleksi ke akhir dokumen, sehingga setelah menekan tombol "Judul
       * tingkat 2" pada editor kosong, teks yang diketik masuk ke paragraf baru
       * di bawah judul. Dinonaktifkan agar kursor tetap berada di blok yang
       * baru diformat.
       */
      trailingNode: false,
      link: {
        // Klik tautan saat menulis tidak boleh berpindah halaman.
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        protocols: ["http", "https", "mailto"],
        // Tautan tidak aman ditolak juga di sisi editor, bukan hanya di server.
        isAllowedUri: (url: string) => sanitizeLinkHref(url) !== null,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow ugc",
          target: "_blank",
        },
      },
    }),
    Placeholder.configure({
      placeholder:
        "Mulai dari masalah yang ingin dijelaskan, lalu beri contoh dan langkah praktis yang bisa dilakukan pembaca…",
    }),
    /**
     * Gambar langsung. `allowBase64: false` penting: gambar base64 besar tidak
     * boleh masuk ke `body_json` PostgreSQL. `inline: false` menjadikannya blok
     * tersendiri sehingga bisa dipilih dan dihapus tanpa merusak paragraf di
     * sekitarnya.
     *
     * `referrerpolicy: no-referrer` wajib: Imgur (dan beberapa host lain)
     * menolak hotlink bila permintaan membawa header `Referer` asing — terukur
     * di browser sebagai HTTP 403 tanpa referrer vs 200 dengan referrer.
     * Tanpa atribut ini, pratinjau gambar di editor tampil rusak walaupun URL
     * tersimpan benar.
     */
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        referrerpolicy: "no-referrer",
        loading: "lazy",
        decoding: "async",
      },
    }),
    MediaEmbedNode,
  ];
}

const RichTextEditorEmptyDoc: RichDoc = {
  type: "doc",
  // ProseMirror mensyaratkan minimal satu blok; dokumen `content: []` tidak
  // valid sebagai konten awal editor.
  content: [{ type: "paragraph" }],
};

export function RichTextEditor({
  id = "artikel-editor",
  initialDoc,
  onChange,
}: {
  /**
   * Id elemen contenteditable. Harus unik per halaman karena halaman pengajuan
   * dapat memuat beberapa form sekaligus (pengajuan baru + daftar perbaikan).
   */
  id?: string;
  /** Dokumen awal saat mengedit pengajuan yang sudah ada. */
  initialDoc?: RichDoc | null;
  /** Dipanggil setiap isi berubah dengan dokumen Tiptap terkini. */
  onChange: (doc: RichDoc) => void;
}) {
  const hintId = `${id}-hint`;
  const extensions = useMemo(() => createExtensions(), []);
  // Ref dipakai agar `onUpdate` tidak menyimpan closure lama tanpa membuat
  // ulang editor di setiap render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  /**
   * URL yang ditempel dan bisa diubah menjadi media. Ditampilkan sebagai
   * tawaran, bukan dipaksa: penulis tetap dapat memilih mempertahankannya
   * sebagai tautan biasa.
   */
  const [pendingMedia, setPendingMedia] = useState<ResolvedMedia | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content:
      initialDoc && initialDoc.content.length > 0
        ? initialDoc
        : RichTextEditorEmptyDoc,
    editorProps: {
      attributes: {
        id,
        class: "saring-editor",
        "aria-label": "Isi artikel",
        "aria-multiline": "true",
        role: "textbox",
        "aria-describedby": hintId,
      },
      /**
       * Menempel satu URL/HTML/BBCode media: jangan langsung menjadikannya teks
       * bertaut, tetapi tawarkan pilihan. Hanya berlaku untuk tempelan teks
       * polos; tempelan kaya (HTML dokumen) dibiarkan ke Tiptap agar formatnya
       * tetap terjaga.
       */
      handlePaste: (_view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;

        if (clipboard.getData("text/html").trim().length > 0) return false;

        const text = clipboard.getData("text/plain").trim();
        if (text.length === 0) return false;

        const media = resolveMediaInput(text);
        if (media && media.kind !== "unsupported") {
          setPendingMedia(media);
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChangeRef.current(instance.getJSON() as RichDoc);
    },
  });

  // Dihitung dengan fungsi yang sama seperti validasi server agar angka di UI
  // dan aturan API tidak pernah berbeda.
  const characters = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      instance
        ? countRichTextCharacters(instance.getJSON() as RichDoc)
        : 0,
  }) ?? 0;

  const tooShort = characters < RICH_TEXT_LIMITS.minCharacters;
  const tooLong = characters > RICH_TEXT_LIMITS.maxCharacters;

  const insertPendingAsMedia = () => {
    if (!editor || !pendingMedia) return;
    if (pendingMedia.kind === "image") {
      editor.chain().focus().setImage({ src: pendingMedia.src, alt: "" }).run();
    } else if (pendingMedia.kind === "embed") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "mediaEmbed",
          attrs: { provider: pendingMedia.provider, id: pendingMedia.id },
        })
        .run();
    }
    setPendingMedia(null);
  };

  const insertPendingAsLink = () => {
    if (!editor || !pendingMedia || pendingMedia.kind === "unsupported") return;
    const href =
      pendingMedia.kind === "image"
        ? pendingMedia.src
        : mediaPageUrl(pendingMedia.provider, pendingMedia.id);
    editor
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text: href,
        marks: [{ type: "link", attrs: { href } }],
      })
      .run();
    setPendingMedia(null);
  };

  return (
    <div
      className={`border-2 bg-surface transition-shadow focus-within:shadow-neo ${
        tooLong ? "border-coral" : "border-ink"
      }`}
    >
      {editor ? (
        <EditorToolbar editor={editor} editorId={id} />
      ) : (
        // Placeholder toolbar setinggi toolbar asli agar tata letak tidak
        // melompat saat editor selesai dipasang.
        <div
          aria-hidden="true"
          className="h-[3.25rem] border-b-2 border-ink bg-paper"
        />
      )}

      {pendingMedia ? (
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-amber-soft px-3 py-2">
          <p className="min-w-0 flex-1 text-xs leading-5 text-ink">
            {pendingMedia.kind === "image"
              ? "URL gambar terdeteksi."
              : "Album atau embed media terdeteksi."}{" "}
            Tampilkan sebagai media, atau biarkan sebagai tautan?
          </p>
          <button
            type="button"
            onClick={insertPendingAsMedia}
            className="inline-flex min-h-8 items-center gap-1.5 border-2 border-ink bg-lime px-2.5 text-xs font-bold text-ink hover:bg-lime-deep"
          >
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            {pendingMedia.kind === "embed" ? "Sematkan album" : "Jadikan gambar"}
          </button>
          <button
            type="button"
            onClick={insertPendingAsLink}
            className="inline-flex min-h-8 items-center gap-1.5 border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:bg-paper"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            Biarkan sebagai tautan
          </button>
          <button
            type="button"
            onClick={() => setPendingMedia(null)}
            className="inline-flex min-h-8 items-center border-2 border-transparent px-2 text-xs font-semibold text-ink-muted hover:text-ink"
          >
            Batal
          </button>
        </div>
      ) : null}

      {/*
        Shell ber-min-height menjaga area tulis tetap luas sebelum ProseMirror
        selesai dipasang (dan saat editor di-remount setelah submit), sehingga
        kotak tidak pernah menyusut menjadi setinggi toolbar.
      */}
      <div
        className="saring-editor-shell"
        onClick={(event) => {
          // Klik pada ruang kosong di bawah tulisan tetap memfokuskan editor.
          if (event.target === event.currentTarget) {
            editor?.chain().focus("end").run();
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink bg-paper px-3 py-1.5">
        <p id={hintId} className="text-[11px] leading-5 text-ink-muted">
          Minimal {RICH_TEXT_LIMITS.minCharacters} karakter. Judul dan isi
          diperiksa ulang di server sebelum disimpan.
        </p>
        <p
          aria-live="polite"
          className={`font-mono text-[11px] ${
            tooLong || tooShort ? "text-ink-coral" : "text-ink-muted"
          }`}
        >
          {characters.toLocaleString("id-ID")} /{" "}
          {RICH_TEXT_LIMITS.maxCharacters.toLocaleString("id-ID")} karakter
        </p>
      </div>
    </div>
  );
}
