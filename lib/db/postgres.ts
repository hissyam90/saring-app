import type { Pool } from "pg";
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
} from "./types";
import type {
  ListReportsOptions,
  ListSubmissionsOptions,
  ListThreadsOptions,
  ListUsersOptions,
  Store,
} from "./store";
import { slugify } from "./memory";
import { readRichDoc } from "@/lib/content/rich-text";

type Row = Record<string, unknown>;

const iso = (v: unknown): string =>
  v instanceof Date ? v.toISOString() : String(v ?? "");

const toUser = (r: Row): User => ({
  id: String(r.id),
  email: String(r.email),
  displayName: String(r.display_name),
  role: r.role as Role,
  createdAt: iso(r.created_at),
});

const toThread = (r: Row): Thread => ({
  id: String(r.id),
  authorId: String(r.author_id),
  authorName: String(r.author_name ?? "Pengguna"),
  title: String(r.title),
  category: r.category as ThreadCategory,
  body: String(r.body),
  replyCount: Number(r.reply_count ?? 0),
  articleSlug: r.article_slug ? String(r.article_slug) : null,
  createdAt: iso(r.created_at),
});

const toReply = (r: Row): Reply => ({
  id: String(r.id),
  threadId: String(r.thread_id),
  authorId: String(r.author_id),
  authorName: String(r.author_name ?? "Pengguna"),
  body: String(r.body),
  createdAt: iso(r.created_at),
});

const toSubmission = (r: Row): Submission => ({
  id: String(r.id),
  authorId: String(r.author_id),
  authorName: String(r.author_name ?? "Pengguna"),
  title: String(r.title),
  summary: String(r.summary),
  category: String(r.category),
  body: String(r.body),
  bodyJson: readRichDoc(r.body_json),
  references: r.refs ? String(r.refs) : null,
  status: r.status as Submission["status"],
  reviewNote: r.review_note ? String(r.review_note) : null,
  slug: r.slug ? String(r.slug) : null,
  createdAt: iso(r.created_at),
  reviewedAt: r.reviewed_at ? iso(r.reviewed_at) : null,
});

const toPublished = (r: Row): PublishedArticle => ({
  slug: String(r.slug),
  title: String(r.title),
  summary: String(r.summary),
  category: String(r.category),
  body: String(r.body),
  bodyJson: readRichDoc(r.body_json),
  references: r.refs ? String(r.refs) : null,
  authorName: String(r.author_name ?? "Kontributor"),
  publishedAt: iso(r.reviewed_at ?? r.created_at),
});

const toReport = (r: Row): Report => ({
  id: String(r.id),
  reporterId: String(r.reporter_id),
  targetType: r.target_type as Report["targetType"],
  targetId: String(r.target_id),
  reason: String(r.reason),
  details: r.details ? String(r.details) : null,
  status: r.status as Report["status"],
  createdAt: iso(r.created_at),
});

/**
 * Backend produksi: PostgreSQL. Semua query memakai parameter terikat,
 * tidak ada interpolasi string dari input pengguna.
 */
