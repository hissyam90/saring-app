"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { MediaEmbed } from "@/components/pustaka/article-media";
import { isValidMediaId } from "@/lib/content/media";
import { isMediaEmbedProvider } from "@/lib/content/rich-text";

/**
 * Node blok `mediaEmbed` (embed media pihak ketiga).
 *
 * Menyimpan **hanya** `provider` dan `id` yang sudah divalidasi; URL iframe
 * dihitung ulang oleh renderer. Tidak ada HTML, script, atau atribut lain dari
 * input pengguna yang masuk ke dokumen.
 *
 * Node ini `atom` dan `selectable`, sehingga dapat dipilih dan dihapus sebagai
 * satu blok tanpa merusak paragraf di sekitarnya.
 */

const MediaEmbedView = ({ node, selected }: NodeViewProps) => {
  const id = typeof node.attrs.id === "string" ? node.attrs.id : "";
  const provider = node.attrs.provider;

  if (!isValidMediaId(id) || !isMediaEmbedProvider(provider)) return null;

  return (
    <NodeViewWrapper
      className={`saring-embed my-3 max-w-full border-2 ${
        selected ? "border-coral" : "border-transparent"
      }`}
      data-media-embed={id}
      data-media-provider={provider}
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
        <MediaEmbed provider={provider} id={id} />
      </div>
    </NodeViewWrapper>
  );
};

export const MediaEmbedNode = Node.create({
  name: "mediaEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      provider: { default: "imgur" },
      id: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-media-embed]",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const id = el.getAttribute("data-media-embed");
          const provider = el.getAttribute("data-media-provider");
          return {
            id: isValidMediaId(id) ? id : null,
            provider: isMediaEmbedProvider(provider) ? provider : "imgur",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-media-embed": HTMLAttributes.id,
        "data-media-provider": HTMLAttributes.provider,
        class: "saring-embed",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaEmbedView);
  },
});
