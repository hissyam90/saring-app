import type { Metadata } from "next";
import { Library } from "@/components/pustaka/library";

export const metadata: Metadata = {
  title: "Pustaka",
  description:
    "Panduan singkat dan praktis untuk mengenali serta menghadapi penipuan daring.",
};

export default function PustakaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Pustaka kepercayaan digital
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Kumpulan panduan ringkas dan dapat ditindaklanjuti. Mulai dari
          mengenali bahasa manipulatif hingga menyimpan bukti untuk pelaporan.
        </p>
      </header>
      <Library />
    </div>
  );
}