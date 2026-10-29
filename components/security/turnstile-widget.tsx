"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Widget Turnstile. Token dikirim ke server untuk diverifikasi; komponen ini
 * tidak pernah menentukan sendiri bahwa verifikasi berhasil.
 */
export function TurnstileWidget({
  siteKey,
  action,
  onToken,
}: {
  siteKey: string | null;
  action: string;
  onToken: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;

    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      widgetRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "light",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => {
          setFailed(true);
          onToken(null);
        },
      });
    };

    if (window.turnstile) {
      render();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`,
      );
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      script.addEventListener("error", () => setFailed(true));
    }

    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, [siteKey, action, onToken]);

  if (!siteKey) {
    return (
      <p className="border-l-4 border-l-amber bg-amber-soft px-3 py-2 text-xs leading-5 text-ink">
        Verifikasi keamanan belum dikonfigurasi di server ini. Pengiriman akan
        ditolak sampai administrator menyiapkan Cloudflare Turnstile.
      </p>
    );
  }

  return (
    <div className="min-h-16">
      <div ref={containerRef} />
      {failed ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Widget verifikasi gagal dimuat. Muat ulang halaman.
        </p>
      ) : null}
    </div>
  );
}