import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-warn">
        Halaman tidak ditemukan
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink">404</h1>
      <p className="mt-3 text-ink-muted">
        Halaman yang kamu tuju tidak ada atau telah dipindahkan.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}