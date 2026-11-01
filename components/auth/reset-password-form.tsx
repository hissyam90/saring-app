"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass, Notice } from "@/components/ui/primitives";

const inputClass =
  "mt-1 w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-placeholder";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        setError(data?.error ?? "Tautan reset tidak dapat dipakai.");
        return;
      }

      setMessage(
        data?.message ??
          "Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.",
      );
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
          Semua sesi lama sudah tidak berlaku. Masuk kembali dengan kata sandi
          baru Anda.
        </p>
        <Link href="/masuk" className={buttonClass("primary")}>
          Masuk sekarang
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <div>
        <label htmlFor="password" className="text-sm font-semibold text-ink">
          Kata sandi baru
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          className={inputClass}
          placeholder="Minimal 10 karakter"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="text-sm font-semibold text-ink">
          Ulangi kata sandi baru
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          className={inputClass}
          placeholder="Ulangi kata sandi baru"
        />
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Menyimpan..." : "Simpan kata sandi baru"}
      </button>

      <p className="text-xs leading-5 text-ink-muted">
        Tautan ini hanya bisa dipakai satu kali. Jika sudah kedaluwarsa, minta{" "}
        <Link href="/lupa-sandi" className="font-semibold text-ink underline">
          tautan baru
        </Link>
        .
      </p>
    </form>
  );
}