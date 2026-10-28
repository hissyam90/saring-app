import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Eye,
  ListChecks,
  Lock,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Checker } from "@/components/periksa/checker";

const FEATURES = [
  {
    href: "/periksa",
    icon: ScanSearch,
    title: "Periksa",
    description: "Pesan, nomor, dan tautan dalam satu ruang kerja.",
  },
  {
    href: "/latihan",
    icon: ShieldCheck,
    title: "Latihan",
    description: "Berlatih mengambil keputusan aman lewat 8 skenario.",
  },
  {
    href: "/langkah",
    icon: ListChecks,
    title: "Langkah",
    description: "Panduan tindakan terprioritas sesuai situasi Anda.",
  },
  {
    href: "/pustaka",
    icon: BookOpen,
    title: "Pustaka",
    description: "Panduan ringkas mengenali dan menghadapi penipuan.",
  },
];

const MODES = [
  {
    n: "01",
    title: "Periksa pesan",
    detail: "Sinyal bahaya, kutipan bukti, dan langkah aman.",
    tag: "lokal",
  },
  {
    n: "02",
    title: "Periksa nomor",
    detail: "Perilaku pengirim dinilai di Saring, bukan reputasi nomor.",
    tag: "berbasis perilaku",
  },
  {
    n: "03",
    title: "Periksa tautan",
    detail: "Struktur URL diperiksa sebagai teks, tidak dibuka.",
    tag: "opsional",
  },
];

const PRINCIPLES = [
  {
    icon: Lock,
    title: "Privasi dirancang sejak awal",
    description:
      "Analisis pesan dan tautan berjalan sepenuhnya di peramban Anda — tanpa akun dan tanpa mengirim konten ke server.",
  },
  {
    icon: Eye,
    title: "Dapat dijelaskan",
    description:
      "Setiap sinyal disertai alasan, bukti, dan langkah yang disarankan. Bukan kotak hitam.",
  },
  {
    icon: Sparkles,
    title: "Jujur soal ketidakpastian",
    description:
      "Tidak ada label “aman”. Saring menyajikan indikator, bukan keputusan atau tuduhan.",
  },
];

export default function Home() {
  return (
    <>
      <section className="border-b-2 border-ink bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-7 sm:gap-8 sm:px-6 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 border-2 border-lime bg-lime px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Pendamping kepercayaan digital
            </p>
            <h1 className="mt-3 max-w-xl text-[2.1rem] font-extrabold leading-[1.06] tracking-tight sm:mt-4 sm:text-6xl">
              Berhenti
              <br className="hidden sm:block" /> sebentar.
              <span className="mt-1 block text-lime">Periksa sinyalnya.</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-paper/75 sm:mt-4 sm:text-base sm:leading-7">
              Belum tentu penipuan. Belum tentu aman. Kenali tandanya sebelum
              bertindak — mulai dari pesan, nomor, atau tautan yang Anda terima.
            </p>
          </div>

          <div className="border-2 border-paper/25">
            <p className="hidden border-b-2 border-paper/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-paper/60 sm:block">
              Tiga jalur pemeriksaan
            </p>
            <ul className="divide-y-2 divide-paper/15">
              {MODES.map((mode) => (
                <li
                  key={mode.n}
                  className="flex items-baseline gap-3 px-4 py-2.5 sm:gap-4 sm:py-3"
                >
                  <span className="w-7 shrink-0 font-mono text-xs font-bold text-lime">
                    {mode.n}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-paper">
                      {mode.title}
                    </span>
                    <span className="mt-0.5 hidden text-xs leading-5 text-paper/60 sm:block">
                      {mode.detail}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 border border-paper/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-paper/70">
                    {mode.tag}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              Coba langsung
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Tiga mode pemeriksaan. Muat contoh fiktif atau masukkan data Anda
              sendiri.
            </p>
          </div>
          <Link
            href="/periksa"
            className="hidden items-center gap-2 border-2 border-ink bg-surface px-3 py-2 text-sm font-bold text-ink shadow-neo-sm transition-none hover:bg-lime sm:inline-flex"
          >
            Buka halaman penuh
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <Checker />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">
          Bagian lain dari Saring
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group border-2 border-ink bg-surface p-4 shadow-neo-sm transition-none hover:-translate-y-0.5 hover:bg-lime-soft active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-lime text-ink">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-base font-bold text-ink">
                {feature.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                {feature.description}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-ink">
                Buka
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t-2 border-ink bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight">Prinsip kami</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.title}
                className="border-2 border-paper/25 p-4"
              >
                <principle.icon className="h-6 w-6 text-lime" aria-hidden="true" />
                <h3 className="mt-3 text-base font-bold">{principle.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-paper/70">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-paper/60">
            Saring adalah alat bantu pengambilan keputusan, bukan pengganti
            investigasi resmi, bank, penyedia layanan, atau aparat penegak
            hukum. Sumber pelaporan resmi seperti OJK tersedia di halaman
            Langkah.
          </p>
        </div>
      </section>

    </>
  );
}
