"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { normalizeUserHref } from "@/lib/content/rich-text";
import { ImageControl, ImgurControl } from "./editor-media-controls";

/**
 * Toolbar editor artikel.
 *
 * Setiap tombol menjalankan perintah Tiptap yang sebenarnya dan menampilkan
 * status aktif (`aria-pressed`) sesuai format di posisi kursor. Status dibaca
 * lewat `useEditorState` agar toolbar ikut berubah saat seleksi berubah.
 */

function ToolButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  onClick,
  shortcut,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-transparent bg-surface text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function ToolSeparator() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 hidden h-6 w-px shrink-0 bg-line sm:block"
    />
  );
}

function LinkControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeHref = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      (instance.getAttributes("link").href as string | undefined) ?? null,
  });

  useEffect(() => {
    if (!open) return;
    // Fokuskan input setelah popover benar-benar tampil.
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open]);

  const openPopover = () => {
    setValue(activeHref ?? "");
    setError(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const apply = () => {
    const href = normalizeUserHref(value);
    if (!href) {
      setError("Gunakan alamat yang diawali https:// atau http://.");
      return;
    }

    if (editor.state.selection.empty) {
      // Tanpa seleksi: sisipkan URL sebagai teks bertaut agar tidak menjadi
      // tautan "menempel" yang membingungkan penulis.
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: href,
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    close();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    close();
  };

  return (
    <div className="relative">
      <ToolButton
        label="Sisipkan atau ubah tautan"
        icon={Link2}
        active={Boolean(activeHref) || open}
        onClick={open ? close : openPopover}
        shortcut="Ctrl+K"
      />

      {open ? (
        <div className="absolute left-0 top-11 z-20 w-[min(20rem,calc(100vw-3rem))] border-2 border-ink bg-surface p-2.5 shadow-neo-sm">
          <label
            htmlFor="editor-link-url"
            className="block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted"
          >
            Alamat tautan
          </label>
          <input
            ref={inputRef}
            id="editor-link-url"
            type="text"
            inputMode="url"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
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
            placeholder="https://contoh.go.id/artikel"
            aria-describedby={error ? "editor-link-error" : undefined}
            className="mt-1 w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm text-ink placeholder:text-ink-muted/70"
          />
          {error ? (
            <p
              id="editor-link-error"
              role="alert"
              className="mt-1 border-l-4 border-l-coral bg-coral-soft px-2 py-1 text-xs leading-5 text-ink"
            >
              {error}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={apply}
              className="inline-flex min-h-8 items-center border-2 border-ink bg-lime px-2.5 text-xs font-bold text-ink hover:bg-lime-deep"
            >
              {activeHref ? "Perbarui" : "Sisipkan"}
            </button>
            {activeHref ? (
              <button
                type="button"
                onClick={remove}
                className="inline-flex min-h-8 items-center gap-1 border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:bg-paper"
              >
                <Link2Off className="h-3.5 w-3.5" aria-hidden="true" />
                Hapus tautan
              </button>
            ) : null}
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-8 items-center border-2 border-transparent px-2 text-xs font-semibold text-ink-muted hover:text-ink"
            >
              Batal
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


export function EditorToolbar({
  editor,
  editorId,
}: {
  editor: Editor;
  /** Id elemen contenteditable, dipakai untuk `aria-controls`. */
  editorId: string;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive("bold"),
      italic: instance.isActive("italic"),
      underline: instance.isActive("underline"),
      strike: instance.isActive("strike"),
      code: instance.isActive("code"),
      h2: instance.isActive("heading", { level: 2 }),
      h3: instance.isActive("heading", { level: 3 }),
      paragraph: instance.isActive("paragraph"),
      bulletList: instance.isActive("bulletList"),
      orderedList: instance.isActive("orderedList"),
      blockquote: instance.isActive("blockquote"),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Format artikel"
      aria-controls={editorId}
      className="flex flex-wrap items-center gap-0.5 border-b-2 border-ink bg-paper px-1.5 py-1.5"
    >
      <ToolButton
        label="Paragraf biasa"
        icon={Pilcrow}
        active={state.paragraph}
        onClick={() => chain().setParagraph().run()}
      />
      <ToolButton
        label="Judul tingkat 2"
        icon={Heading2}
        active={state.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      />
      <ToolButton
        label="Judul tingkat 3"
        icon={Heading3}
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      />

      <ToolSeparator />

      <ToolButton
        label="Tebal"
        icon={Bold}
        active={state.bold}
        onClick={() => chain().toggleBold().run()}
        shortcut="Ctrl+B"
      />
      <ToolButton
        label="Miring"
        icon={Italic}
        active={state.italic}
        onClick={() => chain().toggleItalic().run()}
        shortcut="Ctrl+I"
      />
      <ToolButton
        label="Garis bawah"
        icon={Underline}
        active={state.underline}
        onClick={() => chain().toggleUnderline().run()}
        shortcut="Ctrl+U"
      />
      <ToolButton
        label="Coret"
        icon={Strikethrough}
        active={state.strike}
        onClick={() => chain().toggleStrike().run()}
        shortcut="Ctrl+Shift+S"
      />
      <ToolButton
        label="Kode sebaris"
        icon={Code}
        active={state.code}
        onClick={() => chain().toggleCode().run()}
        shortcut="Ctrl+E"
      />

      <ToolSeparator />

      <ToolButton
        label="Daftar butir"
        icon={List}
        active={state.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      />
      <ToolButton
        label="Daftar bernomor"
        icon={ListOrdered}
        active={state.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      />
      <ToolButton
        label="Kutipan"
        icon={Quote}
        active={state.blockquote}
        onClick={() => chain().toggleBlockquote().run()}
      />
      <ToolButton
        label="Garis pemisah"
        icon={Minus}
        onClick={() => chain().setHorizontalRule().run()}
      />

      <ToolSeparator />

      <LinkControl editor={editor} />

      <ToolSeparator />

      <ImageControl editor={editor} />
      <ImgurControl editor={editor} />

      <ToolSeparator />

      <ToolButton
        label="Urungkan"
        icon={Undo2}
        disabled={!state.canUndo}
        onClick={() => chain().undo().run()}
        shortcut="Ctrl+Z"
      />
      <ToolButton
        label="Ulangi"
        icon={Redo2}
        disabled={!state.canRedo}
        onClick={() => chain().redo().run()}
        shortcut="Ctrl+Shift+Z"
      />
    </div>
  );
}

