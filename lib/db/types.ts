export type Role = "user" | "admin";

import type { RichDoc } from "@/lib/content/rich-text";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

export interface UserWithHash extends User {
  passwordHash: string;
}

export type ThreadCategory =
  | "phishing"
  | "transaksi"
  | "lowongan"
  | "penyamaran"
  | "akun"
  | "lainnya";

export const THREAD_CATEGORIES: { id: ThreadCategory; label: string }[] = [
  { id: "phishing", label: "Phishing" },
  { id: "transaksi", label: "Penipuan transaksi" },
  { id: "lowongan", label: "Lowongan kerja palsu" },
  { id: "penyamaran", label: "Penyamaran identitas" },
  { id: "akun", label: "Keamanan akun" },
  { id: "lainnya", label: "Lainnya" },
];

/**
 * Kategori default untuk pertanyaan baru.
 *
 * "Lainnya" dipakai sebagai default karena banyak pertanyaan pengguna tidak
 * langsung cocok dengan satu kategori. Pengguna tetap dapat memilih kategori
 * lain, dan kategori pertanyaan lama tidak diubah otomatis oleh migration.
 */
export const DEFAULT_THREAD_CATEGORY: ThreadCategory = "lainnya";

export function threadCategoryLabel(id: string): string {
  return THREAD_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export type SubmissionStatus =
  | "pending"
  | "approved"
  | "needs_revision"
  | "rejected";

export type ReportStatus = "open" | "reviewing" | "resolved";

export type ReportTarget = "thread" | "reply";

export interface Thread {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  category: ThreadCategory;
  body: string;
  replyCount: number;
  articleSlug: string | null;
  createdAt: string;
}

export interface Reply {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  summary: string;
  category: string;
  /**
   * Proyeksi teks biasa dari {@link bodyJson}. Dipertahankan agar artikel lama
   * (dan data plain text) tetap dapat dibaca, dicari, dan ditampilkan.
   */
  body: string;
  /**
   * Dokumen rich text tervalidasi. `null` untuk artikel lama yang hanya punya
   * teks biasa, atau bila dokumen tidak lolos validasi saat dibaca.
   */
  bodyJson: RichDoc | null;
  references: string | null;
  status: SubmissionStatus;
  reviewNote: string | null;
  slug: string | null;
  /**
   * Soft archive: bila terisi, artikel tidak tampil di Pustaka dan tidak dapat
   * diakses lewat URL langsung. Artikel dan riwayat revisinya tetap utuh.
   */
  archivedAt: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** Artikel kontribusi yang sudah disetujui dan tampil di Pustaka. */
export interface PublishedArticle {
  slug: string;
  /** Baris `submissions` sumber artikel ini (untuk alur revisi). */
  submissionId: string;
  /** Penulis artikel, dipakai untuk menampilkan aksi Edit pemilik. */
  authorId: string;
  title: string;
  summary: string;
  category: string;
  body: string;
  bodyJson: RichDoc | null;
  references: string | null;
  authorName: string;
  publishedAt: string;
}

/** Status revisi artikel publik. */
export type RevisionStatus =
  | "pending"
  | "approved"
  | "needs_revision"
  | "rejected";

/**
 * Revisi untuk artikel yang sudah terbit.
 *
 * Konten publik tetap berada di `submissions`. Baris revisi hanya berisi
 * **usulan** perubahan; ia menjadi publik hanya setelah admin menyetujuinya
 * (lihat `Store.publishRevision`).
 */
export interface SubmissionRevision {
  id: string;
  submissionId: string;
  authorId: string;
  authorName: string;
  title: string;
  summary: string;
  category: string;
  body: string;
  bodyJson: RichDoc | null;
  references: string | null;
  status: RevisionStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

export type DraftKind = "article" | "thread";

/** Isi draf yang disimpan sebagai JSONB di PostgreSQL. */
export interface ArticleDraftPayload {
  title: string;
  summary: string;
  category: string;
  bodyJson: RichDoc | null;
  references: string;
}

export interface ThreadDraftPayload {
  title: string;
  category: string;
  body: string;
  articleSlug: string;
}

export type DraftPayload = ArticleDraftPayload | ThreadDraftPayload;

export interface Draft {
  id: string;
  ownerId: string;
  kind: DraftKind;
  /** Diisi hanya untuk draf revisi artikel yang sudah terbit. */
  targetSubmissionId: string | null;
  payload: DraftPayload;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleBookmark {
  id: string;
  userId: string;
  articleSlug: string;
  createdAt: string;
}

export type NotificationKind =
  | "thread_reply"
  | "article_approved"
  | "article_needs_revision"
  | "article_rejected"
  | "revision_approved"
  | "revision_needs_revision"
  | "revision_rejected";

export interface Notification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: Notification[];
  unread: number;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
}

export interface ModerationEntry {
  id: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  note: string | null;
  createdAt: string;
}

export interface DashboardStats {
  threads: number;
  replies: number;
  pendingSubmissions: number;
  publishedSubmissions: number;
  openReports: number;
  users: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
}