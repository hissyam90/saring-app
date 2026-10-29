"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { ImgurEmbed } from "@/components/pustaka/article-media";

/**
 * Node blok `imgurEmbed`.
 *
 * Menyimpan **hanya** `id` dan `kind` yang sudah divalidasi; URL iframe dihitung
 * ulang oleh renderer. Tidak ada HTML, script, atau atribut lain dari input
 * pengguna yang masuk ke dokumen.
 *
 * Node ini `atom` dan `selectable`, sehingga dapat dipilih dan dihapus sebagai
 * satu blok tanpa merusak paragraf di sekitarnya.
 */

const ImgurEmbedView = ({ node, selected }: NodeViewProps) => {
  const id = typeof node.attrs.id === "string" ? node.attrs.id : "";
  const kind = node.attrs.kind === "image" ? "image" : "album";

  if (!id) return null;

  return (
    <NodeViewWrapper
      className={`saring-embed my-3 border-2 ${
        selected ? "border-coral" : "border-transparent"
      }`}
      data-imgur-embed={id}
    >
      {/*
        `contentEditable={false}` mencegah ProseMirror mengelola isi embed.
        Media dibuat `pointer-events-none` agar klik memilih node, bukan
        berinteraksi dengan iframe pihak ketiga saat menulis.
      */}
      <div
        contentEditable={false}
        className="[&_iframe]:pointer-events-none [&_img]:pointer-events-none"
      >
        <ImgurEmbed kind={kind} id={id} />
      </div>
    </NodeViewWrapper>
  );
};

export const ImgurEmbedNode = Node.create({
  name: "imgurEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      id: { default: null },
      kind: { default: "album" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-imgur-embed]",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const id = el.getAttribute("data-imgur-embed");
          const kind = el.getAttribute("data-imgur-kind");
          return {
            id: id && /^[A-Za-z0-9]{5,15}$/.test(id) ? id : null,
            kind: kind === "image" ? "image" : "album",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-imgur-embed": HTMLAttributes.id,
        "data-imgur-kind": HTMLAttributes.kind,
        class: "saring-embed",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImgurEmbedView);
  },
});
