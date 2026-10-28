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
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="inline-flex items-center gap-2 border-2 border-ink bg-lime px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Pendamping kepercayaan digital
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Berhenti sebentar. Periksa sinyalnya.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-paper/80">
            Belum tentu penipuan. Belum tentu aman. Kenali tandanya sebelum
            bertindak — mulai dari pesan, nomor, atau tautan yang Anda terima.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">
              Coba langsung
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Tiga mode pemeriksaan. Muat contoh fiktif atau masukkan data Anda
              sendiri.
            </p>
          </div>
          <Link
            href="/periksa"
            className="inline-flex items-center gap-2 border-2 border-ink bg-surface px-3 py-2 text-sm font-bold text-ink shadow-neo-sm transition-none hover:bg-lime"
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

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Empat cara Saring membantumu
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group rounded-2xl border border-line bg-surface p-5 shadow-sm transition-colors hover:border-ink-soft"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-paper">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-muted">
                {feature.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-warn">
                Buka
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Prinsip kami</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.title}
                className="rounded-2xl border border-paper/10 p-5"
              >
                <principle.icon className="h-6 w-6 text-warn" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold">{principle.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-paper/70">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm leading-6 text-paper/60">
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