export function createPostgresStore(pool: Pool): Store {
  const q = async (text: string, params: unknown[] = []) =>
    (await pool.query(text, params)).rows as Row[];

  return {
    async createUser(input) {
      const rows = await q(
        `insert into users (email, display_name, password_hash)
         values (lower($1), $2, $3) returning *`,
        [input.email, input.displayName, input.passwordHash],
      );
      return toUser(rows[0]);
    },
    async findUserByEmail(email) {
      const rows = await q(
        `select * from users where lower(email) = lower($1) limit 1`,
        [email],
      );
      if (!rows[0]) return null;
      return { ...toUser(rows[0]), passwordHash: String(rows[0].password_hash) };
    },
    async findUserById(id) {
      const rows = await q(`select * from users where id = $1 limit 1`, [id]);
      return rows[0] ? toUser(rows[0]) : null;
    },
    async setUserRole(id, role) {
      const rows = await q(
        `update users set role = $2 where id = $1 returning *`,
        [id, role],
      );
      return rows[0] ? toUser(rows[0]) : null;
    },
    async countUsers() {
      const rows = await q(`select count(*)::int as n from users`);
      return Number(rows[0].n);
    },
    async listUsers(opts: ListUsersOptions) {
      const rows = await q(
        `select * from users order by created_at desc limit $1 offset $2`,
        [opts.pageSize, (opts.page - 1) * opts.pageSize],
      );
      return { items: rows.map(toUser), total: await this.countUsers() };
    },

    async createThread(input) {
      const rows = await q(
        `insert into threads (author_id, title, category, body, article_slug)
         values ($1, $2, $3, $4, $5) returning *`,
        [
          input.authorId,
          input.title,
          input.category,
          input.body,
          input.articleSlug,
        ],
      );
      return { ...toThread(rows[0]), authorName: "" };
    },
    async listThreads(opts: ListThreadsOptions) {
      const where: string[] = ["t.removed = false"];
      const params: unknown[] = [];
      if (opts.category) {
        params.push(opts.category);
        where.push(`t.category = $${params.length}`);
      }
      if (opts.search) {
        params.push(`%${opts.search}%`);
        where.push(`(t.title ilike $${params.length} or t.body ilike $${params.length})`);
      }
      const filter = where.join(" and ");
      const totalRows = await q(
        `select count(*)::int as n from threads t where ${filter}`,
        params,
      );
      const rows = await q(
        `select t.*, u.display_name as author_name,
           (select count(*)::int from replies r
             where r.thread_id = t.id and r.removed = false) as reply_count
         from threads t join users u on u.id = t.author_id
         where ${filter}
         order by t.created_at desc
         limit $${params.length + 1} offset $${params.length + 2}`,
        [...params, opts.pageSize, (opts.page - 1) * opts.pageSize],
      );
      return { items: rows.map(toThread), total: Number(totalRows[0].n) };
    },
    async listThreadsByAuthor(authorId) {
      const rows = await q(
        `select t.*, u.display_name as author_name,
           (select count(*)::int from replies r
             where r.thread_id = t.id and r.removed = false) as reply_count
         from threads t join users u on u.id = t.author_id
         where t.author_id = $1 and t.removed = false
         order by t.created_at desc`,
        [authorId],
      );
      return rows.map(toThread);
    },
    async findThread(id) {
      const rows = await q(
        `select t.*, u.display_name as author_name,
           (select count(*)::int from replies r
             where r.thread_id = t.id and r.removed = false) as reply_count
         from threads t join users u on u.id = t.author_id
         where t.id = $1 and t.removed = false limit 1`,
        [id],
      );
      return rows[0] ? toThread(rows[0]) : null;
    },
    async removeThread(id) {
      await q(`update threads set removed = true where id = $1`, [id]);
    },

    async createReply(input) {
      const rows = await q(
        `insert into replies (thread_id, author_id, body)
         values ($1, $2, $3) returning *`,
        [input.threadId, input.authorId, input.body],
      );
      return { ...toReply(rows[0]), authorName: "" };
    },
    async listReplies(threadId) {
      const rows = await q(
        `select r.*, u.display_name as author_name
         from replies r join users u on u.id = r.author_id
         where r.thread_id = $1 and r.removed = false
         order by r.created_at asc`,
        [threadId],
      );
      return rows.map(toReply);
    },
    async findReply(id) {
      const rows = await q(
        `select r.*, u.display_name as author_name
         from replies r join users u on u.id = r.author_id
         where r.id = $1 and r.removed = false limit 1`,
        [id],
      );
      return rows[0] ? toReply(rows[0]) : null;
    },
    async removeReply(id) {
      await q(`update replies set removed = true where id = $1`, [id]);
    },

    async createSubmission(input) {
      const rows = await q(
        `insert into submissions (author_id, title, summary, category, body, body_json, refs)
         values ($1, $2, $3, $4, $5, $6, $7) returning *`,
        [
          input.authorId,
          input.title,
          input.summary,
          input.category,
          input.body,
          input.bodyJson ? JSON.stringify(input.bodyJson) : null,
          input.references,
        ],
      );
      return toSubmission(rows[0]);
    },
    async updateSubmission(id, authorId, input) {
      const rows = await q(
        `update submissions
            set title = $3, summary = $4, category = $5, body = $6, body_json = $7,
                refs = $8,
                status = 'pending', review_note = null, reviewed_at = null
          where id = $1 and author_id = $2
            and status in ('pending', 'needs_revision')
          returning *`,
        [
          id,
          authorId,
          input.title,
          input.summary,
          input.category,
          input.body,
          input.bodyJson ? JSON.stringify(input.bodyJson) : null,
          input.references,
        ],
      );
      return rows[0] ? toSubmission(rows[0]) : null;
    },
    async findSubmission(id) {
      const rows = await q(
        `select s.*, u.display_name as author_name
         from submissions s join users u on u.id = s.author_id
         where s.id = $1 limit 1`,
        [id],
      );
      return rows[0] ? toSubmission(rows[0]) : null;
    },
    async listSubmissionsByAuthor(authorId) {
      const rows = await q(
        `select s.*, u.display_name as author_name
         from submissions s join users u on u.id = s.author_id
         where s.author_id = $1 order by s.created_at desc`,
        [authorId],
      );
      return rows.map(toSubmission);
    },
    async listSubmissions(opts: ListSubmissionsOptions) {
      const params: unknown[] = [];
      let filter = "true";
      if (opts.status) {
        params.push(opts.status);
        filter = `s.status = $${params.length}`;
      }
      const totalRows = await q(
        `select count(*)::int as n from submissions s where ${filter}`,
        params,
      );
      const rows = await q(
        `select s.*, u.display_name as author_name
         from submissions s join users u on u.id = s.author_id
         where ${filter} order by s.created_at desc
         limit $${params.length + 1} offset $${params.length + 2}`,
        [...params, opts.pageSize, (opts.page - 1) * opts.pageSize],
      );
      return { items: rows.map(toSubmission), total: Number(totalRows[0].n) };
    },
    async reviewSubmission(input) {
      let slug: string | null = null;
      if (input.status === "approved") {
        const base = slugify(input.slug ?? "");
        slug = base;
        for (let n = 1; n < 50; n += 1) {
          const clash = await q(
            `select 1 from submissions where slug = $1 and id <> $2 limit 1`,
            [slug, input.id],
          );
          if (clash.length === 0) break;
          slug = `${base}-${n + 1}`;
        }
      }
      const rows = await q(
        `update submissions
            set status = $2, review_note = $3, reviewed_by = $4,
                reviewed_at = now(), slug = $5
          where id = $1 returning *`,
        [input.id, input.status, input.note, input.reviewerId, slug],
      );
      return rows[0] ? toSubmission(rows[0]) : null;
    },

    async listPublishedArticles() {
      const rows = await q(
        `select s.*, u.display_name as author_name
         from submissions s join users u on u.id = s.author_id
         where s.status = 'approved' and s.slug is not null
         order by s.reviewed_at desc nulls last`,
      );
      return rows.map(toPublished);
    },
    async findPublishedArticle(slug) {
      const rows = await q(
        `select s.*, u.display_name as author_name
         from submissions s join users u on u.id = s.author_id
         where s.slug = $1 and s.status = 'approved' limit 1`,
        [slug],
      );
      return rows[0] ? toPublished(rows[0]) : null;
    },

    async createReport(input) {
      const rows = await q(
        `insert into reports (reporter_id, target_type, target_id, reason, details)
         values ($1, $2, $3, $4, $5) returning *`,
        [
          input.reporterId,
          input.targetType,
          input.targetId,
          input.reason,
          input.details,
        ],
      );
      return toReport(rows[0]);
    },
    async listReports(opts: ListReportsOptions) {
      const params: unknown[] = [];
      let filter = "true";
      if (opts.status) {
        params.push(opts.status);
        filter = `status = $${params.length}`;
      }
      const totalRows = await q(
        `select count(*)::int as n from reports where ${filter}`,
        params,
      );
      const rows = await q(
        `select * from reports where ${filter} order by created_at desc
         limit $${params.length + 1} offset $${params.length + 2}`,
        [...params, opts.pageSize, (opts.page - 1) * opts.pageSize],
      );
      return { items: rows.map(toReport), total: Number(totalRows[0].n) };
    },
    async resolveReport(input) {
      const rows = await q(
        `update reports set status = $2,
            resolved_at = case when $2 = 'resolved' then now() else null end
          where id = $1 returning *`,
        [input.id, input.status],
      );
      return rows[0] ? toReport(rows[0]) : null;
    },
    async countOpenReports() {
      const rows = await q(
        `select count(*)::int as n from reports where status <> 'resolved'`,
      );
      return Number(rows[0].n);
    },
    async countReportsForTarget(targetType, targetId, reporterId) {
      const rows = await q(
        `select count(*)::int as n from reports
         where target_type = $1 and target_id = $2 and reporter_id = $3`,
        [targetType, targetId, reporterId],
      );
      return Number(rows[0].n);
    },

    async logModeration(input) {
      await q(
        `insert into moderation_log (actor_id, action, target_type, target_id, note)
         values ($1, $2, $3, $4, $5)`,
        [
          input.actorId,
          input.action,
          input.targetType,
          input.targetId,
          input.note,
        ],
      );
    },
    async listModerationLog(limit: number) {
      const rows = await q(
        `select m.*, u.display_name as actor_name
         from moderation_log m left join users u on u.id = m.actor_id
         order by m.created_at desc limit $1`,
        [limit],
      );
      return rows.map(
        (r): ModerationEntry => ({
          id: String(r.id),
          actorName: String(r.actor_name ?? "Sistem"),
          action: String(r.action),
          targetType: String(r.target_type),
          targetId: String(r.target_id),
          note: r.note ? String(r.note) : null,
          createdAt: iso(r.created_at),
        }),
      );
    },
    async stats(): Promise<DashboardStats> {
      const rows = await q(
        `select
           (select count(*)::int from threads where removed = false) as threads,
           (select count(*)::int from replies where removed = false) as replies,
           (select count(*)::int from submissions where status = 'pending') as pending,
           (select count(*)::int from submissions where status = 'approved') as published,
           (select count(*)::int from reports where status <> 'resolved') as open_reports,
           (select count(*)::int from users) as users`,
      );
      const r = rows[0];
      return {
        threads: Number(r.threads),
        replies: Number(r.replies),
        pendingSubmissions: Number(r.pending),
        publishedSubmissions: Number(r.published),
        openReports: Number(r.open_reports),
        users: Number(r.users),
      };
    },

    async incrementRateLimit(bucket, windowSeconds) {
      const rows = await q(
        `insert into rate_limits (bucket, window_start, count)
         values ($1, now(), 1)
         on conflict (bucket) do update set
           count = case
             when rate_limits.window_start < now() - ($2 || ' seconds')::interval
             then 1 else rate_limits.count + 1 end,
           window_start = case
             when rate_limits.window_start < now() - ($2 || ' seconds')::interval
             then now() else rate_limits.window_start end
         returning count`,
        [bucket, String(windowSeconds)],
      );
      return Number(rows[0].count);
    },
  } as Store;
}
