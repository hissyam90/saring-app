import { randomUUID } from "node:crypto";
import type {
  DashboardStats,
  ModerationEntry,
  PublishedArticle,
  Reply,
  Report,
  Role,
  Submission,
  Thread,
  ThreadCategory,
  User,
  UserWithHash,
} from "./types";
import type {
  ListReportsOptions,
  ListSubmissionsOptions,
  ListThreadsOptions,
  ListUsersOptions,
  Store,
} from "./store";
import { readRichDoc, type RichDoc } from "@/lib/content/rich-text";

interface MemUser extends UserWithHash {
  removed: boolean;
}
interface MemThread {
  id: string;
  authorId: string;
  title: string;
  category: ThreadCategory;
  body: string;
  articleSlug: string | null;
  removed: boolean;
  createdAt: string;
}
interface MemReply {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  removed: boolean;
  createdAt: string;
}
interface MemSubmission {
  id: string;
  authorId: string;
  title: string;
  summary: string;
  category: string;
  body: string;
  bodyJson: RichDoc | null;
  references: string | null;
  status: Submission["status"];
  reviewNote: string | null;
  slug: string | null;
  createdAt: string;
  reviewedAt: string | null;
}
interface MemReport {
  id: string;
  reporterId: string;
  targetType: Report["targetType"];
  targetId: string;
  reason: string;
  details: string | null;
  status: Report["status"];
  createdAt: string;
}

const now = () => new Date().toISOString();
const desc = (a: string, b: string) => b.localeCompare(a);
const asc = (a: string, b: string) => a.localeCompare(b);
const page = <T>(items: T[], p: number, size: number) => ({
  items: items.slice((p - 1) * size, p * size),
  total: items.length,
});

export function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70)
    .replace(/^-+|-+$/g, "");
  return base || "artikel";
}

/**
 * Penyimpanan in-memory untuk development dan pengujian saja.
 * Backend produksi adalah PostgreSQL; lihat getStore() di index.ts.
 */
