"use client";

/* eslint-disable @next/next/no-img-element --
 * Gambar artikel berasal dari URL eksternal yang ditulis penulis, sehingga tidak
 * dapat didaftarkan di `next/image`. Optimasi Next juga tidak diinginkan karena
 * akan mem-proxy berkas pihak ketiga lewat server Saring.
 */

import { useEffect, useState } from "react";
import { ExternalLink, ImageOff, Images } from "lucide-react";
import {
  mediaEmbedUrl,
  mediaPageUrl,
  type MediaProvider,
} from "@/lib/content/media";
import { sanitizeImageSrc } from "@/lib/content/rich-text";

/**
 * Renderer media artikel.
 *
 * Klien karena perlu menangani kegagalan pemuatan (gambar 404, host mati, atau
 * iframe yang diblokir `X-Frame-Options`). Dipakai oleh halaman Pustaka, halaman
 * admin, dan pratinjau editor supaya tampilannya sama.
 *
 * Tidak ada HTML dari pengguna yang dirender: `src` dihitung ulang dari data
 * yang sudah divalidasi (host gambar apa pun yang HTTPS) atau dari ID embed yang
 * sudah diverifikasi, dan tautan fallback selalu dibentuk aplikasi.
 */

const LINK_SAFE = {
  target: "_blank",
  rel: "noopener noreferrer nofollow ugc",
} as const;

/** Kotak fallback saat media tidak dapat dimuat. */
export function MediaFallback({
  title,
  detail,
  href,
  label,
}: {
  title: string;
  detail: string;
  href: string;
  label: string;
}) {
  return (
    <div className="border-2 border-dashed border-ink/40 bg-paper px-3 py-4 text-center">
      <ImageOff className="mx-auto h-5 w-5 text-ink-muted" aria-hidden="true" />
      <p className="mt-2 text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-ink-muted">{detail}</p>
      <a
        href={href}
        className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-xs font-semibold text-ink underline"
        {...LINK_SAFE}
      >
        {label}
        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
      </a>
    </div>
  );
}

/**
 * Gambar langsung (`image`).
 *
 * `src` divalidasi ulang di sini (lapisan kedua). Bila berkas gagal dimuat,
 * pembaca melihat fallback yang menautkan ke URL aslinya.
 *
 * `referrerpolicy="no-referrer"` wajib: Imgur (dan beberapa host lain) menolak
 * hotlink bila permintaan membawa header `Referer` asing — terukur di browser
 * sebagai HTTP 403 dengan referrer vs 200 tanpa referrer.
 */
export function ArticleImage({
  src,
  alt = "",
  className = "",
}: {
  src: string | undefined;
  alt?: string;
  className?: string;
}) {
  const safeSrc = sanitizeImageSrc(src);
  const [failed, setFailed] = useState(false);

  if (!safeSrc) {
    return (
      <MediaFallback
        title="Gambar tidak dapat ditampilkan"
        detail="Alamat gambar pada artikel ini tidak valid atau tidak aman."
        href="https://imgur.com/"
        label="Buka Imgur"
      />
    );
  }

  if (failed) {
    return (
      <MediaFallback
        title="Gambar gagal dimuat"
        detail="Berkas mungkin sudah dihapus, dipindahkan, atau tidak dapat diakses publik."
        href={safeSrc}
        label="Buka gambar asli"
      />
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`mx-auto block h-auto w-auto max-w-full border-2 border-ink bg-surface ${className}`}
    />
  );
}

/**
 * Embed media (`mediaEmbed`).
 *
 * Hanya provider yang sudah diverifikasi yang dapat menjadi iframe: Imgur album
 * melalui `https://imgur.com/a/{id}/embed?pub=true`, yang terbukti **tidak**
 * mengirim `X-Frame-Options` (halaman album biasa mengirim `DENY`).
 *
 * Tautan keluar ke halaman provider selalu tersedia, karena iframe yang gagal
 * (album privat/dihapus/diblokir) tetap memicu event `load` dengan halaman error
 * pihak ketiga sehingga kegagalan tidak selalu dapat dideteksi dari sisi Saring.
 */
export function MediaEmbed({
  provider,
  id,
}: {
  provider: MediaProvider;
  id: string;
}) {
  const embedSrc = mediaEmbedUrl(provider, id);
  const pageUrl = mediaPageUrl(provider, id);
  const [frameState, setFrameState] = useState<"loading" | "ready" | "failed">(
    "loading",
  );

  useEffect(() => {
    if (!embedSrc) return;
    const timer = setTimeout(() => {
      setFrameState((current) => (current === "ready" ? current : "failed"));
    }, 9_000);
    return () => clearTimeout(timer);
  }, [embedSrc]);

  if (!embedSrc) {
    return (
      <MediaFallback
        title="Embed tidak didukung"
        detail="Provider media ini belum diverifikasi untuk ditampilkan sebagai embed."
        href={pageUrl}
        label="Buka media"
      />
    );
  }

  return (
    <figure className="border-2 border-ink bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-paper px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          <Images className="h-3.5 w-3.5" aria-hidden="true" />
          {provider} · album
        </span>
        <a
          href={pageUrl}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink underline"
          {...LINK_SAFE}
        >
          Buka di {provider}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      {frameState === "failed" ? (
        <div className="px-3 py-4">
          <MediaFallback
            title="Embed tidak dapat dimuat"
            detail="Album mungkin privat, sudah dihapus, atau embed diblokir peramban."
            href={pageUrl}
            label={`Buka album di ${provider}`}
          />
        </div>
      ) : (
        <iframe
          src={embedSrc}
          title={`Album ${provider} ${id}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          // Konten berasal dari origin lain (imgur.com). `allow-scripts` +
          // `allow-same-origin` diperlukan agar embed resmi berjalan;
          // kombinasinya tidak berbahaya di sini karena dokumen tidak
          // sesama-origin dengan Saring sehingga tidak dapat menyentuh DOM
          // maupun cookie aplikasi.
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allow="fullscreen"
          onLoad={() => setFrameState("ready")}
          onError={() => setFrameState("failed")}
          className="block h-[360px] w-full max-w-full border-0 sm:h-[480px]"
        />
      )}

      <figcaption className="border-t-2 border-ink bg-paper px-3 py-1.5">
        <a
          href={pageUrl}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink underline"
          {...LINK_SAFE}
        >
          Jika embed tidak tampil, buka album di {provider}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  );
}

