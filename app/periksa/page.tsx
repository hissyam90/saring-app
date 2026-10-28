import type { Metadata } from "next";
import { Checker } from "@/components/periksa/checker";

export const metadata: Metadata = {
  title: "Periksa pesan",
  description:
    "Periksa pesan mencurigakan dan pahami sinyal bahaya yang terdeteksi — seluruhnya berjalan di peramban Anda.",
};

export default function PeriksaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Periksa pesan
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Tempelkan pesan yang kamu curigai. Saring akan memeriksa pola bahaya
          yang umum dan menjelaskan setiap temuannya — tanpa mengirim pesanmu ke
          mana pun.
        </p>
      </header>
      <Checker />
    </div>
  );
}