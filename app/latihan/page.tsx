import type { Metadata } from "next";
import { Simulator } from "@/components/latihan/simulator";

export const metadata: Metadata = {
  title: "Latihan keputusan",
  description:
    "Berlatih mengambil keputusan aman lewat skenario interaktif penipuan daring.",
};

export default function LatihanPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Latihan keputusan
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Hadapi skenario fiktif dan pilih langkahmu. Setiap pilihan dijelaskan
          alasannya, supaya kamu makin teliti saat menghadapi situasi nyata.
        </p>
      </header>
      <Simulator />
    </div>
  );
}