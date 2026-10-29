import type {
  ArticleBookmark,
  DashboardStats,
  Draft,
  DraftKind,
  DraftPayload,
  ModerationEntry,
  Notification,
  NotificationKind,
  NotificationList,
  Paged,
  PublishedArticle,
  Reply,
  Report,
  ReportStatus,
  ReportTarget,
  RevisionStatus,
  Role,
  Submission,
  SubmissionRevision,
  SubmissionStatus,
  Thread,
  ThreadCategory,
  User,
  UserWithHash,
} from "./types";
import type { RichDoc } from "@/lib/content/rich-text";

export interface ListThreadsOptions {
  search?: string;
  category?: ThreadCategory;
  page: number;
  pageSize: number;
}

export interface ListRevisionsOptions {
  status?: RevisionStatus;
  page: number;
  pageSize: number;
}

export interface ListSubmissionsOptions {
  status?: SubmissionStatus;
  page: number;
  pageSize: number;
}

export interface ListReportsOptions {
  status?: ReportStatus;
  page: number;
  pageSize: number;
}

export interface ListUsersOptions {
  page: number;
  pageSize: number;
}

export interface Store {
  createUser(input: {
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<User>;
  findUserByEmail(email: string): Promise<UserWithHash | null>;
  findUserById(id: string): Promise<User | null>;
  setUserRole(id: string, role: Role): Promise<User | null>;
  countUsers(): Promise<number>;
  listUsers(opts: ListUsersOptions): Promise<Paged<User>>;

  createThread(input: {
    authorId: string;
    title: string;
    category: ThreadCategory;
    body: string;
    articleSlug: string | null;
  }): Promise<Thread>;
  listThreads(opts: ListThreadsOptions): Promise<Paged<Thread>>;
  /** Semua diskusi milik satu penulis, tanpa terpotong pagination global. */
  listThreadsByAuthor(authorId: string): Promise<Thread[]>;
  findThread(id: string): Promise<Thread | null>;
  removeThread(id: string): Promise<void>;

  createReply(input: {
    threadId: string;
    authorId: string;
    body: string;
  }): Promise<Reply>;
  listReplies(threadId: string): Promise<Reply[]>;
  findReply(id: string): Promise<Reply | null>;
  removeReply(id: string): Promise<void>;

  createSubmission(input: {
    authorId: string;
    title: string;
    summary: string;
    category: string;
    /** Proyeksi teks biasa, diturunkan server dari `bodyJson`. */
    body: string;
    /** Dokumen rich text tervalidasi; `null`/tidak diisi untuk teks biasa. */
    bodyJson?: RichDoc | null;
    references: string | null;
  }): Promise<Submission>;
  updateSubmission(
    id: string,
    authorId: string,
    input: {
      title: string;
      summary: string;
      category: string;
      body: string;
      bodyJson?: RichDoc | null;
      references: string | null;
    },
  ): Promise<Submission | null>;
  findSubmission(id: string): Promise<Submission | null>;
  listSubmissionsByAuthor(authorId: string): Promise<Submission[]>;
  listSubmissions(opts: ListSubmissionsOptions): Promise<Paged<Submission>>;
  reviewSubmission(input: {
    id: string;
    status: SubmissionStatus;
    note: string | null;
    reviewerId: string;
    reviewerName: string;
    slug: string | null;
  }): Promise<Submission | null>;

  listPublishedArticles(): Promise<PublishedArticle[]>;
  findPublishedArticle(slug: string): Promise<PublishedArticle | null>;

  // --- Revisi artikel publik ---------------------------------------------
  /**
   * Revisi terbuka (pending atau needs_revision) milik satu artikel.
   * Dipakai untuk mencegah duplikasi pengajuan dan melanjutkan revisi.
   */
  findOpenRevision(submissionId: string): Promise<SubmissionRevision | null>;
  createRevision(input: {
    submissionId: string;
    authorId: string;
    title: string;
    summary: string;
    category: string;
    body: string;
    bodyJson?: RichDoc | null;
    references: string | null;
  }): Promise<SubmissionRevision>;
  /** Memperbarui revisi milik penulis yang masih dapat diubah. */
  updateRevision(
    id: string,
    authorId: string,
    input: {
      title: string;
      summary: string;
      category: string;
      body: string;
      bodyJson?: RichDoc | null;
      references: string | null;
    },
  ): Promise<SubmissionRevision | null>;
  findRevision(id: string): Promise<SubmissionRevision | null>;
  listRevisionsByAuthor(authorId: string): Promise<SubmissionRevision[]>;
  listRevisions(opts: ListRevisionsOptions): Promise<Paged<SubmissionRevision>>;
  /** Mengubah status revisi (admin). Tidak menyentuh konten publik. */
  reviewRevision(input: {
    id: string;
    status: RevisionStatus;
    note: string | null;
    reviewerId: string;
    reviewerName: string;
  }): Promise<SubmissionRevision | null>;
  /**
   * Menyetujui revisi dan menerbitkannya secara atomik: konten revisi disalin ke
   * `submissions`, status revisi menjadi `approved`. Bila gagal, versi publik
   * lama tetap utuh (rollback).
   */
  publishRevision(input: {
    revisionId: string;
    reviewerId: string;
    note: string | null;
  }): Promise<PublishedArticle | null>;

  // --- Draf autosave -----------------------------------------------------
  saveDraft(input: {
    ownerId: string;
    kind: DraftKind;
    targetSubmissionId: string | null;
    payload: DraftPayload;
  }): Promise<Draft>;
  listDrafts(ownerId: string): Promise<Draft[]>;
  findDraft(id: string): Promise<Draft | null>;
  /** Menghapus draf; mengembalikan false bila bukan milik pemilik tersebut. */
  deleteDraft(id: string, ownerId: string): Promise<boolean>;

  // --- Bookmark artikel --------------------------------------------------
  addBookmark(userId: string, articleSlug: string): Promise<ArticleBookmark>;
  removeBookmark(userId: string, articleSlug: string): Promise<boolean>;
  listBookmarks(userId: string): Promise<ArticleBookmark[]>;
  isBookmarked(userId: string, articleSlug: string): Promise<boolean>;

  // --- Notifikasi --------------------------------------------------------
  /**
   * Membuat notifikasi. Mengembalikan `null` bila `dedupeKey` sudah ada untuk
   * pengguna ini, sehingga retry/aksi berulang tidak membuat notifikasi ganda.
   */
  createNotification(input: {
    userId: string;
    kind: NotificationKind;
    title: string;
    body: string | null;
    href: string | null;
    dedupeKey: string;
  }): Promise<Notification | null>;
  listNotifications(userId: string, limit: number): Promise<NotificationList>;
  markNotificationRead(id: string, userId: string): Promise<Notification | null>;
  markAllNotificationsRead(userId: string): Promise<number>;

  createReport(input: {
    reporterId: string;
    targetType: ReportTarget;
    targetId: string;
    reason: string;
    details: string | null;
  }): Promise<Report>;
  listReports(opts: ListReportsOptions): Promise<Paged<Report>>;
  resolveReport(input: {
    id: string;
    status: ReportStatus;
  }): Promise<Report | null>;
  countOpenReports(): Promise<number>;
  countReportsForTarget(
    targetType: ReportTarget,
    targetId: string,
    reporterId: string,
  ): Promise<number>;

  logModeration(input: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    note: string | null;
  }): Promise<void>;
  listModerationLog(limit: number): Promise<ModerationEntry[]>;
  stats(): Promise<DashboardStats>;

  /** Menambah penghitung rate limit dan mengembalikan nilai terbaru. */
  incrementRateLimit(bucket: string, windowSeconds: number): Promise<number>;
}
