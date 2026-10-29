import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";
import type { RichDoc } from "@/lib/content/rich-text";

/**
 * Endpoint yang menyentuh data privat: revisi, draf, bookmark, notifikasi.
 *
 * Diuji langsung di route handler (bukan lewat UI) karena aturan kepemilikan dan
 * validasi wajib ditegakkan di server. Store yang dipakai adalah memory store
 * dengan kontrak yang sama seperti PostgreSQL.
 */

const session = vi.hoisted(() => ({ userId: undefined as string | undefined }));

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ userId: session.userId }),
}));

const revisionRoute = await import(
  "@/app/api/community/submissions/[id]/revisions/route"
);
const draftsRoute = await import("@/app/api/community/drafts/route");
const draftDeleteRoute = await import("@/app/api/community/drafts/[id]/route");
const bookmarksRoute = await import("@/app/api/community/bookmarks/route");
const bookmarkDeleteRoute = await import(
  "@/app/api/community/bookmarks/[slug]/route"
);
const notificationsRoute = await import(
  "@/app/api/community/notifications/route"
);
const notificationReadRoute = await import(
  "@/app/api/community/notifications/read/route"
);
const repliesRoute = await import(
  "@/app/api/community/threads/[id]/replies/route"
);

const LONG_TEXT =
  "Penipu sering meminta kode OTP dengan alasan verifikasi akun. Langkah aman: " +
  "jangan pernah membagikan kode, tutup percakapan, dan hubungi layanan resmi " +
  "melalui aplikasi yang Anda pasang sendiri. Ingat bahwa bank, marketplace, dan " +
  "operator seluler tidak pernah meminta kode OTP melalui pesan singkat maupun " +
  "telepon. Bila sudah terlanjur memberikan kode, segera ganti kata sandi, " +
  "aktifkan verifikasi dua langkah, dan periksa riwayat transaksi.";

const docOf = (text: string): RichDoc => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      host: "saring.test",
      origin: "https://saring.test",
      "sec-fetch-site": "same-origin",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function siteverify(ok = true, action = "submission") {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ success: ok, action }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

async function createUser(email: string, displayName: string) {
  return getStore().createUser({
    email,
    displayName,
    passwordHash: "hash-tidak-dipakai-di-tes",
  });
}

async function publishedSubmission(authorId: string, title = "Artikel terbit") {
  const created = await getStore().createSubmission({
    authorId,
    title,
    summary:
      "Ringkasan artikel yang cukup panjang untuk lolos validasi isi pengajuan.",
    category: "Phishing",
    body: LONG_TEXT,
    bodyJson: docOf(LONG_TEXT),
    references: null,
  });
  return getStore().reviewSubmission({
    id: created.id,
    status: "approved",
    note: null,
    reviewerId: authorId,
    reviewerName: "Admin",
    slug: title,
  });
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "secret-tidak-nyata");
  vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY", "site-key");
  vi.stubEnv("SARING_TURNSTILE_BYPASS", "");
  __resetMemoryStore();
  session.userId = undefined;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  session.userId = undefined;
});

