import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Lupa kata sandi",
  description:
    "Minta tautan sekali pakai untuk membuat kata sandi baru akun Saring.",
};

export default async function LupaSandiPage() {
  const user = await getCurrentUser();
  if (user) redirect("/akun");

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Akun
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink">
          Lupa kata sandi
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Masukkan email akun Anda. Jika terdaftar, kami mengirim tautan sekali
          pakai untuk membuat kata sandi baru.
        </p>
      </header>
      <div className="border-2 border-ink bg-surface p-5">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}