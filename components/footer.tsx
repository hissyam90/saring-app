import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t-2 border-lime bg-graphite text-paper">
      <div className="mx-auto grid gap-8 px-4 py-12 sm:px-6 lg:max-w-6xl md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-lime text-ink">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">Saring</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-paper/70">
            Berhenti sebentar. Periksa sinyalnya. Pendamping kepercayaan digital
            untuk mengenali penipuan daring.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-lime">
            Alat
          </p>
          <ul className="mt-2 space-y-0.5 text-sm text-paper/70">
            <li><Link href="/periksa" className="inline-flex min-h-6 items-center py-1 hover:text-lime hover:underline">Periksa pesan, nomor, dan tautan</Link></li>
            <li><Link href="/latihan" className="inline-flex min-h-6 items-center py-1 hover:text-lime hover:underline">Latihan pengambilan keputusan</Link></li>
            <li><Link href="/langkah" className="inline-flex min-h-6 items-center py-1 hover:text-lime hover:underline">Panduan langkah selanjutnya</Link></li>
            <li><Link href="/pustaka" className="inline-flex min-h-6 items-center py-1 hover:text-lime hover:underline">Pustaka kepercayaan digital</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-lime">
            Prinsip
          </p>
          <p className="mt-3 text-sm leading-6 text-paper/70">
            Privasi dirancang sejak awal: analisis pesan dan tautan berjalan
            sepenuhnya di peramban Anda. Pemeriksaan nomor menyerahkan
            verifikasi ke sumber resmi tanpa mengirim data secara otomatis.
          </p>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-paper/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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