describe("POST /api/community/submissions/[id]/revisions", () => {
  const revisionBody = {
    title: "Judul revisi yang baru",
    summary:
      "Ringkasan revisi yang cukup panjang untuk lolos validasi isi pengajuan.",
    category: "Rekayasa sosial",
    bodyJson: docOf(LONG_TEXT),
    captchaToken: "token",
  };

  it("menolak pengunjung tanpa sesi", async () => {
    const res = await revisionRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", revisionBody),
      { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }) },
    );
    expect(res.status).toBe(401);
  });

  it("menolak artikel milik pengguna lain", async () => {
    const author = await createUser("a@contoh.test", "Penulis");
    const other = await createUser("b@contoh.test", "Lain");
    const submission = await publishedSubmission(author.id);
    session.userId = other.id;

    const res = await revisionRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", revisionBody),
      { params: Promise.resolve({ id: submission!.id }) },
    );

    expect(res.status).toBe(404);
  });

  it("menolak artikel yang belum terbit", async () => {
    const author = await createUser("c@contoh.test", "Penulis");
    session.userId = author.id;
    const created = await getStore().createSubmission({
      authorId: author.id,
      title: "Masih menunggu",
      summary:
        "Ringkasan artikel yang cukup panjang untuk lolos validasi isi pengajuan.",
      category: "Phishing",
      body: LONG_TEXT,
      bodyJson: docOf(LONG_TEXT),
      references: null,
    });

    const res = await revisionRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", revisionBody),
      { params: Promise.resolve({ id: created.id }) },
    );

    expect(res.status).toBe(409);
  });

  it("membuat revisi tanpa mengubah artikel publik", async () => {
    siteverify(true);
    const author = await createUser("d@contoh.test", "Penulis");
    session.userId = author.id;
    const submission = await publishedSubmission(author.id, "Artikel publik");

    const res = await revisionRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", revisionBody),
      { params: Promise.resolve({ id: submission!.id }) },
    );

    expect(res.status).toBe(201);

    const published = await getStore().findPublishedArticle("artikel-publik");
    expect(published?.title).toBe("Artikel publik");
    expect((await getStore().findOpenRevision(submission!.id))?.status).toBe(
      "pending",
    );
  });

  it("menolak pengajuan revisi kedua saat satu revisi masih pending", async () => {
    siteverify(true);
    const author = await createUser("e@contoh.test", "Penulis");
    session.userId = author.id;
    const submission = await publishedSubmission(author.id, "Artikel duplikat");

    await revisionRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", revisionBody),
      { params: Promise.resolve({ id: submission!.id }) },
    );
    const second = await revisionRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", revisionBody),
      { params: Promise.resolve({ id: submission!.id }) },
    );

    expect(second.status).toBe(409);
    const all = await getStore().listRevisionsByAuthor(author.id);
    expect(all.filter((r) => r.status === "pending")).toHaveLength(1);
  });

  it("menolak revisi bila CAPTCHA gagal", async () => {
    siteverify(false);
    const author = await createUser("f@contoh.test", "Penulis");
    session.userId = author.id;
    const submission = await publishedSubmission(author.id, "Artikel captcha");

    const res = await revisionRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", revisionBody),
      { params: Promise.resolve({ id: submission!.id }) },
    );

    expect(res.status).toBe(400);
    expect(await getStore().findOpenRevision(submission!.id)).toBeNull();
  });
});


