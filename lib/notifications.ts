import { getStore } from "@/lib/db";
import { logServerError } from "@/lib/api/helpers";
import type { NotificationKind } from "@/lib/db/types";

/**
 * Notifikasi dalam aplikasi.
 *
 * Setiap notifikasi wajib punya `dedupeKey` yang stabil untuk peristiwa
 * sumbernya (mis. `reply:{replyId}`), sehingga retry atau aksi berulang tidak
 * membuat notifikasi ganda — dijaga oleh indeks unik `(user_id, dedupe_key)`.
 *
 * Pesan notifikasi hanya berisi judul konten dan tautan internal; tidak pernah
 * memuat isi draf privat atau data sensitif.
 */

/** Saring teks agar pesan notifikasi tetap pendek dan tidak memuat data pribadi. */
function shortTitle(value: string, max = 90): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export interface NotifyInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  href?: string | null;
  dedupeKey: string;
}

/**
 * Membuat notifikasi dan tidak pernah melempar error.
 *
 * Kegagalan notifikasi tidak boleh menggagalkan operasi utama (balasan terkirim,
 * artikel disetujui). Kegagalan dicatat dalam bentuk yang sudah diredaksi.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await getStore().createNotification({
      userId: input.userId,
      kind: input.kind,
      title: shortTitle(input.title),
      body: input.body ? shortTitle(input.body, 140) : null,
      href: input.href ?? null,
      dedupeKey: input.dedupeKey,
    });
  } catch (error) {
    logServerError("notification", error);
  }
}

/** Notifikasi untuk balasan baru pada sebuah diskusi. */
export async function notifyThreadReply(input: {
  threadAuthorId: string;
  replierId: string;
  replierName: string;
  threadId: string;
  threadTitle: string;
  replyId: string;
}): Promise<void> {
  // Tidak perlu memberi tahu diri sendiri.
  if (input.threadAuthorId === input.replierId) return;

  await notify({
    userId: input.threadAuthorId,
    kind: "thread_reply",
    title: `${input.replierName} membalas pertanyaan Anda`,
    body: input.threadTitle,
    href: `/komunitas/${input.threadId}`,
    dedupeKey: `reply:${input.replyId}`,
  });
}

/** Notifikasi hasil tinjauan artikel (baru maupun revisi). */
export async function notifySubmissionReview(input: {
  authorId: string;
  submissionId: string;
  status: "approved" | "needs_revision" | "rejected";
  title: string;
  slug: string | null;
  note?: string | null;
}): Promise<void> {
  const kind: NotificationKind =
    input.status === "approved"
      ? "article_approved"
      : input.status === "needs_revision"
        ? "article_needs_revision"
        : "article_rejected";

  const headline =
    input.status === "approved"
      ? "Artikel Anda disetujui dan terbit di Pustaka"
      : input.status === "needs_revision"
        ? "Artikel Anda perlu diperbaiki"
        : "Artikel Anda ditolak";

  await notify({
    userId: input.authorId,
    kind,
    title: headline,
    body: input.note ?? input.title,
    href:
      input.status === "approved" && input.slug
        ? `/pustaka/${input.slug}`
        : "/komunitas/artikel",
    // Satu notifikasi per artikel + status: keputusan ulang dengan status
    // berbeda tetap memberi notifikasi baru, pengulangan yang sama tidak.
    dedupeKey: `submission:${input.submissionId}:${input.status}`,
  });
}

/** Notifikasi hasil tinjauan revisi artikel publik. */
export async function notifyRevisionReview(input: {
  authorId: string;
  revisionId: string;
  status: "approved" | "needs_revision" | "rejected";
  title: string;
  slug: string | null;
  note?: string | null;
}): Promise<void> {
  const kind: NotificationKind =
    input.status === "approved"
      ? "revision_approved"
      : input.status === "needs_revision"
        ? "revision_needs_revision"
        : "revision_rejected";

  const headline =
    input.status === "approved"
      ? "Revisi artikel Anda disetujui dan sudah terbit"
      : input.status === "needs_revision"
        ? "Revisi artikel Anda perlu diperbaiki"
        : "Revisi artikel Anda ditolak";

  await notify({
    userId: input.authorId,
    kind,
    title: headline,
    body: input.note ?? input.title,
    href: input.slug ? `/pustaka/${input.slug}` : "/komunitas/artikel",
    dedupeKey: `revision:${input.revisionId}:${input.status}`,
  });
}
