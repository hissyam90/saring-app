"use client";

/* eslint-disable @next/next/no-img-element --
 * Gambar artikel berasal dari URL eksternal yang ditulis penulis, sehingga tidak
 * dapat didaftarkan di `next/image`. Optimasi Next juga tidak diinginkan karena
 * akan mem-proxy berkas pihak ketiga lewat server Saring.
 */

import { useEffect, useState } from "react";
import { ExternalLink, ImageOff, Images } from "lucide-react";
import {
  imgurDirectImageUrl,
  imgurEmbedUrl,
  imgurPageUrl,
  sanitizeImageSrc,
  type ImgurKind,
} from "@/lib/content/rich-text";

/**
 * Renderer media artikel.
 *
 * Komponen ini klien karena perlu menangani kegagalan pemuatan (gambar 404,
 * host mati, atau iframe yang diblokir `X-Frame-Options`). Dipakai oleh
 * halaman Pustaka, halaman admin, dan pratinjau editor supaya tampilannya sama.
 *
 * Tidak ada HTML dari pengguna yang dirender: `src` dihitung ulang dari data
 * yang sudah divalidasi, dan tautan fallback selalu menuju halaman Imgur yang
 * dibentuk aplikasi.
 */

const LINK_SAFE = {
  target: "_blank",
  rel: "noopener noreferrer nofollow ugc",
} as const;

/** Kotak fallback saat media tidak dapat dimuat. */
function MediaFallback({
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
    <div className="border-2 border-dashed border-ink/40 bg-paper px-4 py-5 text-center">
      <ImageOff className="mx-auto h-5 w-5 text-ink-muted" aria-hidden="true" />
      <p className="mt-2 text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-ink-muted">{detail}</p>
      <a
        href={href}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink underline"
        {...LINK_SAFE}
      >
        {label}
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  );
}

/**
 * Gambar langsung (`image`).
 *
 * `src` divalidasi ulang di sini (lapisan kedua). Bila berkas gagal dimuat,
 * pembaca melihat fallback yang menautkan ke URL aslinya, bukan gambar rusak.
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
      className={`mx-auto block h-auto max-w-full border-2 border-ink bg-surface ${className}`}
    />
  );
}


/**
 * Embed Imgur (`imgurEmbed`).
 *
 * Album dirender dengan iframe resmi `https://imgur.com/a/{id}/embed?pub=true`.
 * Bentuk URL itu dipilih setelah diverifikasi: halaman album biasa mengirim
 * `X-Frame-Options: DENY`, sedangkan URL `…/embed?pub=true` tidak.
 *
 * Postingan tunggal **tidak** dapat di-iframe (Imgur mengirim `DENY`), sehingga
 * dirender sebagai gambar langsung `https://i.imgur.com/{id}.jpg`.
 *
 * Tautan keluar ke Imgur selalu tersedia. Bila iframe tidak selesai dimuat
 * dalam batas waktu, tampilan diganti fallback agar tidak ada kotak kosong yang
 * terlihat seperti embed berhasil.
 */
export function ImgurEmbed({ kind, id }: { kind: ImgurKind; id: string }) {
  const pageUrl = imgurPageUrl({ kind, id });
  const [frameState, setFrameState] = useState<"loading" | "ready" | "failed">(
    "loading",
  );

  useEffect(() => {
    if (kind !== "album") return;
    const timer = setTimeout(() => {
      setFrameState((current) => (current === "ready" ? current : "failed"));
    }, 9_000);
    return () => clearTimeout(timer);
  }, [kind, id]);

  if (kind !== "album") {
    return (
      <ArticleImage
        src={imgurDirectImageUrl(id)}
        alt={`Postingan Imgur ${id}`}
      />
    );
  }

  return (
    <figure className="border-2 border-ink bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-paper px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          <Images className="h-3.5 w-3.5" aria-hidden="true" />
          Imgur · Album
        </span>
        <a
          href={pageUrl}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink underline"
          {...LINK_SAFE}
        >
          Buka di Imgur
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      {frameState === "failed" ? (
        <div className="px-3 py-4">
          <MediaFallback
            title="Embed Imgur tidak dapat dimuat"
            detail="Album mungkin privat, sudah dihapus, atau embed diblokir peramban."
            href={pageUrl}
            label="Buka album di Imgur"
          />
        </div>
      ) : (
        <iframe
          src={imgurEmbedUrl(id)}
          title={`Album Imgur ${id}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          // Konten berasal dari origin lain (imgur.com). `allow-scripts` +
          // `allow-same-origin` diperlukan agar embed resmi dapat berjalan;
          // kombinasinya tidak berbahaya di sini karena dokumen tidak
          // sesama-origin dengan Saring.
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allow="fullscreen"
          onLoad={() => setFrameState("ready")}
          onError={() => setFrameState("failed")}
          className="block h-[360px] w-full border-0 sm:h-[480px]"
        />
      )}

      {/*
        Tautan fallback selalu terlihat. Iframe yang gagal (album privat,
        dihapus, atau diblokir) tetap memicu event `load` dengan halaman error
        pihak ketiga, sehingga kegagalan tidak selalu dapat dideteksi dari sisi
        Saring. Karena itu pembaca selalu diberi jalan keluar yang aman alih-alih
        kotak kosong tanpa penjelasan.
      */}
      <figcaption className="border-t-2 border-ink bg-paper px-3 py-1.5">
        <a
          href={pageUrl}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink underline"
          {...LINK_SAFE}
        >
          Jika embed tidak tampil, buka album di Imgur
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  );
}

