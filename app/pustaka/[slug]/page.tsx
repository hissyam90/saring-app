import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react";
import { LIBRARY, readingMinutes, articleWordCount } from "@/data/resources";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LIBRARY.map((article) => ({ slug: article.id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = LIBRARY.find((item) => item.id === slug);
  if (!article) return { title: "Artikel tidak ditemukan" };
  return { title: article.title, description: article.summary };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = LIBRARY.find((item) => item.id === slug);

  if (!article) notFound();

  const minutes = readingMinutes(article);
  const words = articleWordCount(article);
  const related = (article.related ?? [])
    .map((id) => LIBRARY.find((item) => item.id === id))
    .filter((item): item is (typeof LIBRARY)[number] => Boolean(item));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
          <li>
            <Link href="/pustaka" className="hover:text-ink hover:underline">
              Pustaka
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-ink">{article.category}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
        <article className="min-w-0">
          <header className="border-b-2 border-ink pb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              {article.category}
            </p>
            <h1 className="mt-2 text-3xl font-black leading-[1.12] tracking-tight text-ink sm:text-[2.6rem]">
              {article.title}
            </h1>
            <p className="mt-3 max-w-[62ch] text-base leading-7 text-ink-soft">
              {article.summary}
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
              {minutes} menit baca · {words} kata
            </p>
          </header>

          <div className="mt-8 max-w-[68ch]">
            {article.sections.map((section) => (
              <section key={section.heading} className="mb-8">
                <h2 className="text-lg font-bold leading-snug tracking-tight text-ink">
                  {section.heading}
                </h2>
                <p className="mt-2 text-[15px] leading-7 text-ink-soft">
                  {section.body}
                </p>

                {section.bullets ? (
                  <ul className="mt-3 grid gap-1.5">
                    {section.bullets.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-[15px] leading-7 text-ink-soft"
                      >
                        <span
                          className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-ink"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {section.callout ? (
                  <p className="mt-4 border-l-4 border-lime bg-graphite px-4 py-3 text-sm leading-6 text-paper">
                    {section.callout}
                  </p>
                ) : null}
              </section>
            ))}
          </div>

          {article.checklist?.length ? (
            <section className="mt-2 border-2 border-ink bg-surface">
              <h2 className="border-b-2 border-ink bg-paper px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                Daftar periksa
              </h2>
              <ul className="grid gap-2 px-4 py-3.5">
                {article.checklist.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-safe"
                      aria-hidden="true"
                    />
                    <span className="text-sm leading-6 text-ink">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {article.sources?.length ? (
            <section className="mt-6 border-t border-line pt-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                Sumber rujukan
              </h2>
              <ul className="mt-2 grid gap-2">
                {article.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-start gap-2 text-sm"
                    >
                      <ExternalLink
                        className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
                        aria-hidden="true"
                      />
                      <span>
                        <span className="font-semibold text-ink underline-offset-2 group-hover:underline">
                          {source.label}
                        </span>
                        {source.note ? (
                          <span className="mt-0.5 block text-xs text-ink-muted">
                            {source.note}
                          </span>
                        ) : null}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-ink-muted">
            Artikel ini bersifat edukatif dan tidak menggantikan penanganan
            resmi dari bank, penyedia layanan, atau aparat penegak hukum.
          </p>
        </article>

        <aside className="lg:sticky lg:top-6">
          {article.sections.length >= 4 ? (
            <nav aria-label="Daftar isi" className="border-2 border-ink bg-surface">
              <p className="border-b border-line px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                Daftar isi
              </p>
              <ol className="grid gap-1 px-3 py-2.5">
                {article.sections.map((section, index) => (
                  <li key={section.heading} className="text-xs leading-5">
                    <span className="mr-1.5 font-mono text-ink-muted">
                      {index + 1}.
                    </span>
                    <span className="text-ink-soft">{section.heading}</span>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <Link
            href="/pustaka"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 border-2 border-ink bg-surface px-3 text-sm font-bold text-ink hover:bg-lime"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Semua artikel
          </Link>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-12 border-t-2 border-ink pt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            Artikel terkait
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/pustaka/${item.id}`}
                  className="group flex h-full flex-col border-2 border-ink bg-surface px-4 py-3 transition-colors hover:bg-lime-soft"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                    {item.category}
                  </span>
                  <span className="mt-1 text-sm font-bold leading-snug text-ink">
                    {item.title}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink">
                    Baca
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}