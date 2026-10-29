import type {
  DashboardStats,
  ModerationEntry,
  Paged,
  PublishedArticle,
  Reply,
  Report,
  ReportStatus,
  ReportTarget,
  Role,
  Submission,
  SubmissionStatus,
  Thread,
  ThreadCategory,
  User,
  UserWithHash,
} from "./types";

export interface ListThreadsOptions {
  search?: string;
  category?: ThreadCategory;
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
    body: string;
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
