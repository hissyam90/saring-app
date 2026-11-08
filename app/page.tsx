import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CircleAlert,
  Eye,
  Key,
  ListChecks,
  Lock,
  MousePointerClick,
  ShieldCheck,
} from "lucide-react";
import { Checker } from "@/components/periksa/checker";
import { HeroScanner } from "@/components/motion/hero-scanner";
import { Reveal } from "@/components/motion/reveal";

const RECOVERY = [
  {
    href: "/langkah?kondisi=received-message",
    icon: ListChecks,
    title: "Baru menerima pesan",
    detail: "Verifikasi identitas tanpa menuduh.",
  },
  {
    href: "/langkah?kondisi=clicked-link",
    icon: MousePointerClick,
    title: "Terlanjur membuka tautan",
    detail: "Langkah aman bila belum mengisi data.",
  },
  {
    href: "/langkah?kondisi=entered-credentials",
    icon: Key,
    title: "Sudah memberi kode atau kata sandi",
    detail: "Amankan akun dan cabut sesi lain.",
  },
  {
    href: "/langkah?kondisi=transferred-money",
    icon: Banknote,
    title: "Sudah mentransfer uang",
    detail: "Hubungi penyedia pembayaran dan simpan bukti.",
  },
];

const PRINCIPLES = [
  {
    icon: Lock,
    title: "Privasi dirancang sejak awal",
    description:
      "Analisis pesan dan tautan berjalan sepenuhnya di peramban Anda. tanpa akun dan tanpa mengirim konten ke server.",
  },
  {
    icon: Eye,
    title: "Dapat dijelaskan",
    description:
      "Setiap sinyal disertai alasan, bukti, dan langkah yang disarankan. Bukan kotak hitam.",
  },
  {
    icon: CircleAlert,
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

            <div className="flex flex-col gap-4 sm:gap-6 max-w-4xl">
              <h1 className="text-[2.5rem] sm:text-[4.5rem] font-extrabold leading-[1.1] tracking-tight text-ink">
                Saring Sebelum <span className="italic font-serif text-ink">Sharing</span>.
              </h1>
              <div className="w-fit transform -rotate-1 sm:-rotate-2 hover:rotate-0 transition-transform duration-300">
                <span className="block border-[3px] border-ink bg-lime px-4 py-2 text-[1.8rem] sm:text-[3.2rem] font-black tracking-tight text-on-lime shadow-[6px_6px_0px_0px_var(--color-shadow)]">
                  Periksa Sebelum Percaya.
                </span>
              </div>
            </div>

            <p className="mt-4 max-w-[50ch] text-sm font-medium leading-6 text-ink/80 sm:mt-5 sm:text-base sm:leading-7">
              Belum tentu penipuan. Belum tentu aman. Kenali tandanya sebelum
              bertindak.
              Mulai dari pesan, nomor, atau tautan yang Anda terima.
            </p>

            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/80">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Tanpa akun
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                Analisis lokal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Hasil yang dijelaskan
              </span>
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[340px] lg:max-w-none">
            <HeroScanner />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-10">
        <Reveal>
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
              className="hidden items-center gap-2 border-2 border-ink bg-surface px-3 py-2 text-sm font-bold text-ink hover:text-on-lime shadow-neo-sm transition-none hover:bg-lime hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:inline-flex"
            >
              Buka halaman penuh
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <Checker />
        </Reveal>
      </section>

      <section className="border-y-2 border-ink bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-black tracking-tight text-ink">
              Prinsip kami
            </h2>
          </Reveal>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {PRINCIPLES.map((principle, index) => (
              <Reveal
                key={principle.title}
                delay={index * 80}
                className="h-full"
              >
                <div className="hover-lift h-full border-2 border-ink bg-surface p-4">
                  <span className="flex h-8 w-8 items-center justify-center bg-graphite text-lime">
                    <principle.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="mt-2.5 text-base font-bold text-ink">
                    {principle.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    {principle.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={80}>
            <p className="mt-5 max-w-3xl border-l-4 border-lime pl-3 text-sm leading-6 text-ink-muted">
              Saring adalah alat bantu pengambilan keputusan, bukan pengganti
              investigasi resmi, bank, penyedia layanan, atau aparat penegak
              hukum. Sumber pelaporan resmi seperti OJK tersedia di halaman
              Langkah.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6">
        <Reveal>
          <div className="border-b-2 border-ink pb-2">
            <h2 className="text-2xl font-black tracking-tight text-ink">
              Kalau sudah terlanjur
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
              Pemeriksaan hanya langkah pertama. Pilih kondisi Anda untuk
              mendapatkan urutan tindakan, bukti yang perlu disimpan, dan sumber
              bantuan resmi.
            </p>
          </div>
        </Reveal>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RECOVERY.map((item, index) => (
            <li key={item.href}>
              <Reveal delay={index * 60} className="h-full">
                <Link
                  href={item.href}
                  className="group flex h-full items-start gap-3 border-2 border-ink bg-surface px-3 py-3 hover-lift hover:bg-lime-soft"
                >
                  <item.icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-ink"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-snug text-ink">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-ink-muted">
                      {item.detail}
                    </span>
                  </span>
                  <ArrowRight
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
