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
      <section className="relative overflow-hidden border-b-2 border-ink bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-9 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 border-2 border-ink bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Pendamping kepercayaan digital
            </p>

            <h1 className="mt-4 text-[2.15rem] font-black leading-[1.02] tracking-[-0.02em] text-ink sm:mt-5 sm:text-[3.9rem]">
              Berhenti
              <br className="hidden sm:block" /> sebentar.
              <span className="mt-2 block w-fit border-2 border-ink bg-lime px-2 py-0.5 sm:mt-3 sm:px-3">
                Periksa sinyalnya.
              </span>
            </h1>

            <p className="mt-4 max-w-[34ch] text-sm font-medium leading-6 text-ink/80 sm:mt-5 sm:text-base sm:leading-7">
              Belum tentu penipuan. Belum tentu aman. Kenali tandanya sebelum
              bertindak.
              Mulai dari pesan, nomor, atau tautan yang Anda terima.
            </p>

            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/60">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Tanpa akun
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                Analisis lokal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Hasil yang dijelaskan
              </span>
            </p>
          </div>

          <div className="border-2 border-ink bg-surface shadow-neo-lg">
            <div className="flex items-center justify-between gap-2 border-b-2 border-ink bg-paper px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                Tiga jalur pemeriksaan
              </p>
              <span className="font-mono text-[10px] font-bold text-ink-muted">
                3 mode
              </span>
            </div>
            <ul className="divide-y-2 divide-line">
              {MODES.map((mode) => (
                <li key={mode.n} className="flex items-start gap-3 px-3 py-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border-2 border-ink bg-lime font-mono text-[10px] font-bold text-ink">
                    {mode.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-tight text-ink">
                      {mode.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-ink-muted">
                      {mode.detail}
                    </span>
                  </span>
                  <span className="mt-0.5 shrink-0 border border-ink/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
                    {mode.tag}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="border-l-4 border-lime pl-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              Langkah pertama
            </p>
            <h2 className="mt-0.5 text-2xl font-black tracking-tight text-ink sm:text-3xl">
              Coba langsung
            </h2>
            <p className="mt-1 max-w-lg text-sm leading-6 text-ink-muted">
              Pilih mode, masukkan data, lalu baca hasilnya di bawah ini. Muat
              contoh fiktif bila ingin mencoba tanpa data pribadi.
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
        <div className="flex items-baseline justify-between gap-3 border-b-2 border-ink pb-2">
          <h2 className="text-2xl font-black tracking-tight text-ink">
            Bagian lain dari Saring
          </h2>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {FEATURES.map((feature) => (
            <li key={feature.href}>
              <Link
                href={feature.href}
                className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-lime-soft"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-graphite text-lime">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-ink">
                    {feature.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-6 text-ink-muted">
                    {feature.description}
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-ink"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t-2 border-ink bg-graphite text-paper">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-black tracking-tight">Prinsip kami</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.title}
                className="border border-white/20 p-4"
              >
                <principle.icon className="h-6 w-6 text-lime" aria-hidden="true" />
                <h3 className="mt-3 text-base font-bold">{principle.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-paper/65">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-6 text-paper/55">
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
