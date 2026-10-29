import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t-2 border-lime bg-graphite text-graphite-ink">
      <div className="mx-auto grid gap-8 px-4 py-12 sm:px-6 lg:max-w-6xl md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-lime text-on-lime">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">Saring</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-graphite-ink/75">
            Berhenti sebentar. Periksa sinyalnya. Pendamping kepercayaan digital
            untuk mengenali penipuan daring.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-lime">
            Alat
          </p>
          <ul className="mt-2 space-y-0.5 text-sm text-graphite-ink/75">
            <li><Link href="/periksa" className="inline-flex min-h-6 items-center py-1 hover:text-lime hover:underline">Periksa</Link></li>
            <li><Link href="/latihan" className="inline-flex min-h-6 items-center py-1 hover:text-lime hover:underline">Latihan</Link></li>
            <li><Link href="/langkah" className="inline-flex min-h-6 items-center py-1 hover:text-lime hover:underline">Langkah</Link></li>
            <li><Link href="/pustaka" className="inline-flex min-h-6 items-center py-1 hover:text-lime hover:underline">Pustaka</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-lime">
            Yang tidak bisa dilakukan Saring
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-graphite-ink/75">
            <li>Tidak memastikan identitas pengirim pesan.</li>
            <li>Tidak memeriksa reputasi nomor telepon.</li>
            <li>Tidak menjamin dana kembali setelah transfer.</li>
            <li>Tidak menggantikan laporan resmi ke bank atau kepolisian.</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-graphite-ink/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-graphite-ink/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Saring menyediakan panduan umum, bukan keputusan hukum atau jaminan
            deteksi.
          </p>
          <p>© {new Date().getFullYear()} Saring.</p>
        </div>
      </div>
    </footer>
  );
}