import type { Metadata } from "next";
import { Guide } from "@/components/langkah/guide";

export const metadata: Metadata = {
  title: "Langkah selanjutnya",
  description:
    "Rencana tindakan sesuai kondisi Anda: pesan mencurigakan, tautan terlanjur dibuka, kredensial terbocor, hingga transfer yang sudah dilakukan.",
};

const VALID = new Set([
  "received-message",
  "clicked-link",
  "entered-credentials",
  "transferred-money",
  "account-takeover",
  "shared-documents",
]);

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
          Rencana tindakan
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Langkah selanjutnya
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          Pilih kondisi yang paling mendekati situasi Anda. Saring menyusun
          urutan tindakan, bukti yang perlu disimpan, hal yang perlu diperiksa,
          dan sumber bantuan resmi.
        </p>
      </header>
      <Guide initialSituation={initialSituation} />
    </div>
  );
}