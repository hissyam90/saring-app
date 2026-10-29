import type { Pool } from "pg";
import type {
  ArticleBookmark,
  DashboardStats,
  Draft,
  DraftKind,
  DraftPayload,
  ModerationEntry,
  Notification,
  NotificationKind,
  PublishedArticle,
  Reply,
  Report,
  RevisionStatus,
  Role,
  Submission,
  SubmissionRevision,
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
  submissionId: String(r.id),
  authorId: String(r.author_id),
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

const toRevision = (r: Row): SubmissionRevision => ({
  id: String(r.id),
  submissionId: String(r.submission_id),
  authorId: String(r.author_id),
  authorName: String(r.author_name ?? "Pengguna"),
  title: String(r.title),
  summary: String(r.summary),
  category: String(r.category),
  body: String(r.body),
  bodyJson: readRichDoc(r.body_json),
  references: r.refs ? String(r.refs) : null,
  status: r.status as RevisionStatus,
  reviewNote: r.review_note ? String(r.review_note) : null,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
  reviewedAt: r.reviewed_at ? iso(r.reviewed_at) : null,
});

/** Payload draf dibaca kembali dari JSONB; bentuknya divalidasi di API. */
function readDraftPayload(value: unknown): DraftPayload {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as DraftPayload;
  }
  return { title: "", summary: "", category: "", bodyJson: null, references: "" };
}

