import type { Metadata } from "next";
import { Guide } from "@/components/langkah/guide";

export const metadata: Metadata = {
  title: "Langkah selanjutnya",
  description:
    "Panduan tindakan sesuai situasi: pesan mencurigakan, kredensial terbocor, hingga transfer yang terlanjur dilakukan.",
};

export default function LangkahPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Langkah selanjutnya
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Pilih situasimu untuk mendapatkan urutan tindakan yang tenang dan
          terprioritas, lengkap dengan daftar bukti yang perlu disimpan.
        </p>
      </header>
      <Guide />
    </div>
  );
}