export function createMemoryStore(): Store {
  const users = new Map<string, MemUser>();
  const threads = new Map<string, MemThread>();
  const replies = new Map<string, MemReply>();
  const subs = new Map<string, MemSubmission>();
  const reports = new Map<string, MemReport>();
  const log: ModerationEntry[] = [];
  const buckets = new Map<string, { start: number; count: number }>();

  const name = (id: string) => users.get(id)?.displayName ?? "Pengguna";
  const toUser = (u: MemUser): User => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    createdAt: u.createdAt,
  });
  const toThread = (t: MemThread): Thread => ({
    ...t,
    authorName: name(t.authorId),
    replyCount: [...replies.values()].filter(
      (r) => r.threadId === t.id && !r.removed,
    ).length,
  });
  const toReply = (r: MemReply): Reply => ({ ...r, authorName: name(r.authorId) });
  const toSub = (s: MemSubmission): Submission => ({
    ...s,
    // Normalisasi saat baca, sama seperti implementasi PostgreSQL, agar data
    // yang diubah di luar aplikasi tidak pernah sampai ke renderer.
    bodyJson: readRichDoc(s.bodyJson),
    authorName: name(s.authorId),
  });

  return {
    async createUser(input) {
      const u: MemUser = {
        id: randomUUID(),
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        role: "user",
        createdAt: now(),
        removed: false,
      };
      users.set(u.id, u);
      return toUser(u);
    },
    async findUserByEmail(email) {
      const u = [...users.values()].find(
        (x) => x.email === email.toLowerCase() && !x.removed,
      );
      return u ? { ...toUser(u), passwordHash: u.passwordHash } : null;
    },
    async findUserById(id) {
      const u = users.get(id);
      return u && !u.removed ? toUser(u) : null;
    },
    async setUserRole(id, role: Role) {
      const u = users.get(id);
      if (!u) return null;
      u.role = role;
      return toUser(u);
    },
    async countUsers() {
      return [...users.values()].filter((u) => !u.removed).length;
    },
    async listUsers(opts: ListUsersOptions) {
      const all = [...users.values()]
        .filter((u) => !u.removed)
        .sort((a, b) => desc(a.createdAt, b.createdAt))
        .map(toUser);
      return page(all, opts.page, opts.pageSize);
    },

    async createThread(input) {
      const t: MemThread = {
        id: randomUUID(),
        ...input,
        removed: false,
        createdAt: now(),
      };
      threads.set(t.id, t);
      return toThread(t);
    },
    async listThreads(opts: ListThreadsOptions) {
      const q = opts.search?.toLowerCase().trim();
      const all = [...threads.values()]
        .filter((t) => !t.removed)
        .filter((t) => (opts.category ? t.category === opts.category : true))
        .filter((t) =>
          q ? `${t.title} ${t.body}`.toLowerCase().includes(q) : true,
        )
        .sort((a, b) => desc(a.createdAt, b.createdAt))
        .map(toThread);
      return page(all, opts.page, opts.pageSize);
    },
    async listThreadsByAuthor(authorId) {
      return [...threads.values()]
        .filter((t) => !t.removed && t.authorId === authorId)
        .sort((a, b) => desc(a.createdAt, b.createdAt))
        .map(toThread);
    },
    async findThread(id) {
      const t = threads.get(id);
      return t && !t.removed ? toThread(t) : null;
    },
    async removeThread(id) {
      const t = threads.get(id);
      if (t) t.removed = true;
    },

    async createReply(input) {
      const r: MemReply = {
        id: randomUUID(),
        ...input,
        removed: false,
        createdAt: now(),
      };
      replies.set(r.id, r);
      return toReply(r);
    },
    async listReplies(threadId) {
      return [...replies.values()]
        .filter((r) => r.threadId === threadId && !r.removed)
        .sort((a, b) => asc(a.createdAt, b.createdAt))
        .map(toReply);
    },
    async findReply(id) {
      const r = replies.get(id);
      return r && !r.removed ? toReply(r) : null;
    },
    async removeReply(id) {
      const r = replies.get(id);
      if (r) r.removed = true;
    },

    async createSubmission(input) {
      const s: MemSubmission = {
        id: randomUUID(),
        authorId: input.authorId,
        title: input.title,
        summary: input.summary,
        category: input.category,
        body: input.body,
        bodyJson: input.bodyJson ?? null,
        references: input.references,
        status: "pending",
        reviewNote: null,
        slug: null,
        createdAt: now(),
        reviewedAt: null,
      };
      subs.set(s.id, s);
      return toSub(s);
    },
    async updateSubmission(id, authorId, input) {
      const s = subs.get(id);
      if (!s || s.authorId !== authorId) return null;
      if (s.status === "approved" || s.status === "rejected") return null;
      Object.assign(s, {
        title: input.title,
        summary: input.summary,
        category: input.category,
        body: input.body,
        bodyJson: input.bodyJson ?? null,
        references: input.references,
        status: "pending",
        reviewNote: null,
      });
      return toSub(s);
    },
    async findSubmission(id) {
      const s = subs.get(id);
      return s ? toSub(s) : null;
    },
    async listSubmissionsByAuthor(authorId) {
      return [...subs.values()]
        .filter((s) => s.authorId === authorId)
        .sort((a, b) => desc(a.createdAt, b.createdAt))
        .map(toSub);
    },
    async listSubmissions(opts: ListSubmissionsOptions) {
      const all = [...subs.values()]
        .filter((s) => (opts.status ? s.status === opts.status : true))
        .sort((a, b) => desc(a.createdAt, b.createdAt))
        .map(toSub);
      return page(all, opts.page, opts.pageSize);
    },
    async reviewSubmission(input) {
      const s = subs.get(input.id);
      if (!s) return null;
      s.status = input.status;
      s.reviewNote = input.note;
      s.reviewedAt = now();
      if (input.status === "approved") {
        const base = slugify(input.slug ?? s.title);
        let candidate = base;
        let n = 1;
        while (
          [...subs.values()].some(
            (o) => o.id !== s.id && o.slug === candidate,
          )
        ) {
          n += 1;
          candidate = `${base}-${n}`;
        }
        s.slug = candidate;
      } else {
        s.slug = null;
      }
      return toSub(s);
    },

    async listPublishedArticles() {
      return [...subs.values()]
        .filter((s) => s.status === "approved" && s.slug)
        .sort((a, b) => desc(a.reviewedAt ?? "", b.reviewedAt ?? ""))
        .map(
          (s): PublishedArticle => ({
            slug: s.slug as string,
            title: s.title,
            summary: s.summary,
            category: s.category,
            body: s.body,
            bodyJson: readRichDoc(s.bodyJson),
            references: s.references,
            authorName: name(s.authorId),
            publishedAt: s.reviewedAt ?? s.createdAt,
          }),
        );
    },
    async findPublishedArticle(slug) {
      const all = await this.listPublishedArticles();
      return all.find((a) => a.slug === slug) ?? null;
    },

    async createReport(input) {
      const r: MemReport = {
        id: randomUUID(),
        ...input,
        status: "open",
        createdAt: now(),
      };
      reports.set(r.id, r);
      return { ...r };
    },
    async listReports(opts: ListReportsOptions) {
      const all = [...reports.values()]
        .filter((r) => (opts.status ? r.status === opts.status : true))
        .sort((a, b) => desc(a.createdAt, b.createdAt))
        .map((r) => ({ ...r }));
      return page(all, opts.page, opts.pageSize);
    },
    async resolveReport(input) {
      const r = reports.get(input.id);
      if (!r) return null;
      r.status = input.status;
      return { ...r };
    },
    async countOpenReports() {
      return [...reports.values()].filter((r) => r.status !== "resolved").length;
    },
    async countReportsForTarget(targetType, targetId, reporterId) {
      return [...reports.values()].filter(
        (r) =>
          r.targetType === targetType &&
          r.targetId === targetId &&
          r.reporterId === reporterId,
      ).length;
    },

    async logModeration(input) {
      log.unshift({
        id: randomUUID(),
        actorName: name(input.actorId),
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        note: input.note,
        createdAt: now(),
      });
    },
    async listModerationLog(limit: number) {
      return log.slice(0, limit);
    },
    async stats(): Promise<DashboardStats> {
      const all = [...subs.values()];
      return {
        threads: [...threads.values()].filter((t) => !t.removed).length,
        replies: [...replies.values()].filter((r) => !r.removed).length,
        pendingSubmissions: all.filter((s) => s.status === "pending").length,
        publishedSubmissions: all.filter((s) => s.status === "approved").length,
        openReports: [...reports.values()].filter((r) => r.status !== "resolved")
          .length,
        users: [...users.values()].filter((u) => !u.removed).length,
      };
    },

    async incrementRateLimit(bucket, windowSeconds) {
      const cur = buckets.get(bucket);
      const ts = Date.now();
      if (!cur || ts - cur.start > windowSeconds * 1000) {
        buckets.set(bucket, { start: ts, count: 1 });
        return 1;
      }
      cur.count += 1;
      return cur.count;
    },
  } as Store;
}
