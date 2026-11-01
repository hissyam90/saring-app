import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Notice, buttonClass } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Buat kata sandi baru",
  description: "Buat kata sandi baru untuk akun Saring Anda.",
};

const INVALID_LINK_MESSAGE =
  "Tautan reset tidak lengkap atau tidak valid. Minta tautan baru dari halaman lupa kata sandi.";

export default async function ResetSandiPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token.trim() : "";

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Akun
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink">
          Buat kata sandi baru
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Kata sandi baru minimal 10 karakter. Setelah tersimpan, semua sesi
          lama tidak berlaku dan Anda perlu masuk kembali.
        </p>
      </header>
      <div className="border-2 border-ink bg-surface p-5">
        {value ? (
          <ResetPasswordForm token={value} />
        ) : (
          <div className="grid gap-3">
            <Notice tone="error">{INVALID_LINK_MESSAGE}</Notice>
            <Link href="/lupa-sandi" className={buttonClass("primary")}>
              Minta tautan baru
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}