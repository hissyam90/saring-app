"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import type { JSONContent } from "@tiptap/core";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  mediaEmbedUrl,
  mediaPageUrl,
  resolveMediaInput,
  type MediaProvider,
  type ResolvedMedia,
} from "@/lib/content/media";
import { RICH_TEXT_LIMITS } from "@/lib/content/rich-text";

/**
 * Satu dialog untuk semua media.
 *
 * Pengguna tidak perlu memilih provider lebih dulu: tempel URL gambar langsung,
 * URL album, HTML `<img>`, BBCode `[img]`, atau kode embed resmi — semuanya
 * diurai oleh `resolveMediaInput` dan ditampilkan sebagai pratinjau sebelum
 * disisipkan.
 *
 * Hasil yang disimpan selalu terstruktur:
 *   - gambar → node `image` { src, alt }
 *   - embed  → node `mediaEmbed` { provider, id }
 *
 * Markup yang ditempel tidak pernah disimpan; hanya URL atau ID tervalidasi.
 */

const PANEL =
  "absolute right-0 top-11 z-20 w-[min(24rem,calc(100vw-3rem))] border-2 border-ink bg-surface p-2.5 shadow-neo-sm";

const INPUT =
  "mt-1 w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm text-ink placeholder:text-placeholder";

const LABEL =
  "block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted";

const PRIMARY_BTN =
  "inline-flex min-h-8 items-center border-2 border-ink bg-lime px-2.5 text-xs font-bold text-on-lime hover:bg-lime-deep disabled:cursor-not-allowed disabled:opacity-50";

const SECONDARY_BTN =
  "inline-flex min-h-8 items-center gap-1 border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:bg-paper";

const CANCEL_BTN =
  "inline-flex min-h-8 items-center border-2 border-transparent px-2 text-xs font-semibold text-ink-muted hover:text-ink";

const ERROR_BOX =
  "mt-1 border-l-4 border-l-coral bg-coral-soft px-2 py-1 text-xs leading-5 text-ink";

const HINT = "mt-1 text-[11px] leading-4 text-ink-muted";

