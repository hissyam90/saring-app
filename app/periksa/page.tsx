import type { Metadata } from "next";
import { Checker } from "@/components/periksa/checker";

export const metadata: Metadata = {
  title: "Periksa pesan",
  description:
    "Periksa pesan mencurigakan dan pahami sinyal bahaya yang terdeteksi — seluruhnya berjalan di peramban Anda.",
};

export default function PeriksaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 border-b-2 border-ink pb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Ruang kerja pemeriksaan
        </p>
        <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
          Periksa pesan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          Satu tempat untuk tiga jenis pemeriksaan: pesan, nomor telepon, dan
          tautan. Analisis pesan dan struktur tautan berjalan lokal di peramban
          Anda; reputasi tautan hanya diperiksa melalui server setelah Anda
          memberikan persetujuan.
        </p>
      </header>
      <Checker />
    </div>
  );
}