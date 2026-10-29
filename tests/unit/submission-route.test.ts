import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";

/**
 * Endpoint pengajuan artikel diuji langsung (bukan lewat UI) karena aturan
 * keamanan konten harus ditegakkan di server: dokumen divalidasi terhadap
 * allowlist, teks biasa diturunkan server, dan artikel kosong ditolak.
 */

const session = vi.hoisted(() => ({ userId: undefined as string | undefined }));

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ userId: session.userId }),
}));

const { POST } = await import("@/app/api/community/submissions/route");
const { PATCH } = await import("@/app/api/community/submissions/[id]/route");

const LONG_TEXT =
  "Penipu sering meminta kode OTP dengan alasan verifikasi akun. Langkah aman: " +
  "jangan pernah membagikan kode, tutup percakapan, dan hubungi layanan resmi " +
  "melalui aplikasi yang Anda pasang sendiri. Ingat bahwa bank, marketplace, " +
  "dan operator seluler tidak pernah meminta kode OTP melalui pesan singkat " +
  "maupun telepon. Bila sudah terlanjur memberikan kode, segera ganti kata " +
  "sandi, aktifkan verifikasi dua langkah, dan periksa riwayat transaksi.";

function textDoc(value: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
  };
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    title: "Cara mengenali permintaan kode OTP palsu",
    summary:
      "Ringkasan singkat tentang modus permintaan kode OTP dan langkah aman yang bisa dilakukan pembaca.",
    category: "Rekayasa sosial",
    bodyJson: textDoc(LONG_TEXT),
    captchaToken: "token-dari-widget",
    ...overrides,
  };
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://saring.test/api/community/submissions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "saring.test",
      origin: "https://saring.test",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function patch(id: string, body: unknown) {
  return new Request(`https://saring.test/api/community/submissions/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      host: "saring.test",
      origin: "https://saring.test",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}

/** Memanggil handler PATCH dengan konteks params yang sama seperti App Router. */
function callPatch(id: string, body: unknown) {
  return PATCH(patch(id, body), { params: Promise.resolve({ id }) });
}

function siteverify(ok: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ success: ok, action: "submission" }), {
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

beforeEach(async () => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "secret-tidak-nyata");
  vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY", "site-key");
  vi.stubEnv("SARING_TURNSTILE_BYPASS", "");
  __resetMemoryStore();

  const user = await createUser("penulis@contoh.test", "Penulis Uji");
  session.userId = user.id;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  session.userId = undefined;
});

describe("POST /api/community/submissions", () => {
  it("menolak pengunjung tanpa sesi", async () => {
    session.userId = undefined;
    expect((await POST(post(payload()))).status).toBe(401);
  });

  it("menolak artikel kosong", async () => {
    siteverify(true);

    const response = await POST(
      post(payload({ bodyJson: { type: "doc", content: [] } })),
    );

    expect(response.status).toBe(400);
    expect(await getStore().listSubmissionsByAuthor(session.userId!)).toHaveLength(0);
  });

  it("menolak dokumen yang hanya berisi markup kosong", async () => {
    siteverify(true);

    const empty = {
      type: "doc",
      content: [
        { type: "paragraph", content: [] },
        { type: "paragraph", content: [{ type: "text", text: "   " }] },
      ],
    };

    expect((await POST(post(payload({ bodyJson: empty })))).status).toBe(400);
  });

  it("menolak isi di bawah 300 karakter", async () => {
    siteverify(true);

    const response = await POST(
      post(payload({ bodyJson: textDoc("a".repeat(299)) })),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Isi artikel minimal 300 karakter.",
    });
  });

  it("menolak tautan berbahaya di dalam dokumen", async () => {
    siteverify(true);

    const dangerous = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: LONG_TEXT },
            {
              type: "text",
              text: "klik",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    };

    const response = await POST(post(payload({ bodyJson: dangerous })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/tautan/i),
    });
  });

  it("menolak node di luar allowlist", async () => {
    siteverify(true);

    const withCodeBlock = {
      type: "doc",
      content: [
        { type: "codeBlock", content: [{ type: "text", text: LONG_TEXT }] },
      ],
    };

    expect((await POST(post(payload({ bodyJson: withCodeBlock })))).status).toBe(400);
  });

  it("menolak bila CAPTCHA gagal tanpa menyimpan apa pun", async () => {
    siteverify(false);

    expect((await POST(post(payload()))).status).toBe(400);
    expect(await getStore().listSubmissionsByAuthor(session.userId!)).toHaveLength(0);
  });

  it("menolak request lintas situs", async () => {
    siteverify(true);

    const response = await POST(post(payload(), { origin: "https://penipu.test" }));

    expect(response.status).toBe(403);
  });
});
describe("POST /api/community/submissions: format tersimpan", () => {
  it("menyimpan format dan menurunkan teks biasa di server", async () => {
    siteverify(true);

    const bodyJson = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Langkah aman" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: LONG_TEXT, marks: [{ type: "bold" }] },
            { type: "text", text: " " },
            {
              type: "text",
              text: "sumber",
              marks: [{ type: "link", attrs: { href: "https://ojk.go.id/" } }],
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Jangan bagikan kode" }],
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await POST(post(payload({ bodyJson })));
    expect(response.status).toBe(201);

    const [stored] = await getStore().listSubmissionsByAuthor(session.userId!);

    expect(stored.status).toBe("pending");
    expect(stored.bodyJson).not.toBeNull();
    expect(stored.bodyJson!.content.map((node) => node.type)).toEqual([
      "heading",
      "paragraph",
      "bulletList",
    ]);

    // Teks biasa diturunkan server, bukan dikirim klien.
    expect(stored.body).toContain("Langkah aman");
    expect(stored.body).toContain("Jangan bagikan kode");
    expect(stored.body).not.toContain("<");
  });

  it("memperlakukan HTML di dalam teks sebagai teks biasa", async () => {
    siteverify(true);

    const html = `${LONG_TEXT} <script>alert(1)</script>`;
    const response = await POST(post(payload({ bodyJson: textDoc(html) })));
    expect(response.status).toBe(201);

    const [stored] = await getStore().listSubmissionsByAuthor(session.userId!);
    expect(stored.body).toContain("<script>alert(1)</script>");
    expect(stored.bodyJson!.content[0].content?.[0].text).toContain("<script>");
  });

  it("mengabaikan field body plain text dari klien", async () => {
    siteverify(true);

    await POST(
      post(payload({ body: "teks yang dikirim klien tidak dipakai" })),
    );

    const [stored] = await getStore().listSubmissionsByAuthor(session.userId!);
    // body diturunkan dari bodyJson, bukan dari field body kiriman klien.
    expect(stored.body).toBe(LONG_TEXT);
  });
});

describe("PATCH /api/community/submissions/[id]", () => {
  async function createOwnSubmission() {
    siteverify(true);
    await POST(post(payload()));
    const [stored] = await getStore().listSubmissionsByAuthor(session.userId!);
    return stored;
  }

  it("memperbarui artikel milik sendiri dan mengembalikan status ke pending", async () => {
    const mine = await createOwnSubmission();

    await getStore().reviewSubmission({
      id: mine.id,
      status: "needs_revision",
      note: "Tambahkan sumber resmi.",
      reviewerId: session.userId!,
      reviewerName: "Penulis Uji",
      slug: mine.title,
    });

    siteverify(true);
    const response = await callPatch(
      mine.id,
      payload({ title: "Judul artikel yang sudah diperbaiki" }),
    );

    expect(response.status).toBe(200);
    const updated = await getStore().findSubmission(mine.id);
    expect(updated?.status).toBe("pending");
    expect(updated?.title).toBe("Judul artikel yang sudah diperbaiki");
  });

  it("menolak pengguna lain mengubah artikel (cegah IDOR)", async () => {
    const mine = await createOwnSubmission();
    const other = await createUser("lain@contoh.test", "Pengguna Lain");
    session.userId = other.id;

    siteverify(true);
    const response = await callPatch(
      mine.id,
      payload({ title: "Diambil alih orang lain" }),
    );

    expect(response.status).toBe(404);
    expect((await getStore().findSubmission(mine.id))?.title).toBe(mine.title);
  });

  it("menolak perubahan setelah artikel disetujui", async () => {
    const mine = await createOwnSubmission();

    await getStore().reviewSubmission({
      id: mine.id,
      status: "approved",
      note: null,
      reviewerId: session.userId!,
      reviewerName: "Admin",
      slug: mine.title,
    });

    siteverify(true);
    expect((await callPatch(mine.id, payload())).status).toBe(409);
  });
});

describe("POST /api/community/submissions: media", () => {
  const mediaDoc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: LONG_TEXT }],
      },
      {
        type: "image",
        attrs: { src: "https://i.imgur.com/L0pP68gl.jpg", alt: "Contoh gambar" },
      },
      { type: "imgurEmbed", attrs: { id: "l4mKcOj", kind: "album" } },
    ],
  };

  it("menyimpan node gambar dan embed Imgur ke body_json", async () => {
    siteverify(true);

    const response = await POST(post(payload({ bodyJson: mediaDoc })));
    expect(response.status).toBe(201);

    const [stored] = await getStore().listSubmissionsByAuthor(session.userId!);
    const types = stored.bodyJson!.content.map((node) => node.type);

    expect(types).toEqual(["paragraph", "image", "imgurEmbed"]);
    expect(stored.bodyJson!.content[1].attrs).toEqual({
      src: "https://i.imgur.com/L0pP68gl.jpg",
      alt: "Contoh gambar",
    });
    expect(stored.bodyJson!.content[2].attrs).toEqual({
      id: "l4mKcOj",
      kind: "album",
    });
  });

  it("menolak gambar dengan URL tidak aman", async () => {
    siteverify(true);

    for (const src of [
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "http://i.imgur.com/L0pP68gl.jpg",
      "https://imgur.com/a/l4mKcOj",
    ]) {
      const response = await POST(
        post(
          payload({
            bodyJson: {
              type: "doc",
              content: [
                { type: "paragraph", content: [{ type: "text", text: LONG_TEXT }] },
                { type: "image", attrs: { src } },
              ],
            },
          }),
        ),
      );
      expect(response.status).toBe(400);
    }

    expect(await getStore().listSubmissionsByAuthor(session.userId!)).toHaveLength(0);
  });

  it("menolak embed Imgur dengan id tidak valid", async () => {
    siteverify(true);

    const response = await POST(
      post(
        payload({
          bodyJson: {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: LONG_TEXT }] },
              { type: "imgurEmbed", attrs: { id: "<script>", kind: "album" } },
            ],
          },
        }),
      ),
    );

    expect(response.status).toBe(400);
  });

  it("mengabaikan script yang ditempel di dalam atribut embed", async () => {
    siteverify(true);

    const response = await POST(
      post(
        payload({
          bodyJson: {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: LONG_TEXT }] },
              {
                type: "imgurEmbed",
                attrs: {
                  id: "l4mKcOj",
                  kind: "album",
                  html: '<script src="//s.imgur.com/min/embed.js"></script>',
                },
              },
            ],
          },
        }),
      ),
    );

    expect(response.status).toBe(201);
    const [stored] = await getStore().listSubmissionsByAuthor(session.userId!);
    expect(stored.bodyJson!.content[1].attrs).toEqual({
      id: "l4mKcOj",
      kind: "album",
    });
    expect(JSON.stringify(stored.bodyJson)).not.toContain("embed.js");
  });

  it("artikel hanya berisi gambar tetap dianggap kosong", async () => {
    siteverify(true);

    const response = await POST(
      post(
        payload({
          bodyJson: {
            type: "doc",
            content: [
              {
                type: "image",
                attrs: { src: "https://i.imgur.com/L0pP68gl.jpg" },
              },
            ],
          },
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/minimal 300/i),
    });
  });
});
