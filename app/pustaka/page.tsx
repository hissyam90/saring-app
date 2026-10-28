import type { Metadata } from "next";
import { Library } from "@/components/pustaka/library";

export const metadata: Metadata = {
  title: "Pustaka",
  description:
    "Panduan singkat dan praktis untuk mengenali serta menghadapi penipuan daring.",
};

export default function PustakaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Pustaka
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Pustaka kepercayaan digital
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          Empat belas panduan tentang modus yang paling sering terjadi di
          Indonesia, ditulis untuk dipakai, bukan sekadar dibaca.
        </p>
      </header>
      <Library />
    </div>
  );
}