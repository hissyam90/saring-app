"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

/**
 * Status verifikasi Turnstile yang dilaporkan ke komponen induk.
 *
 * Mesin status dibuat eksplisit agar induk dapat:
 * - menonaktifkan tombol kirim selama `loading`,
 * - mengaktifkannya hanya saat `ready`,
 * - membatalkannya kembali saat token `expired` atau widget `error`,
 * - dan menjelaskan `not-configured` (server fail-closed).
 *
 * Hanya `ready` yang membawa token; status lain selalu `token: null`.
 *
 * Status `loading`/`not-configured` ditetapkan langsung oleh useState awal
 * (bukan di dalam effect), sehingga tidak memicu render berantai. Status
 * berubah lewat callback Turnstile (proses asinkron) atau lewat event handler
 * tombol "coba lagi".
 */
export type TurnstileState =
  | "not-configured"
  | "loading"
  | "ready"
  | "expired"
  | "error";

export interface TurnstileStatus {
  state: TurnstileState;
  /** Token siteverify; hanya berisi saat `state === "ready"`. */
  token: string | null;
}

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
 * Cache janji pemuatan script agar script hanya dimuat **sekali** meskipun
 * halaman merender banyak widget Turnstile. Janji di-reset setelah berhasil/
 * gagal sehingga percobaan ulang dapat memuat ulang script yang sebelumnya
 * gagal. Listener `load`/`error` memakai `{ once: true }` sehingga tidak
 * menumpuk dan otomatis dibersihkan.
 */
let scriptPromise: Promise<TurnstileApi | null> | null = null;

function loadTurnstileScript(): Promise<TurnstileApi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi | null>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );

    // Script sebelumnya gagal dimuat: buang agar percobaan ulang membuat yang baru.
    if (script && script.dataset.error === "true") {
      script.remove();
      script = null;
    }

    const onLoad = () => {
      scriptPromise = null;
      resolve(window.turnstile ?? null);
    };
    const onError = () => {
      if (script) script.dataset.error = "true";
      scriptPromise = null;
      reject(new Error("turnstile-load-failed"));
    };

    if (script) {
      // Script sudah ada (dimuat widget lain) dan belum selesai: tunggu hasilnya.
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      return;
    }

    script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function TurnstileWidget({
  siteKey,
  action,
  onStatus,
}: {
  siteKey: string | null;
  action: string;
  onStatus: (status: TurnstileStatus) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const [status, setStatus] = useState<TurnstileState>(
    siteKey ? "loading" : "not-configured",
  );
  const [retryNonce, setRetryNonce] = useState(0);

  const report = useCallback(
    (next: TurnstileStatus) => {
      setStatus(next.state);
      onStatus(next);
    },
    [onStatus],
  );

  useEffect(() => {
    // siteKey null: status awal sudah `not-configured`; tidak ada yang perlu
    // dimuat, dan tidak ada setState sinkron yang dijalankan di sini.
    if (!siteKey) return;

    let cancelled = false;

    const render = (api: TurnstileApi) => {
      if (cancelled || !containerRef.current) return;
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
      }
      widgetRef.current = api.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "light",
        callback: (token: string) => {
          if (!cancelled) report({ state: "ready", token });
        },
        "expired-callback": () => {
          if (!cancelled) report({ state: "expired", token: null });
        },
        "error-callback": () => {
          if (!cancelled) report({ state: "error", token: null });
        },
      });
    };

    // Tidak mengasumsikan script sudah siap hanya karena elemen DOM muncul:
    // kita menunggu janji pemuatan selesai sebelum merender widget.
    loadTurnstileScript()
      .then((api) => {
        if (cancelled) return;
        if (!api) {
          report({ state: "error", token: null });
          return;
        }
        render(api);
      })
      .catch(() => {
        if (!cancelled) report({ state: "error", token: null });
      });

    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, [siteKey, action, report, retryNonce]);

  return (
    <div className="min-h-16">
      <div ref={containerRef} aria-live="polite" />
      {status === "loading" ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Menyiapkan verifikasi keamanan…
        </p>
      ) : null}
      {status === "not-configured" ? (
        <p className="border-l-4 border-l-amber bg-amber-soft px-3 py-2 text-xs leading-5 text-ink">
          Verifikasi keamanan belum dikonfigurasi di server ini. Pengiriman akan
          ditolak sampai administrator menyiapkan Cloudflare Turnstile.
        </p>
      ) : null}
      {status === "error" || status === "expired" ? (
        <div className="mt-1.5">
          <p role="alert" className="text-xs leading-5 text-ink-coral">
            {status === "expired"
              ? "Verifikasi kedaluwarsa. Lakukan verifikasi ulang."
              : "Verifikasi keamanan gagal dimuat."}
          </p>
          <button
            type="button"
            onClick={() => {
              report({ state: "loading", token: null });
              setRetryNonce((n) => n + 1);
            }}
            className="mt-1 inline-flex min-h-8 items-center border-2 border-ink bg-surface px-2.5 text-xs font-bold text-ink hover:bg-paper"
          >
            Coba verifikasi lagi
          </button>
        </div>
      ) : null}
    </div>
  );
}