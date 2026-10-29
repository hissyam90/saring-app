export type Role = "user" | "admin";

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
  | "akun";

export const THREAD_CATEGORIES: { id: ThreadCategory; label: string }[] = [
  { id: "phishing", label: "Phishing" },
  { id: "transaksi", label: "Penipuan transaksi" },
  { id: "lowongan", label: "Lowongan kerja palsu" },
  { id: "penyamaran", label: "Penyamaran identitas" },
  { id: "akun", label: "Keamanan akun" },
];

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
  body: string;
  references: string | null;
  status: SubmissionStatus;
  reviewNote: string | null;
  slug: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** Artikel kontribusi yang sudah disetujui dan tampil di Pustaka. */
export interface PublishedArticle {
  slug: string;
  title: string;
  summary: string;
  category: string;
  body: string;
  references: string | null;
  authorName: string;
  publishedAt: string;
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