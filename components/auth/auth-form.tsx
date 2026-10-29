"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { buttonClass, Notice } from "@/components/ui/primitives";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

const SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || null;

const inputClass =
  "mt-1 w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const onToken = useCallback((value: string | null) => setToken(value), []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    if (mode === "register") {
      payload.displayName = String(form.get("displayName") ?? "");
    }
    if (token) payload.captchaToken = token;

    try {
      const response = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Permintaan tidak dapat diproses.");
        return;
      }

      router.push("/akun");
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      {mode === "register" ? (
        <div>
          <label htmlFor="displayName" className="text-sm font-semibold text-ink">
            Nama tampilan
          </label>
          <input
            id="displayName"
            name="displayName"
            required
            minLength={3}
            maxLength={40}
            autoComplete="nickname"
            className={inputClass}
            placeholder="Nama yang tampil di diskusi"
          />
          <p className="mt-1 text-xs text-ink-muted">
            Jangan pakai nama lengkap atau data pribadi.
          </p>
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="text-sm font-semibold text-ink">
          Email
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
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-semibold text-ink">
          Kata sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 10 : 1}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          className={inputClass}
          placeholder={mode === "register" ? "Minimal 10 karakter" : "Kata sandi Anda"}
        />
      </div>

      <TurnstileWidget
        siteKey={SITE_KEY}
        action={mode === "login" ? "login" : "register"}
        onToken={onToken}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending
          ? "Memproses..."
          : mode === "login"
            ? "Masuk"
            : "Buat akun"}
      </button>

      <p className="text-xs leading-5 text-ink-muted">
        {mode === "login" ? (
          <>
            Belum punya akun?{" "}
            <Link href="/daftar" className="font-semibold text-ink underline">
              Daftar
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link href="/masuk" className="font-semibold text-ink underline">
              Masuk
            </Link>
          </>
        )}
      </p>
    </form>
  );
}