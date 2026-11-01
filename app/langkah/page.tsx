import type { Metadata } from "next";
import { Guide } from "@/components/langkah/guide";
import { SAFETY_GUIDES } from "@/data/guides";

export const metadata: Metadata = {
  title: "Pusat Bantuan & Pelaporan",
  description:
    "Panduan tindakan dan kanal resmi untuk menghadapi pesan, nomor, tautan, akun, atau transaksi mencurigakan.",
};

const VALID = new Set(SAFETY_GUIDES.map((guide) => guide.id));

export default async function LangkahPage({
  searchParams,
}: {
  searchParams: Promise<{ kondisi?: string }>;
}) {
  const { kondisi } = await searchParams;
  const initialSituation = kondisi && VALID.has(kondisi) ? kondisi : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Pusat bantuan &amp; pelaporan
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Pusat Bantuan &amp; Pelaporan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          Pilih kondisi yang paling mendekati situasi Anda. Saring menyusun
          tindakan prioritas, checklist bukti, dan kanal resmi yang dapat dibuka
          langsung. Data Anda tidak dikirim atau disimpan oleh Saring.
        </p>
      </header>
      <Guide initialSituation={initialSituation} />
    </div>
  );
}