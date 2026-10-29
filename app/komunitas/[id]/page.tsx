import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStore } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import { ReplyForm } from "@/components/komunitas/reply-form";
import { ReportButton } from "@/components/komunitas/report-button";
import { Panel, Tag, formatDate } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const thread = await getStore().findThread(id);
  return { title: thread ? thread.title : "Diskusi tidak ditemukan" };
}

export default async function ThreadPage({ params }: Params) {
  const { id } = await params;
  const store = getStore();
  const thread = await store.findThread(id);
  if (!thread) notFound();

  const [replies, user] = await Promise.all([
    store.listReplies(id),
    getCurrentUser(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/komunitas"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Kembali ke Komunitas
      </Link>

      <article className="mt-3 border-2 border-ink bg-surface">
        <div className="border-b-2 border-ink bg-paper px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tag>{thread.category}</Tag>
            <span className="text-[11px] text-ink-muted">
              {formatDate(thread.createdAt)} · {thread.authorName}
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-black leading-snug tracking-tight text-ink">
            {thread.title}
          </h1>
        </div>
        <div className="px-4 py-4">
          <p className="whitespace-pre-wrap text-sm leading-7 text-ink-soft">
            {thread.body}
          </p>
          {thread.articleSlug ? (
            <p className="mt-3 border-t border-line pt-2 text-xs text-ink-muted">
              Terkait artikel:{" "}
              <Link
                href={`/pustaka/${thread.articleSlug}`}
                className="font-semibold text-ink underline"
              >
                {thread.articleSlug}
              </Link>
            </p>
          ) : null}
          <div className="mt-3 border-t border-line pt-2">
            <ReportButton
              targetType="thread"
              targetId={thread.id}
              canReport={Boolean(user)}
            />
          </div>
        </div>
      </article>

      <div className="mt-5">
        <Panel title={`${replies.length} balasan`}>
          {replies.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Belum ada balasan. Anda bisa menjadi yang pertama membantu.
            </p>
          ) : (
            <ul className="grid gap-2">
              {replies.map((reply) => (
                <li key={reply.id} className="border-l-4 border-l-ink bg-paper px-3 py-2.5">
                  <p className="text-[11px] text-ink-muted">
                    {reply.authorName} · {formatDate(reply.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink">
                    {reply.body}
                  </p>
                  <div className="mt-1.5">
                    <ReportButton
                      targetType="reply"
                      targetId={reply.id}
                      canReport={Boolean(user)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5 border-2 border-ink bg-surface p-4">
        {user ? (
          <ReplyForm threadId={thread.id} />
        ) : (
          <p className="text-sm leading-6 text-ink-muted">
            <Link href="/masuk" className="font-semibold text-ink underline">
              Masuk
            </Link>{" "}
            untuk menulis balasan.
          </p>
        )}
      </div>
    </div>
  );
}