describe("Draf autosave", () => {
  const articleDraft = {
    kind: "article",
    targetSubmissionId: null,
    payload: {
      title: "Draf artikel",
      summary: "",
      category: "Phishing",
      bodyJson: docOf("Isi draf yang belum lengkap."),
      references: "",
    },
  };

  it("menolak pengunjung tanpa sesi", async () => {
    const res = await draftsRoute.PUT(
      jsonRequest("https://saring.test/api/x", "PUT", articleDraft),
    );
    expect(res.status).toBe(401);
  });

  it("meng-upsert satu draf per jenis dan target", async () => {
    const user = await createUser("draft@contoh.test", "Penulis");
    session.userId = user.id;

    const first = await draftsRoute.PUT(
      jsonRequest("https://saring.test/api/x", "PUT", articleDraft),
    );
    const second = await draftsRoute.PUT(
      jsonRequest("https://saring.test/api/x", "PUT", {
        ...articleDraft,
        payload: { ...articleDraft.payload, title: "Draf artikel diperbarui" },
      }),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const drafts = await getStore().listDrafts(user.id);
    expect(drafts).toHaveLength(1);
    expect((drafts[0].payload as { title: string }).title).toBe(
      "Draf artikel diperbarui",
    );
  });

  it("menolak bodyJson dengan node di luar allowlist", async () => {
    const user = await createUser("draft2@contoh.test", "Penulis");
    session.userId = user.id;

    const res = await draftsRoute.PUT(
      jsonRequest("https://saring.test/api/x", "PUT", {
        ...articleDraft,
        payload: {
          ...articleDraft.payload,
          bodyJson: { type: "doc", content: [{ type: "script" }] },
        },
      }),
    );

    expect(res.status).toBe(400);
    expect(await getStore().listDrafts(user.id)).toHaveLength(0);
  });

  it("draf hanya dapat dibaca pemiliknya", async () => {
    const owner = await createUser("draft3@contoh.test", "Pemilik");
    const other = await createUser("draft4@contoh.test", "Lain");
    session.userId = owner.id;
    await draftsRoute.PUT(jsonRequest("https://saring.test/api/x", "PUT", articleDraft));

    session.userId = other.id;
    const res = await draftsRoute.GET();
    const data = (await res.json()) as { drafts: unknown[] };

    expect(data.drafts).toHaveLength(0);
  });

  it("tidak dapat menghapus draf milik orang lain", async () => {
    const owner = await createUser("draft5@contoh.test", "Pemilik");
    const other = await createUser("draft6@contoh.test", "Lain");
    session.userId = owner.id;
    await draftsRoute.PUT(jsonRequest("https://saring.test/api/x", "PUT", articleDraft));
    const [draft] = await getStore().listDrafts(owner.id);

    session.userId = other.id;
    const res = await draftDeleteRoute.DELETE(
      jsonRequest("https://saring.test/api/x", "DELETE"),
      { params: Promise.resolve({ id: draft.id }) },
    );

    expect(res.status).toBe(404);
    expect(await getStore().listDrafts(owner.id)).toHaveLength(1);
  });

  it("menolak draf revisi untuk artikel yang belum terbit", async () => {
    const user = await createUser("draft7@contoh.test", "Penulis");
    session.userId = user.id;
    const created = await getStore().createSubmission({
      authorId: user.id,
      title: "Belum terbit",
      summary:
        "Ringkasan artikel yang cukup panjang untuk lolos validasi isi pengajuan.",
      category: "Phishing",
      body: LONG_TEXT,
      bodyJson: docOf(LONG_TEXT),
      references: null,
    });

    const res = await draftsRoute.PUT(
      jsonRequest("https://saring.test/api/x", "PUT", {
        ...articleDraft,
        targetSubmissionId: created.id,
      }),
    );

    expect(res.status).toBe(409);
  });
});


describe("Bookmark artikel", () => {
  const BUILTIN = "otp-dan-pengambilalihan-akun";

  it("menolak pengunjung tanpa sesi", async () => {
    const res = await bookmarksRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", { slug: BUILTIN }),
    );
    expect(res.status).toBe(401);
  });

  it("menerima artikel bawaan Pustaka", async () => {
    const user = await createUser("bm1@contoh.test", "Pengguna");
    session.userId = user.id;

    const res = await bookmarksRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", { slug: BUILTIN }),
    );

    expect(res.status).toBe(201);
    expect(await getStore().isBookmarked(user.id, BUILTIN)).toBe(true);
  });

  it("menerima kontribusi yang sudah disetujui", async () => {
    const author = await createUser("bm2@contoh.test", "Penulis");
    const reader = await createUser("bm3@contoh.test", "Pembaca");
    session.userId = reader.id;
    const submission = await publishedSubmission(author.id, "Artikel bookmark");

    const res = await bookmarksRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", { slug: submission!.slug! }),
    );

    expect(res.status).toBe(201);
  });

  it("menolak artikel yang belum terbit", async () => {
    const author = await createUser("bm4@contoh.test", "Penulis");
    const reader = await createUser("bm5@contoh.test", "Pembaca");
    session.userId = reader.id;
    await getStore().createSubmission({
      authorId: author.id,
      title: "Artikel pending bookmark",
      summary:
        "Ringkasan artikel yang cukup panjang untuk lolos validasi isi pengajuan.",
      category: "Phishing",
      body: LONG_TEXT,
      bodyJson: docOf(LONG_TEXT),
      references: null,
    });

    const res = await bookmarksRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", {
        slug: "artikel-pending-bookmark",
      }),
    );

    expect(res.status).toBe(404);
  });

  it("tidak membuat bookmark ganda", async () => {
    const user = await createUser("bm6@contoh.test", "Pengguna");
    session.userId = user.id;
    const body = { slug: BUILTIN };

    await bookmarksRoute.POST(jsonRequest("https://saring.test/api/x", "POST", body));
    await bookmarksRoute.POST(jsonRequest("https://saring.test/api/x", "POST", body));

    expect(await getStore().listBookmarks(user.id)).toHaveLength(1);
  });

  it("menghapus bookmark hanya milik sendiri", async () => {
    const owner = await createUser("bm7@contoh.test", "Pemilik");
    const other = await createUser("bm8@contoh.test", "Lain");
    session.userId = owner.id;
    await bookmarksRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", { slug: BUILTIN }),
    );

    session.userId = other.id;
    await bookmarkDeleteRoute.DELETE(
      jsonRequest("https://saring.test/api/x", "DELETE"),
      { params: Promise.resolve({ slug: BUILTIN }) },
    );

    expect(await getStore().isBookmarked(owner.id, BUILTIN)).toBe(true);
    expect(await getStore().isBookmarked(other.id, BUILTIN)).toBe(false);
  });
});