/** Pratinjau media sebelum disisipkan. */
function MediaPreview({ media }: { media: ResolvedMedia | null }) {
  if (!media) return null;

  if (media.kind === "unsupported") {
    return (
      <p className="mt-1 border-l-4 border-l-amber bg-amber-soft px-2 py-1 text-[11px] leading-4 text-ink">
        {media.hint}
      </p>
    );
  }

  if (media.kind === "image") {
    return (
      <div className="mt-2 border-2 border-ink bg-paper p-1.5">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Pratinjau gambar
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau URL eksternal pengguna */}
        <img
          src={media.src}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          className="max-h-40 w-auto max-w-full border border-line bg-surface"
        />
        <p className="mt-1 break-all font-mono text-[10px] leading-4 text-ink-muted">
          {media.src}
        </p>
      </div>
    );
  }

  const embedSrc = mediaEmbedUrl(media.provider, media.id);
  return (
    <div className="mt-2 border-2 border-ink bg-paper p-1.5">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        Pratinjau embed {media.provider}
      </p>
      {embedSrc ? (
        <iframe
          src={embedSrc}
          title={`Pratinjau embed ${media.provider}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          className="h-48 w-full max-w-full border border-line"
        />
      ) : null}
      <a
        href={mediaPageUrl(media.provider, media.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block break-all text-[10px] font-semibold text-ink underline"
      >
        {mediaPageUrl(media.provider, media.id)}
      </a>
    </div>
  );
}

/** Menyisipkan node blok tanpa menghapus media yang sedang terpilih. */
function insertBlock(editor: Editor, content: JSONContent): void {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) {
    editor.chain().focus().insertContentAt(selection.to, content).run();
    return;
  }
  editor.chain().focus().insertContent(content).run();
}

export function MediaControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selected = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      const imageActive = instance.isActive("image");
      const embedActive = instance.isActive("mediaEmbed");
      return {
        imageActive,
        embedActive,
        active: imageActive || embedActive,
        src: (instance.getAttributes("image").src as string | undefined) ?? "",
        alt: (instance.getAttributes("image").alt as string | undefined) ?? "",
        provider:
          (instance.getAttributes("mediaEmbed").provider as string | undefined) ??
          "imgur",
        id: (instance.getAttributes("mediaEmbed").id as string | undefined) ?? "",
      };
    },
  });

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open]);

  const preview = value.trim().length > 0 ? resolveMediaInput(value) : null;

  const openPanel = () => {
    if (selected?.imageActive) {
      setValue(selected.src);
      setAlt(selected.alt);
    } else if (selected?.embedActive) {
      setValue(mediaPageUrl(selected.provider as MediaProvider, selected.id));
      setAlt("");
    } else {
      setValue("");
      setAlt("");
    }
    setError(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const apply = () => {
    const media = resolveMediaInput(value);

    if (!media) {
      setError(
        "Masukkan URL gambar/album HTTPS, HTML <img>, BBCode [img], atau kode embed resmi.",
      );
      return;
    }
    if (media.kind === "unsupported") {
      setError(media.hint);
      return;
    }

    const safeAlt = alt.trim().slice(0, RICH_TEXT_LIMITS.maxAltLength);

    if (media.kind === "image") {
      const node: JSONContent = {
        type: "image",
        attrs: { src: media.src, alt: safeAlt },
      };
      if (selected?.imageActive) {
        editor
          .chain()
          .focus()
          .updateAttributes("image", { src: media.src, alt: safeAlt })
          .run();
      } else if (selected?.embedActive) {
        // Mengganti embed yang terpilih dengan gambar.
        editor.chain().focus().insertContent(node).run();
      } else {
        insertBlock(editor, node);
      }
      close();
      return;
    }

    const attrs = { provider: media.provider, id: media.id };
    if (selected?.embedActive) {
      editor.chain().focus().updateAttributes("mediaEmbed", attrs).run();
    } else if (selected?.imageActive) {
      editor.chain().focus().insertContent({ type: "mediaEmbed", attrs }).run();
    } else {
      insertBlock(editor, { type: "mediaEmbed", attrs });
    }
    close();
  };

  const remove = () => {
    editor.chain().focus().deleteSelection().run();
    close();
  };


  return (
    <div className="relative">
      <button
        type="button"
        onClick={open ? close : openPanel}
        aria-label="Sisipkan gambar atau media"
        aria-pressed={Boolean(selected?.active) || open}
        title="Sisipkan gambar atau media"
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 transition-colors ${
          selected?.active || open
            ? "border-ink bg-ink text-on-ink"
            : "border-transparent bg-surface text-ink-soft hover:border-ink hover:text-ink"
        }`}
      >
        <ImagePlus className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div className={PANEL}>
          <p className={LABEL}>URL, HTML, BBCode, atau kode embed</p>
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
            placeholder={
              "https://i.postimg.cc/xxxx/foto.jpg\nhttps://imgur.com/a/l4mKcOj\n[img]https://i.ibb.co/xxxx/foto.png[/img]"
            }
            aria-label="URL atau kode media"
            aria-describedby={error ? "editor-media-error" : "editor-media-hint"}
            className={`${INPUT} font-mono text-xs`}
          />

          <p className={`${LABEL} mt-2`}>Teks alternatif (opsional)</p>
          <input
            type="text"
            value={alt}
            maxLength={RICH_TEXT_LIMITS.maxAltLength}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="Deskripsi singkat untuk pembaca layar"
            aria-label="Teks alternatif media"
            className={INPUT}
          />

          <MediaPreview media={preview} />

          {error ? (
            <p id="editor-media-error" role="alert" className={ERROR_BOX}>
              {error}
            </p>
          ) : (
            <p id="editor-media-hint" className={HINT}>
              Gambar dari hosting HTTPS mana pun didukung. Halaman album hanya
              dapat disematkan bila providernya mendukung embed resmi.
            </p>
          )}

          <p className="mt-1 text-[10px] leading-4 text-ink-muted">
            Privasi: gambar di-host pihak ketiga. Hapus metadata sensitif (mis.
            lokasi GPS) sebelum mengunggah ke layanan eksternal.
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={apply}
              disabled={!preview || preview.kind === "unsupported"}
              className={PRIMARY_BTN}
            >
              {selected?.active ? "Perbarui" : "Sisipkan"}
            </button>
            {selected?.active ? (
              <button type="button" onClick={remove} className={SECONDARY_BTN}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Hapus media
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

