import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { ThreadForm } from "@/components/komunitas/thread-form";
import { Notice } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Buat pertanyaan" };
export const dynamic = "force-dynamic";

export default async function NewThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ artikel?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");

  const { artikel } = await searchParams;
  const articleSlug =
    artikel && /^[a-z0-9-]{1,70}$/.test(artikel) ? artikel : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/komunitas"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Kembali ke Komunitas
      </Link>

      <header className="mb-5 mt-3">
        <h1 className="text-3xl font-black tracking-tight text-ink">
          Buat pertanyaan
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Tulis sejelas mungkin agar orang lain bisa membantu. Pertanyaan tampil
          sebagai diskusi publik dengan nama tampilan Anda.
        </p>
      </header>

      {articleSlug ? (
        <div className="mb-4">
          <Notice tone="info">
            Pertanyaan ini akan ditautkan ke artikel Pustaka terkait.
          </Notice>
        </div>
      ) : null}

      <div className="border-2 border-ink bg-surface p-5">
        <ThreadForm defaultArticleSlug={articleSlug} />
      </div>
    </div>
  );
}