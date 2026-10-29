import type { ReactNode } from "react";
import {
  isMediaEmbedProvider,
  sanitizeLinkHref,
  type RichDoc,
  type RichMark,
  type RichNode,
} from "@/lib/content/rich-text";
import { ArticleImage, MediaEmbed } from "./article-media";

/**
 * Renderer konten artikel kaya.
 *
 * Komponen ini **tidak** memakai `dangerouslySetInnerHTML` dan tidak pernah
 * mengubah dokumen menjadi string HTML. Setiap node dipetakan menjadi elemen
 * React, sehingga:
 *
 * - teks selalu di-escape oleh React (tidak ada permukaan XSS dari markup),
 * - node/mark di luar allowlist tidak dirender sama sekali,
 * - setiap `href` diperiksa ulang di sini (lapisan kedua) walaupun sudah
 *   divalidasi saat disimpan,
 * - atribut `target` dan `rel` ditentukan oleh renderer, bukan oleh isi data.
 *
 * Karena tidak memakai hook atau API khusus klien, komponen yang sama dipakai
 * di server component (halaman Pustaka, admin) dan di klien (pratinjau editor)
 * sehingga tampilan pratinjau identik dengan halaman publik.
 */

const LINK_CLASS =
  "font-semibold text-ink underline decoration-coral decoration-2 underline-offset-2 hover:bg-lime-soft";

const BLOCK_CLASS = {
  h2: "mt-6 text-lg font-bold leading-snug tracking-tight text-ink first:mt-0",
  h3: "mt-5 text-base font-bold leading-snug tracking-tight text-ink first:mt-0",
  ul: "my-1 grid list-disc gap-1 pl-5",
  ol: "my-1 grid list-decimal gap-1 pl-5",
  blockquote:
    "my-3 border-l-4 border-ink bg-paper px-3 py-2 text-ink-soft [&>p:first-child]:mt-0 [&>p:last-child]:mb-0",
  hr: "my-5 border-0 border-t-2 border-line",
  code: "border border-line bg-paper px-1 py-0.5 font-mono text-[13px] text-ink",
  media: "my-4 overflow-hidden",
} as const;

/** Mengurutkan mark agar markup bersarang stabil dan tidak bergantung input. */
const MARK_ORDER: RichMark["type"][] = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
];

function applyMarks(text: ReactNode, marks: RichMark[] | undefined, key: string): ReactNode {
  if (!marks || marks.length === 0) return text;

  const sorted = [...marks].sort(
    (a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type),
  );

  return sorted.reduce<ReactNode>((child, mark, index) => {
    const markKey = `${key}-m${index}`;
    switch (mark.type) {
      case "bold":
        return <strong key={markKey}>{child}</strong>;
      case "italic":
        return <em key={markKey}>{child}</em>;
      case "underline":
        return <u key={markKey}>{child}</u>;
      case "strike":
        return <s key={markKey}>{child}</s>;
      case "code":
        return (
          <code key={markKey} className={BLOCK_CLASS.code}>
            {child}
          </code>
        );
      case "link": {
        // Diperiksa ulang: data di database tidak dianggap tepercaya.
        const href = sanitizeLinkHref(mark.attrs?.href);
        if (!href) return child;
        const external = !href.startsWith("mailto:");
        return (
          <a
            key={markKey}
            href={href}
            className={LINK_CLASS}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" }
              : {})}
          >
            {child}
          </a>
        );
      }
      default:
        return child;
    }
  }, text);
}

function renderNode(node: RichNode, key: string): ReactNode {
  switch (node.type) {
    case "text":
      return applyMarks(node.text ?? "", node.marks, key);

    case "hardBreak":
      return <br key={key} />;

    case "paragraph":
      return (
        <p key={key} className="whitespace-pre-wrap">
          {renderChildren(node, key)}
        </p>
      );

    case "heading": {
      const level = node.attrs?.level === 3 ? 3 : 2;
      const Tag = (level === 3 ? "h3" : "h2") as "h2" | "h3";
      return (
        <Tag key={key} className={level === 3 ? BLOCK_CLASS.h3 : BLOCK_CLASS.h2}>
          {renderChildren(node, key)}
        </Tag>
      );
    }

    case "bulletList":
      return (
        <ul key={key} className={BLOCK_CLASS.ul}>
          {renderChildren(node, key)}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key} className={BLOCK_CLASS.ol}>
          {renderChildren(node, key)}
        </ol>
      );

    case "listItem":
      return (
        <li key={key} className="leading-7">
          {renderChildren(node, key)}
        </li>
      );

    case "blockquote":
      return (
        <blockquote key={key} className={BLOCK_CLASS.blockquote}>
          {renderChildren(node, key)}
        </blockquote>
      );

    case "horizontalRule":
      return <hr key={key} className={BLOCK_CLASS.hr} />;

    case "image":
      return (
        <div key={key} className={BLOCK_CLASS.media}>
          <ArticleImage src={node.attrs?.src} alt={node.attrs?.alt ?? ""} />
        </div>
      );

    case "mediaEmbed": {
      const id = node.attrs?.id;
      const provider = node.attrs?.provider;
      if (typeof id !== "string" || !isMediaEmbedProvider(provider)) {
        return null;
      }
      return (
        <div key={key} className={BLOCK_CLASS.media}>
          <MediaEmbed provider={provider} id={id} />
        </div>
      );
    }

    default:
      // Node di luar allowlist tidak dirender (fail closed).
      return null;
  }
}

function renderChildren(node: RichNode, parentKey: string): ReactNode[] {
  return (node.content ?? []).map((child, index) =>
    renderNode(child, `${parentKey}-${index}`),
  );
}

/** Isi artikel lama yang masih berupa teks biasa. */
function PlainTextBody({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </>
  );
}

export function RichContent({
  doc,
  fallbackText = "",
  className = "",
}: {
  /** Dokumen tervalidasi. Bila `null`, dipakai `fallbackText`. */
  doc: RichDoc | null | undefined;
  /** Teks biasa untuk artikel lama atau bila dokumen tidak valid. */
  fallbackText?: string;
  className?: string;
}) {
  const wrapper = `grid min-w-0 gap-3 text-[15px] leading-7 text-ink-soft [&>*]:min-w-0 ${className}`;

  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0) {
    if (!fallbackText.trim()) return null;
    return (
      <div className={wrapper}>
        <PlainTextBody text={fallbackText} />
      </div>
    );
  }

  return (
    <div className={wrapper}>
      {doc.content.map((node, index) => renderNode(node, String(index)))}
    </div>
  );
}
