import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Buat akun Saring untuk ikut berdiskusi dan mengajukan artikel.",
};

export default async function DaftarPage() {
  const user = await getCurrentUser();
  if (user) redirect("/akun");

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Akun
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink">Daftar</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Gunakan nama tampilan, bukan nama lengkap. Kami tidak meminta nomor
          telepon atau identitas apa pun.
        </p>
      </header>
      <div className="border-2 border-ink bg-surface p-5">
        <AuthForm mode="register" />
      </div>
    </div>
  );
}