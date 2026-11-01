"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { buttonClass, Notice } from "@/components/ui/primitives";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

const SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || null;

const inputClass =
  "mt-1 w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-placeholder";

const FALLBACK_MESSAGE =
  "Jika alamat email itu terdaftar, kami sudah mengirim tautan untuk membuat kata sandi baru. Periksa kotak masuk dan folder spam.";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const onToken = useCallback((value: string | null) => setToken(value), []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {
      email: String(form.get("email") ?? ""),
    };
    if (token) payload.captchaToken = token;

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        setError(data?.error ?? "Permintaan tidak dapat diproses.");
        return;
      }

      setMessage(data?.message ?? FALLBACK_MESSAGE);
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setPending(false);
    }
  };

  if (message) {
    return (
      <div className="grid gap-3">
        <Notice tone="success">{message}</Notice>
        <p className="text-xs leading-5 text-ink-muted">
          Tautan hanya berlaku sekali dan memiliki masa berlaku terbatas. Saring
          tidak pernah menanyakan kata sandi baru Anda lewat pesan atau telepon.
        </p>
        <Link href="/masuk" className={buttonClass("secondary")}>
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <div>
        <label htmlFor="email" className="text-sm font-semibold text-ink">
          Email akun
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          placeholder="nama@email.com"
        />
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          Masukkan email yang Anda pakai untuk mendaftar. Kami tidak menampilkan
          apakah email tersebut terdaftar.
        </p>
      </div>

      <TurnstileWidget
        siteKey={SITE_KEY}
        action="forgot-password"
        onToken={onToken}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Memproses..." : "Kirim tautan reset"}
      </button>

      <p className="text-xs leading-5 text-ink-muted">
        Ingat kata sandi?{" "}
        <Link href="/masuk" className="font-semibold text-ink underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}