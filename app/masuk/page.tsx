import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun Saring untuk ikut berdiskusi di Komunitas.",
};

export default async function MasukPage() {
  const user = await getCurrentUser();
  if (user) redirect("/akun");

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Akun
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink">Masuk</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Diperlukan hanya untuk menulis di Komunitas. Pemeriksaan pesan, nomor,
          dan tautan tetap bisa dipakai tanpa akun.
        </p>
      </header>
      <div className="border-2 border-ink bg-surface p-5">
        <AuthForm mode="login" />
      </div>
    </div>
  );
}