const toDraft = (r: Row): Draft => ({
  id: String(r.id),
  ownerId: String(r.owner_id),
  kind: r.kind as DraftKind,
  targetSubmissionId: r.target_submission_id
    ? String(r.target_submission_id)
    : null,
  payload: readDraftPayload(r.payload),
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

const toBookmark = (r: Row): ArticleBookmark => ({
  id: String(r.id),
  userId: String(r.user_id),
  articleSlug: String(r.article_slug),
  createdAt: iso(r.created_at),
});

const toNotification = (r: Row): Notification => ({
  id: String(r.id),
  userId: String(r.user_id),
  kind: r.kind as NotificationKind,
  title: String(r.title),
  body: r.body ? String(r.body) : null,
  href: r.href ? String(r.href) : null,
  readAt: r.read_at ? iso(r.read_at) : null,
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

    // --- Revisi artikel publik ---------------------------------------------

    async findOpenRevision(submissionId) {
      const rows = await q(
        `select r.*, u.display_name as author_name
         from submission_revisions r join users u on u.id = r.author_id
         where r.submission_id = $1 and r.status in ('pending', 'needs_revision')
         order by r.created_at desc limit 1`,
        [submissionId],
      );
      return rows[0] ? toRevision(rows[0]) : null;
    },

    async createRevision(input) {
      const rows = await q(
        `insert into submission_revisions
           (submission_id, author_id, title, summary, category, body, body_json, refs)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
        [
          input.submissionId,
          input.authorId,
          input.title,
          input.summary,
          input.category,
          input.body,
          input.bodyJson ? JSON.stringify(input.bodyJson) : null,
          input.references,
        ],
      );
      const author = await q(`select display_name from users where id = $1`, [
        input.authorId,
      ]);
      return toRevision({
        ...rows[0],
        author_name: author[0]?.display_name ?? "Pengguna",
      });
    },

    async updateRevision(id, authorId, input) {
      const rows = await q(
        `update submission_revisions
            set title = $3, summary = $4, category = $5, body = $6,
                body_json = $7, refs = $8, status = 'pending',
                review_note = null, reviewed_at = null, updated_at = now()
          where id = $1 and author_id = $2 and status in ('pending', 'needs_revision')
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
      if (!rows[0]) return null;
      const author = await q(`select display_name from users where id = $1`, [
        authorId,
      ]);
      return toRevision({
        ...rows[0],
        author_name: author[0]?.display_name ?? "Pengguna",
      });
    },

    async findRevision(id) {
      const rows = await q(
        `select r.*, u.display_name as author_name
         from submission_revisions r join users u on u.id = r.author_id
         where r.id = $1 limit 1`,
        [id],
      );
      return rows[0] ? toRevision(rows[0]) : null;
    },

    async listRevisionsByAuthor(authorId) {
      const rows = await q(
        `select r.*, u.display_name as author_name
         from submission_revisions r join users u on u.id = r.author_id
         where r.author_id = $1 order by r.created_at desc`,
        [authorId],
      );
      return rows.map(toRevision);
    },

    async listRevisions(opts) {
      // Alias `r` hanya ada di query daftar (karena join ke users). Query hitung
      // tidak memakai alias, sehingga klausa disusun terpisah agar tidak
      // menghasilkan "missing FROM-clause entry for table r".
      const listWhere: string[] = [];
      const listParams: unknown[] = [];
      const countWhere: string[] = [];
      const countParams: unknown[] = [];

      if (opts.status) {
        listParams.push(opts.status);
        listWhere.push(`r.status = $${listParams.length}`);
        countParams.push(opts.status);
        countWhere.push(`status = $${countParams.length}`);
      }

      const listClause =
        listWhere.length > 0 ? `where ${listWhere.join(" and ")}` : "";
      const countClause =
        countWhere.length > 0 ? `where ${countWhere.join(" and ")}` : "";

      const pageParams = [
        ...listParams,
        opts.pageSize,
        (opts.page - 1) * opts.pageSize,
      ];
      const rows = await q(
        `select r.*, u.display_name as author_name
         from submission_revisions r join users u on u.id = r.author_id
         ${listClause}
         order by r.created_at desc
         limit $${pageParams.length - 1} offset $${pageParams.length}`,
        pageParams,
      );

      const totalRows = await q(
        `select count(*)::int as n from submission_revisions ${countClause}`,
        countParams,
      );

      return { items: rows.map(toRevision), total: Number(totalRows[0].n) };
    },

    async reviewRevision(input) {
      const rows = await q(
        `update submission_revisions
            set status = $2, review_note = $3, reviewed_by = $4,
                reviewed_at = now(), updated_at = now()
          where id = $1 and status in ('pending', 'needs_revision')
          returning *`,
        [input.id, input.status, input.note, input.reviewerId],
      );
      if (!rows[0]) return null;
      const author = await q(`select display_name from users where id = $1`, [
        rows[0].author_id,
      ]);
      return toRevision({
        ...rows[0],
        author_name: author[0]?.display_name ?? "Pengguna",
      });
    },

    async publishRevision(input) {
      const client = await pool.connect();
      try {
        await client.query("begin");

        const revisionResult = await client.query(
          `select * from submission_revisions where id = $1 for update`,
          [input.revisionId],
        );
        const revision = revisionResult.rows[0] as Row | undefined;
        if (!revision || revision.status !== "pending") {
          await client.query("rollback");
          return null;
        }

        // Slug dipertahankan agar URL publik tidak berubah karena revisi isi.
        const published = await client.query(
          `update submissions
              set title = $2, summary = $3, category = $4, body = $5,
                  body_json = $6, refs = $7, review_note = null,
                  reviewed_by = $8, reviewed_at = now(),
                  status = 'approved',
                  slug = coalesce(slug, $9)
            where id = $1 and status = 'approved'
            returning *`,
          [
            revision.submission_id,
            revision.title,
            revision.summary,
            revision.category,
            revision.body,
            revision.body_json === null
              ? null
              : JSON.stringify(revision.body_json),
            revision.refs,
            input.reviewerId,
            slugify(String(revision.title)),
          ],
        );

        if (!published.rows[0]) {
          // Artikel sumber tidak lagi berstatus approved (mis. dihapus admin):
          // jangan ubah apa pun, versi publik lama tetap utuh.
          await client.query("rollback");
          return null;
        }

        await client.query(
          `update submission_revisions
              set status = 'approved', review_note = $2, reviewed_by = $3,
                  reviewed_at = now(), updated_at = now()
            where id = $1`,
          [input.revisionId, input.note, input.reviewerId],
        );

        const authorName = await client.query(
          `select display_name from users where id = $1`,
          [revision.author_id],
        );

        await client.query("commit");

        return toPublished({
          ...published.rows[0],
          author_name: authorName.rows[0]?.display_name ?? "Kontributor",
        });
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },

    // --- Draf autosave -----------------------------------------------------

    async saveDraft(input) {
      const rows = await q(
        `insert into drafts (owner_id, kind, target_submission_id, payload)
         values ($1, $2, $3, $4)
         on conflict (
           owner_id, kind,
           coalesce(target_submission_id, '00000000-0000-0000-0000-000000000000'::uuid)
         )
         do update set payload = excluded.payload, updated_at = now()
         returning *`,
        [
          input.ownerId,
          input.kind,
          input.targetSubmissionId,
          JSON.stringify(input.payload),
        ],
      );
      return toDraft(rows[0]);
    },

    async listDrafts(ownerId) {
      const rows = await q(
        `select * from drafts where owner_id = $1 order by updated_at desc`,
        [ownerId],
      );
      return rows.map(toDraft);
    },

    async findDraft(id) {
      const rows = await q(`select * from drafts where id = $1 limit 1`, [id]);
      return rows[0] ? toDraft(rows[0]) : null;
    },

    async deleteDraft(id, ownerId) {
      const rows = await q(
        `delete from drafts where id = $1 and owner_id = $2 returning id`,
        [id, ownerId],
      );
      return rows.length > 0;
    },

    // --- Bookmark artikel --------------------------------------------------

    async addBookmark(userId, articleSlug) {
      const rows = await q(
        `insert into article_bookmarks (user_id, article_slug)
         values ($1, $2)
         on conflict (user_id, article_slug)
           do update set article_slug = excluded.article_slug
         returning *`,
        [userId, articleSlug],
      );
      return toBookmark(rows[0]);
    },

    async removeBookmark(userId, articleSlug) {
      const rows = await q(
        `delete from article_bookmarks
          where user_id = $1 and article_slug = $2 returning id`,
        [userId, articleSlug],
      );
      return rows.length > 0;
    },

    async listBookmarks(userId) {
      const rows = await q(
        `select * from article_bookmarks where user_id = $1 order by created_at desc`,
        [userId],
      );
      return rows.map(toBookmark);
    },

    async isBookmarked(userId, articleSlug) {
      const rows = await q(
        `select 1 from article_bookmarks
          where user_id = $1 and article_slug = $2 limit 1`,
        [userId, articleSlug],
      );
      return rows.length > 0;
    },

    // --- Notifikasi --------------------------------------------------------

    async createNotification(input) {
      const rows = await q(
        `insert into notifications (user_id, kind, title, body, href, dedupe_key)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (user_id, dedupe_key) do nothing
         returning *`,
        [
          input.userId,
          input.kind,
          input.title,
          input.body,
          input.href,
          input.dedupeKey,
        ],
      );
      return rows[0] ? toNotification(rows[0]) : null;
    },

    async listNotifications(userId, limit) {
      const rows = await q(
        `select * from notifications where user_id = $1
         order by created_at desc limit $2`,
        [userId, limit],
      );
      const unreadRows = await q(
        `select count(*)::int as n from notifications
          where user_id = $1 and read_at is null`,
        [userId],
      );
      return { items: rows.map(toNotification), unread: Number(unreadRows[0].n) };
    },

    async markNotificationRead(id, userId) {
      const rows = await q(
        `update notifications set read_at = coalesce(read_at, now())
          where id = $1 and user_id = $2 returning *`,
        [id, userId],
      );
      return rows[0] ? toNotification(rows[0]) : null;
    },

    async markAllNotificationsRead(userId) {
      const rows = await q(
        `update notifications set read_at = now()
          where user_id = $1 and read_at is null returning id`,
        [userId],
      );
      return rows.length;
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
