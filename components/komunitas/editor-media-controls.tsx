"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import type { JSONContent } from "@tiptap/core";
import { ImagePlus, Images, Trash2 } from "lucide-react";
import {
  RICH_TEXT_LIMITS,
  parseImgurEmbed,
  sanitizeImageSrc,
} from "@/lib/content/rich-text";

/**
 * Kontrol media pada toolbar editor.
 *
 * Dua dialog terpisah supaya penulis tidak bingung antara **hyperlink**,
 * **gambar langsung**, dan **embed album Imgur**:
 *
 * - `ImageControl` menyisipkan/mengganti node `image` (URL berkas gambar).
 * - `ImgurControl` menyisipkan/mengganti node `imgurEmbed` dari URL album,
 *   URL postingan, atau kode embed resmi.
 *
 * Semua nilai divalidasi dengan fungsi yang sama yang dipakai server, sehingga
 * yang bisa disisipkan di editor tidak akan ditolak API karena alasan berbeda.
 */

const PANEL =
  "absolute right-0 top-11 z-20 w-[min(22rem,calc(100vw-3rem))] border-2 border-ink bg-surface p-2.5 shadow-neo-sm";

const INPUT =
  "mt-1 w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm text-ink placeholder:text-ink-muted/70";

const LABEL =
  "block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted";

const PRIMARY_BTN =
  "inline-flex min-h-8 items-center border-2 border-ink bg-lime px-2.5 text-xs font-bold text-ink hover:bg-lime-deep";

const SECONDARY_BTN =
  "inline-flex min-h-8 items-center gap-1 border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:bg-paper";

const CANCEL_BTN =
  "inline-flex min-h-8 items-center border-2 border-transparent px-2 text-xs font-semibold text-ink-muted hover:text-ink";

const ERROR_BOX =
  "mt-1 border-l-4 border-l-coral bg-coral-soft px-2 py-1 text-xs leading-5 text-ink";

const HINT = "mt-1 text-[11px] leading-4 text-ink-muted";

/**
 * Menyisipkan node blok tanpa menghapus media yang sedang terpilih.
 *
 * `insertContent` mengganti isi seleksi. Bila seleksi berupa `NodeSelection`
 * (mis. gambar yang baru disisipkan masih terpilih), media baru akan menimpa
 * media lama. Karena itu node atom yang terpilih disisipkan **setelah**
 * posisinya, bukan menggantikannya.
 */
function insertBlock(editor: Editor, content: JSONContent): void {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) {
    editor.chain().focus().insertContentAt(selection.to, content).run();
    return;
  }
  editor.chain().focus().insertContent(content).run();
}

function ToolbarButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof ImagePlus;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 transition-colors ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-transparent bg-surface text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/** Dialog sisip/ubah gambar langsung. */
export function ImageControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const selected = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      active: instance.isActive("image"),
      src: (instance.getAttributes("image").src as string | undefined) ?? "",
      alt: (instance.getAttributes("image").alt as string | undefined) ?? "",
    }),
  });

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => urlRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open]);

  const openPanel = () => {
    setUrl(selected?.src ?? "");
    setAlt(selected?.alt ?? "");
    setError(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const apply = () => {
    const src = sanitizeImageSrc(url);
    if (!src) {
      setError(
        "Gunakan URL HTTPS yang berakhiran .jpg, .jpeg, .png, .gif, .webp, atau .avif.",
      );
      return;
    }

    const safeAlt = alt.trim().slice(0, RICH_TEXT_LIMITS.maxAltLength);

    if (selected?.active) {
      editor
        .chain()
        .focus()
        .updateAttributes("image", { src, alt: safeAlt })
        .run();
    } else {
      // `setImage` juga mengganti seleksi; gunakan jalur yang sama agar gambar
      // yang sedang terpilih tidak tertimpa.
      insertBlock(editor, { type: "image", attrs: { src, alt: safeAlt } });
    }
    close();
  };

  const remove = () => {
    editor.chain().focus().deleteSelection().run();
    close();
  };

  return (
    <div className="relative">
      <ToolbarButton
        label="Sisipkan gambar"
        icon={ImagePlus}
        active={Boolean(selected?.active) || open}
        onClick={open ? close : openPanel}
      />

      {open ? (
        <div className={PANEL}>
          <p className={LABEL}>URL gambar</p>
          <input
            ref={urlRef}
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                apply();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
            }}
            placeholder="https://i.imgur.com/ID.jpg"
            aria-label="URL gambar"
            aria-describedby={error ? "editor-image-error" : "editor-image-hint"}
            className={INPUT}
          />

          <p className={`${LABEL} mt-2`}>Teks alternatif (opsional)</p>
          <input
            type="text"
            value={alt}
            maxLength={RICH_TEXT_LIMITS.maxAltLength}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="Deskripsi singkat untuk pembaca layar"
            aria-label="Teks alternatif gambar"
            className={INPUT}
          />

          {error ? (
            <p id="editor-image-error" role="alert" className={ERROR_BOX}>
              {error}
            </p>
          ) : (
            <p id="editor-image-hint" className={HINT}>
              Tempel tautan berkas gambar (bukan halaman album). Untuk album
              Imgur, gunakan tombol Sematkan Imgur.
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={apply} className={PRIMARY_BTN}>
              {selected?.active ? "Perbarui" : "Sisipkan"}
            </button>
            {selected?.active ? (
              <button type="button" onClick={remove} className={SECONDARY_BTN}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Hapus gambar
              </button>
            ) : null}
            <button type="button" onClick={close} className={CANCEL_BTN}>
              Batal
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


/**
 * Dialog sisip/ubah embed Imgur.
 *
 * Menerima URL album (`https://imgur.com/a/{id}`), URL postingan
 * (`https://imgur.com/{id}`), dan kode embed resmi Imgur. Dari kode embed hanya
 * `data-id` (atau `href` di dalam blockquote) yang diambil; `<script>` yang
 * ditempel diabaikan sepenuhnya dan tidak pernah disimpan.
 */
export function ImgurControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selected = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      active: instance.isActive("imgurEmbed"),
      id: (instance.getAttributes("imgurEmbed").id as string | undefined) ?? "",
      kind: (instance.getAttributes("imgurEmbed").kind as string | undefined) ?? "",
    }),
  });

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open]);

  const openPanel = () => {
    setValue(
      selected?.active && selected.id
        ? `https://imgur.com/${selected.kind === "album" ? "a/" : ""}${selected.id}`
        : "",
    );
    setError(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const apply = () => {
    const ref = parseImgurEmbed(value);
    if (!ref) {
      setError(
        "Gunakan URL album Imgur (https://imgur.com/a/ID), URL postingan, atau kode embed resmi Imgur.",
      );
      return;
    }

    const attrs = { id: ref.id, kind: ref.kind };

    if (selected?.active) {
      editor.chain().focus().updateAttributes("imgurEmbed", attrs).run();
    } else {
      insertBlock(editor, { type: "imgurEmbed", attrs });
    }
    close();
  };

  const remove = () => {
    editor.chain().focus().deleteSelection().run();
    close();
  };

  return (
    <div className="relative">
      <ToolbarButton
        label="Sematkan Imgur"
        icon={Images}
        active={Boolean(selected?.active) || open}
        onClick={open ? close : openPanel}
      />

      {open ? (
        <div className={PANEL}>
          <p className={LABEL}>URL album atau kode embed Imgur</p>
          <textarea
            ref={inputRef}
            value={value}
            rows={3}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
            }}
            placeholder={"https://imgur.com/a/l4mKcOj\natau tempel kode embed Imgur"}
            aria-label="URL atau kode embed Imgur"
            aria-describedby={error ? "editor-imgur-error" : "editor-imgur-hint"}
            className={`${INPUT} font-mono text-xs`}
          />

          {error ? (
            <p id="editor-imgur-error" role="alert" className={ERROR_BOX}>
              {error}
            </p>
          ) : (
            <p id="editor-imgur-hint" className={HINT}>
              Album tampil sebagai embed resmi. Postingan tunggal tampil sebagai
              gambar karena Imgur memblokir iframe halaman postingan. Script di
              dalam kode embed diabaikan.
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={apply} className={PRIMARY_BTN}>
              {selected?.active ? "Perbarui embed" : "Sematkan"}
            </button>
            {selected?.active ? (
              <button type="button" onClick={remove} className={SECONDARY_BTN}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Hapus embed
              </button>
            ) : null}
            <button type="button" onClick={close} className={CANCEL_BTN}>
              Batal
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