describe("Notifikasi", () => {
  it("pengunjung tanpa sesi menerima daftar kosong, bukan error", async () => {
    const res = await notificationsRoute.GET();
    const data = (await res.json()) as { items: unknown[]; unread: number };

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(0);
    expect(data.unread).toBe(0);
  });

  it("balasan pada diskusi membuat notifikasi untuk penulis pertanyaan", async () => {
    siteverify(true, "reply");
    const author = await createUser("n1@contoh.test", "Penanya");
    const replier = await createUser("n2@contoh.test", "Penjawab");

    const thread = await getStore().createThread({
      authorId: author.id,
      title: "Pertanyaan yang akan dibalas",
      category: "lainnya",
      body: "Isi pertanyaan yang cukup panjang untuk lolos validasi.",
      articleSlug: null,
    });

    session.userId = replier.id;
    const res = await repliesRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", {
        body: "Balasan yang cukup panjang untuk lolos validasi.",
        captchaToken: "token",
      }),
      { params: Promise.resolve({ id: thread.id }) },
    );

    expect(res.status).toBe(201);

    const list = await getStore().listNotifications(author.id, 10);
    expect(list.unread).toBe(1);
    expect(list.items[0].kind).toBe("thread_reply");
    expect(list.items[0].href).toBe(`/komunitas/${thread.id}`);
  });

  it("tidak membuat notifikasi untuk balasan pada pertanyaan sendiri", async () => {
    siteverify(true, "reply");
    const author = await createUser("n3@contoh.test", "Penanya");
    session.userId = author.id;

    const thread = await getStore().createThread({
      authorId: author.id,
      title: "Pertanyaan sendiri",
      category: "lainnya",
      body: "Isi pertanyaan yang cukup panjang untuk lolos validasi.",
      articleSlug: null,
    });

    await repliesRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", {
        body: "Balasan sendiri yang cukup panjang untuk validasi.",
        captchaToken: "token",
      }),
      { params: Promise.resolve({ id: thread.id }) },
    );

    expect((await getStore().listNotifications(author.id, 10)).items).toHaveLength(0);
  });

  it("notifikasi bersifat idempoten untuk peristiwa yang sama", async () => {
    const author = await createUser("n4@contoh.test", "Penanya");
    const payload = {
      userId: author.id,
      kind: "thread_reply" as const,
      title: "Balasan baru",
      body: null,
      href: "/komunitas/x",
      dedupeKey: "reply:fixed-id",
    };

    await getStore().createNotification(payload);
    const second = await getStore().createNotification(payload);

    expect(second).toBeNull();
    expect((await getStore().listNotifications(author.id, 10)).items).toHaveLength(1);
  });

  it("pengguna tidak dapat menandai notifikasi milik orang lain", async () => {
    const owner = await createUser("n5@contoh.test", "Pemilik");
    const other = await createUser("n6@contoh.test", "Lain");

    await getStore().createNotification({
      userId: owner.id,
      kind: "article_approved",
      title: "Artikel disetujui",
      body: null,
      href: "/pustaka/x",
      dedupeKey: "submission:x:approved",
    });
    const [item] = (await getStore().listNotifications(owner.id, 10)).items;

    session.userId = other.id;
    const res = await notificationReadRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", { id: item.id }),
    );

    expect(res.status).toBe(404);
    expect((await getStore().listNotifications(owner.id, 10)).unread).toBe(1);
  });

  it("tandai semua hanya memengaruhi notifikasi sendiri", async () => {
    const owner = await createUser("n7@contoh.test", "Pemilik");
    const other = await createUser("n8@contoh.test", "Lain");
    for (const user of [owner, other]) {
      await getStore().createNotification({
        userId: user.id,
        kind: "thread_reply",
        title: "Balasan",
        body: null,
        href: "/komunitas/x",
        dedupeKey: `reply:${user.id}`,
      });
    }

    session.userId = owner.id;
    const res = await notificationReadRoute.POST(
      jsonRequest("https://saring.test/api/x", "POST", { all: true }),
    );

    expect(res.status).toBe(200);
    expect((await getStore().listNotifications(owner.id, 10)).unread).toBe(0);
    expect((await getStore().listNotifications(other.id, 10)).unread).toBe(1);
  });
});

