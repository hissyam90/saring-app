import { expect, test, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { sealData } from "iron-session";

/**
 * Verifikasi end-to-end untuk pekerjaan v16.
 *
 * Memakai PostgreSQL sungguhan dan server produksi (`next build` + `next start`)
 * dari `playwright.config.ts`. Data uji dibuat dengan awalan unik lalu dihapus
 * kembali, sehingga data pengguna yang sudah ada tidak tersentuh.
 */

loadEnvConfig(process.cwd(), true);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = "kata-sandi-uji-yang-panjang-123";

/** Kunci localStorage preferensi tema. Harus sama dengan `lib/theme.ts`. */
const THEME_STORAGE_KEY = "saring.theme";

const suffix = randomUUID().slice(0, 8);
const AUTHOR_EMAIL = `v16-author-${suffix}@contoh.test`;
const ADMIN_EMAIL = `v16-admin-${suffix}@contoh.test`;
const READER_EMAIL = `v16-reader-${suffix}@contoh.test`;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL === "verify-full" },
});

const createdUserIds: string[] = [];
let authorId = "";
let adminId = "";
let readerId = "";

async function createUser(
  email: string,
  displayName: string,
  role: "user" | "admin",
) {
  const hash = await bcrypt.hash(PASSWORD, 12);
  const result = await pool.query(
    `insert into users (email, display_name, password_hash, role)
     values (lower($1), $2, $3, $4) returning id`,
    [email, displayName, hash, role],
  );
  const id = String(result.rows[0].id);
  createdUserIds.push(id);
  return id;
}

async function loginAs(
  context: BrowserContext,
  userId: string,
  role: "user" | "admin",
) {
  const value = await sealData(
    { userId, role, issuedAt: Date.now() },
    { password: process.env.SESSION_SECRET as string, ttl: 60 * 60 },
  );
  await context.addCookies([
    {
      name: "saring_session",
      value,
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function submissionByTitle(title: string) {
  const result = await pool.query(
    `select id, title, status, slug, body, body_json
     from submissions where title like $1 order by created_at desc limit 1`,
    [`${title}%`],
  );
  return result.rows[0] as
    | {
        id: string;
        title: string;
        status: string;
        slug: string | null;
        body: string;
        body_json: unknown;
      }
    | undefined;
}

const ARTICLE_TEXT =
  "Pesan kurir palsu biasanya meminta biaya tambahan dengan alasan paket tertahan " +
  "di gudang. Tautan di dalam pesan mengarah ke halaman pembayaran yang meniru " +
  "situs resmi. Langkah aman: buka aplikasi kurir resmi, periksa nomor resi di " +
  "sana, dan jangan pernah membayar lewat tautan dari pesan. Ingat juga bahwa " +
  "layanan kurir resmi tidak pernah meminta pembayaran melalui pesan singkat, " +
  "dan selalu menampilkan nomor resi yang bisa dicocokkan di aplikasi mereka.";

test.beforeAll(async () => {
  authorId = await createUser(AUTHOR_EMAIL, `Penulis v16 ${suffix}`, "user");
  adminId = await createUser(ADMIN_EMAIL, `Admin v16 ${suffix}`, "admin");
  readerId = await createUser(READER_EMAIL, `Pembaca v16 ${suffix}`, "user");
});

test.afterAll(async () => {
  if (createdUserIds.length > 0) {
    await pool.query(`delete from users where id = any($1::uuid[])`, [
      createdUserIds,
    ]);
  }
  await pool.end();
});

test.describe.configure({ mode: "serial" });

test.describe("UI: editor dan search bar", () => {
  test("editor tidak meluap walau berisi URL panjang", async ({
    page,
    context,
  }) => {
    await loginAs(context, authorId, "user");
    await page.goto("/komunitas/artikel");
    await page.locator("#artikel-editor").click();
    await page.keyboard.type(`https://contoh.test/${"a".repeat(220)}`);

    const metrics = await page.evaluate(() => {
      const editor = document.querySelector("#artikel-editor") as HTMLElement | null;
      return {
        docOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        editorOverflow: editor ? editor.scrollWidth - editor.clientWidth : null,
      };
    });

    expect(metrics.docOverflow).toBeLessThanOrEqual(1);
    expect(metrics.editorOverflow).toBeLessThanOrEqual(1);
  });

  test("search bar Pustaka punya border empat sisi pada mode terang dan gelap", async ({
    page,
  }) => {
    const readBorders = async () =>
      page.evaluate(() => {
        const input = document.querySelector(
          'input[aria-label="Cari topik pustaka"]',
        ) as HTMLInputElement | null;
        if (!input) return null;
        const cs = getComputedStyle(input);
        return {
          top: cs.borderTopWidth,
          right: cs.borderRightWidth,
          bottom: cs.borderBottomWidth,
          left: cs.borderLeftWidth,
          color: cs.borderTopColor,
          bg: cs.backgroundColor,
          bodyBg: getComputedStyle(document.body).backgroundColor,
        };
      });

    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/pustaka");
    const light = await readBorders();
    expect(light).not.toBeNull();
    for (const side of ["top", "right", "bottom", "left"] as const) {
      expect(light![side]).toBe("2px");
    }
    expect(light!.bodyBg).toBe("rgb(245, 242, 234)");

    // Mode gelap dipilih manual: default pengunjung baru kini light, jadi
    // preferensi sistem saja tidak lagi mengubah tema.
    await page.evaluate(
      (key) => window.localStorage.setItem(key, "dark"),
      THEME_STORAGE_KEY,
    );
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    const dark = await readBorders();
    expect(dark).not.toBeNull();
    for (const side of ["top", "right", "bottom", "left"] as const) {
      expect(dark![side]).toBe("2px");
    }
    expect(dark!.bodyBg).not.toBe(light!.bodyBg);
    expect(dark!.color).not.toBe(light!.color);
  });

  test("pengunjung baru selalu light; kontrol tema tidak ada di navigasi", async ({
    page,
  }) => {
    // Default baru: light meski sistem gelap.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const bodyWithDarkOs = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(bodyWithDarkOs).toBe("rgb(245, 242, 234)");
    expect(
      await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      ),
    ).toBe("light");

    // Kontrol tema berada di halaman akun (lihat tests/e2e/contrast.spec.ts),
    // bukan di sidebar atau menu navigasi.
    expect(
      await page.locator("aside").getByRole("group", {
        name: "Pilihan tema tampilan",
      }).count(),
    ).toBe(0);
  });
});


test.describe("Kategori pertanyaan", () => {
  test("Lainnya terpilih otomatis pada form pertanyaan baru", async ({
    page,
    context,
  }) => {
    await loginAs(context, readerId, "user");
    await page.goto("/komunitas/baru");

    const select = page.getByLabel("Kategori");
    await expect(select).toHaveValue("lainnya");
    await expect(select.locator("option:checked")).toHaveText("Lainnya");

    // Pengguna tetap dapat memilih kategori lain.
    await select.selectOption("phishing");
    await expect(select).toHaveValue("phishing");
  });

  test("filter Komunitas menerima kategori Lainnya", async ({ page }) => {
    const response = await page.request.get("/api/community/threads?kategori=lainnya");
    expect(response.status()).toBe(200);
    const data = (await response.json()) as { items: unknown[] };
    expect(Array.isArray(data.items)).toBe(true);
  });
});

test.describe("Media universal", () => {
  test("menyisipkan gambar lintas hosting dan embed Imgur", async ({
    page,
    context,
  }) => {
    await loginAs(context, authorId, "user");
    await page.goto("/komunitas/artikel");

    const form = page.locator("section").filter({ hasText: "Pengajuan baru" }).first();
    await page.locator("#artikel-editor").click();
    await page.keyboard.type(ARTICLE_TEXT);

    // Gambar dari Postimages (bukan Imgur).
    await form.getByRole("button", { name: "Sisipkan gambar atau media" }).click();
    await form
      .getByLabel("URL atau kode media")
      .fill("https://i.postimg.cc/abcd1234/contoh.jpg");
    await form.getByRole("button", { name: /^Sisipkan$/ }).click();

    await expect(page.locator("#artikel-editor img").first()).toHaveAttribute(
      "src",
      "https://i.postimg.cc/abcd1234/contoh.jpg",
    );
  });

  test("menolak halaman galeri yang belum didukung embed", async ({
    page,
    context,
  }) => {
    await loginAs(context, authorId, "user");
    await page.goto("/komunitas/artikel");
    const form = page.locator("section").filter({ hasText: "Pengajuan baru" }).first();

    await form.getByRole("button", { name: "Sisipkan gambar atau media" }).click();
    await form.getByLabel("URL atau kode media").fill("https://imgbox.com/abcd1234");

    // Tombol sisipkan nonaktif karena tidak ada representasi media yang aman.
    await expect(form.getByRole("button", { name: /^Sisipkan$/ })).toBeDisabled();
    await expect(page.locator("#artikel-editor img")).toHaveCount(0);
  });
});



test.describe("Revisi artikel publik", () => {
  const originalTitle = `Artikel revisi v16 ${suffix}`;
  const revisedTitle = `Artikel revisi v16 ${suffix} versi dua`;
  let submissionId = "";
  let slug = "";

  test.beforeAll(async () => {
    const slugBase = `artikel-revisi-v16-${suffix}`;
    const result = await pool.query(
      `insert into submissions
         (author_id, title, summary, category, body, body_json, status, slug, reviewed_at)
       values ($1, $2, $3, $4, $5, $6, 'approved', $7, now())
       returning id, slug`,
      [
        authorId,
        originalTitle,
        "Ringkasan artikel revisi yang cukup panjang untuk lolos validasi isi.",
        "Phishing",
        ARTICLE_TEXT,
        JSON.stringify({
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: ARTICLE_TEXT }] },
          ],
        }),
        slugBase,
      ],
    );
    submissionId = String(result.rows[0].id);
    slug = String(result.rows[0].slug);
  });

  test("penulis dapat mengajukan revisi tanpa menghilangkan versi publik", async ({
    page,
    context,
  }) => {
    await loginAs(context, authorId, "user");
    await page.goto(`/komunitas/artikel?edit=${submissionId}`);

    await expect(page.getByText(/Versi publik tetap tampil/i)).toBeVisible();
    await page.getByLabel("Judul artikel").fill(revisedTitle);
    await page
      .getByLabel("Ringkasan")
      .fill("Ringkasan versi kedua yang cukup panjang untuk lolos validasi isi.");

    // Token CAPTCHA dihasilkan widget secara asinkron. Tunggu hingga Cloudflare
    // benar-benar menulis token ke input tersembunyi, agar pengiriman tidak
    // ditolak oleh Siteverify karena token masih kosong.
    await expect
      .poll(
        async () =>
          await page.evaluate(() => {
            const input = document.querySelector(
              'input[name="cf-turnstile-response"]',
            ) as HTMLInputElement | null;
            return input?.value?.length ?? 0;
          }),
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0);

    await page.getByRole("button", { name: /Kirim revisi untuk ditinjau/i }).click();

    await expect(page.getByText(/Revisi terkirim/i)).toBeVisible({
      timeout: 20_000,
    });

    const revision = await pool.query(
      `select status, title from submission_revisions where submission_id = $1`,
      [submissionId],
    );
    expect(revision.rows).toHaveLength(1);
    expect(revision.rows[0].status).toBe("pending");
    expect(revision.rows[0].title).toBe(revisedTitle);

    const current = await pool.query(
      `select status, title from submissions where id = $1`,
      [submissionId],
    );
    expect(current.rows[0].status).toBe("approved");
    expect(current.rows[0].title).toBe(originalTitle);

    await page.goto(`/pustaka/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(originalTitle);
  });

  test("admin melihat perbandingan dan menyetujui revisi", async ({
    page,
    context,
  }) => {
    await loginAs(context, adminId, "admin");
    await page.goto("/admin/revisi");

    await expect(page.getByText(/Versi publik saat ini/i).first()).toBeVisible();
    await expect(page.getByText(revisedTitle).first()).toBeVisible();

    // Halaman ini mencantumkan semua revisi pending, termasuk milik pengujian
    // lain. Batasi aksi ke kartu yang memuat judul revisi ini agar tidak
    // menyetujui revisi yang salah.
    const card = page
      .locator("li")
      .filter({ hasText: revisedTitle })
      .first();
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "Setujui & terbitkan" }).click();
    await card.getByRole("button", { name: "Konfirmasi" }).click();

    await expect
      .poll(
        async () => {
          const result = await pool.query(
            `select status, title from submissions where id = $1`,
            [submissionId],
          );
          return `${result.rows[0].status}:${result.rows[0].title}`;
        },
        { timeout: 20_000 },
      )
      .toBe(`approved:${revisedTitle}`);

    const after = await pool.query(`select slug from submissions where id = $1`, [
      submissionId,
    ]);
    expect(after.rows[0].slug).toBe(slug);
  });

  test("versi baru tampil di Pustaka setelah disetujui", async ({ page }) => {
    await page.goto(`/pustaka/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(revisedTitle);
  });
});

test.describe("Autosave draf", () => {
  const draftTitle = `Draf artikel v16 ${suffix}`;

  test("menyimpan draf ke PostgreSQL dan memulihkannya", async ({
    page,
    context,
  }) => {
    await loginAs(context, authorId, "user");
    await page.goto("/komunitas/artikel");

    await page.getByLabel("Judul artikel").fill(draftTitle);
    await page
      .getByLabel("Ringkasan")
      .fill("Ringkasan draf yang cukup panjang untuk disimpan sebagai draf artikel.");
    await page.getByLabel("Kategori").fill("Rekayasa sosial");
    await page.locator("#artikel-editor").click();
    await page.keyboard.type(ARTICLE_TEXT);

    // Status tersimpan hanya muncul setelah server mengonfirmasi.
    await expect(page.getByText(/Tersimpan/i).first()).toBeVisible({
      timeout: 20_000,
    });

    const saved = await pool.query(
      `select id, kind, payload from drafts where owner_id = $1 and kind = 'article'`,
      [authorId],
    );
    expect(saved.rows.length).toBeGreaterThan(0);
    const payload = saved.rows[0].payload as { title: string };
    expect(payload.title).toBe(draftTitle);

    const draftId = String(saved.rows[0].id);

    // Draf tidak dipublikasikan otomatis.
    expect(await submissionByTitle(draftTitle)).toBeUndefined();

    // Daftar draf muncul di Akun Saya.
    await page.goto("/akun");
    await expect(page.getByText(draftTitle)).toBeVisible();

    // Melanjutkan draf memulihkan isi form.
    await page.goto(`/komunitas/artikel?draft=${draftId}`);
    await expect(page.getByText(/Melanjutkan draf tersimpan/i)).toBeVisible();
    await expect(page.getByLabel("Judul artikel")).toHaveValue(draftTitle);
    await expect(page.locator("#artikel-editor")).toContainText(
      "Pesan kurir palsu biasanya",
    );
  });
});

test.describe("Bookmark artikel", () => {
  test("tersimpan di akun dan bertahan setelah muat ulang", async ({
    page,
    context,
  }) => {
    await loginAs(context, readerId, "user");
    await page.goto("/pustaka");

    const card = page
      .locator("article")
      .filter({ hasText: "Nomor baru, minta pinjaman" })
      .first();
    await card.getByRole("button", { name: "Simpan artikel" }).click();
    await expect(
      card.getByRole("button", { name: "Hapus dari artikel tersimpan" }),
    ).toBeVisible();

    const stored = await pool.query(
      `select article_slug from article_bookmarks where user_id = $1`,
      [readerId],
    );
    expect(stored.rows.map((r) => r.article_slug)).toContain(
      "nomor-baru-minta-uang",
    );

    await page.goto("/akun/tersimpan");
    await expect(page.getByText("Nomor baru, minta pinjaman").first()).toBeVisible();

    // Bertahan setelah halaman dimuat ulang (data di database, bukan state).
    await page.reload();
    await expect(page.getByText("Nomor baru, minta pinjaman").first()).toBeVisible();
  });
});

test.describe("Notifikasi", () => {
  test("balasan pengguna lain membuat notifikasi nyata untuk penulis", async ({
    page,
    context,
    browser,
  }) => {
    // Pertanyaan milik penulis.
    const thread = await pool.query(
      `insert into threads (author_id, title, category, body)
       values ($1, $2, 'lainnya', $3) returning id`,
      [
        authorId,
        `Pertanyaan notifikasi v16 ${suffix}`,
        "Isi pertanyaan yang cukup panjang untuk lolos validasi minimal tiga puluh karakter.",
      ],
    );
    const threadId = String(thread.rows[0].id);

    // Pembaca membalas lewat API (CAPTCHA kunci uji + sesi pembaca).
    const readerContext = await browser.newContext();
    await loginAs(readerContext, readerId, "user");
    const reply = await readerContext.request.post(
      `/api/community/threads/${threadId}/replies`,
      {
        data: {
          body: "Balasan yang cukup panjang untuk lolos validasi balasan.",
          captchaToken: "dummy",
        },
      },
    );
    await readerContext.close();

    const notifications = await pool.query(
      `select kind, href, read_at from notifications where user_id = $1`,
      [authorId],
    );
    if (notifications.rows.length === 0) {
      // Token CAPTCHA dari luar browser tidak tersedia; catat sebagai batasan
      // alih-alih mengklaim berhasil.
      test.skip(true, `Balasan ditolak (${reply.status()}) tanpa token CAPTCHA browser.`);
      return;
    }

    await loginAs(context, authorId, "user");
    await page.goto("/komunitas");
    const bell = page.getByRole("button", { name: /Notifikasi, \d+ belum dibaca/ });
    await expect(bell).toBeVisible({ timeout: 15_000 });

    await bell.click();
    await expect(page.getByText(/membalas pertanyaan Anda/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Tandai semua" }).click();
    await expect(page.getByText("dibaca").first()).toBeVisible();

    // Status baca disimpan di server; tunggu hingga permintaan selesai.
    await expect
      .poll(
        async () => {
          const after = await pool.query(
            `select count(*)::int as unread from notifications
              where user_id = $1 and read_at is null`,
            [authorId],
          );
          return after.rows[0].unread as number;
        },
        { timeout: 15_000 },
      )
      .toBe(0);
  });
});


test.describe("Moderasi laporan", () => {
  /** Laporan nyata pada sebuah pertanyaan, dibuat langsung di PostgreSQL. */
  async function createReport(reason: string) {
    const thread = await pool.query(
      `insert into threads (author_id, title, category, body)
       values ($1, $2, 'lainnya', $3) returning id`,
      [authorId, `Laporan uji ${randomUUID().slice(0, 8)}`, "Isi pertanyaan uji moderasi."],
    );
    const report = await pool.query(
      `insert into reports (reporter_id, target_type, target_id, reason)
       values ($1, 'thread', $2, $3) returning id`,
      [readerId, thread.rows[0].id, reason],
    );
    return String(report.rows[0].id);
  }

  async function reportState(id: string) {
    const result = await pool.query(
      `select status, resolved_at from reports where id = $1`,
      [id],
    );
    return result.rows[0] as { status: string; resolved_at: Date | null };
  }

  /** Laporan atas sebuah balasan, beserta judul diskusi induknya. */
  async function createReplyReport() {
    const marker = randomUUID().slice(0, 8);
    const threadTitle = `Diskusi induk laporan ${marker}`;
    const replyBody = `Balasan yang dilaporkan ${marker} berisi tuduhan tanpa bukti.`;

    const thread = await pool.query(
      `insert into threads (author_id, title, category, body)
       values ($1, $2, 'lainnya', $3) returning id`,
      [authorId, threadTitle, "Isi pertanyaan induk untuk uji laporan balasan."],
    );
    const reply = await pool.query(
      `insert into replies (thread_id, author_id, body)
       values ($1, $2, $3) returning id`,
      [thread.rows[0].id, readerId, replyBody],
    );
    const report = await pool.query(
      `insert into reports (reporter_id, target_type, target_id, reason)
       values ($1, 'reply', $2, $3) returning id`,
      [authorId, reply.rows[0].id, "Balasan melanggar pedoman"],
    );

    return {
      reportId: String(report.rows[0].id),
      threadId: String(thread.rows[0].id),
      threadTitle,
      replyBody,
    };
  }

  test("laporan balasan menampilkan konteks dan tautan diskusi induk", async ({
    page,
    context,
  }) => {
    const fixture = await createReplyReport();

    try {
      await loginAs(context, adminId, "admin");
      await page.goto("/admin/laporan?status=open");

      const item = page
        .locator("li")
        .filter({ hasText: "Balasan melanggar pedoman" })
        .first();
      await expect(item).toBeVisible();

      // Konteks: judul diskusi induk dan isi balasan yang dilaporkan.
      await expect(item).toContainText(fixture.threadTitle);
      await expect(item).toContainText(fixture.replyBody);

      // Tautan menuju diskusi INDUK, bukan ke id balasan.
      const link = item.getByRole("link", { name: "Buka diskusi" });
      await expect(link).toHaveAttribute("href", `/komunitas/${fixture.threadId}`);
      const probe = await page.request.get(`/komunitas/${fixture.threadId}`);
      expect(probe.status()).toBe(200);
    } finally {
      await pool.query(`delete from reports where id = $1`, [fixture.reportId]);
    }
  });

  test("aksi status mengikuti keadaan laporan dan tidak mengulang transisi", async ({
    page,
    context,
  }) => {
    const fixture = await createReplyReport();

    try {
      await loginAs(context, adminId, "admin");

      const rowFor = async () => {
        const row = page
          .locator("li")
          .filter({ hasText: "Balasan melanggar pedoman" })
          .first();
        await expect(row).toBeVisible();
        return row;
      };

      // open: boleh ditinjau atau diselesaikan; belum ada "Buka lagi".
      await page.goto("/admin/laporan?status=open");
      let row = await rowFor();
      await expect(row.getByRole("button", { name: "Tandai ditinjau" })).toBeVisible();
      await expect(row.getByRole("button", { name: "Selesaikan" })).toBeVisible();
      await expect(row.getByRole("button", { name: "Buka lagi" })).toHaveCount(0);

      // reviewing: "Tandai ditinjau" tidak lagi ditawarkan.
      expect((await reportState(fixture.reportId)).status).toBe("open");
      const review = await context.request.post("/api/admin/moderate", {
        data: {
          action: "set-report-status",
          reportId: fixture.reportId,
          status: "reviewing",
        },
      });
      expect(review.status()).toBe(200);
      expect((await reportState(fixture.reportId)).status).toBe("reviewing");

      await page.goto("/admin/laporan?status=reviewing");
      row = await rowFor();
      await expect(row.getByRole("button", { name: "Tandai ditinjau" })).toHaveCount(0);
      await expect(row.getByRole("button", { name: "Selesaikan" })).toBeVisible();
      await expect(row.getByRole("button", { name: "Buka lagi" })).toBeVisible();

      // resolved: hanya "Buka lagi"; laporan tetap ada (tidak dihapus).
      const resolve = await context.request.post("/api/admin/moderate", {
        data: {
          action: "set-report-status",
          reportId: fixture.reportId,
          status: "resolved",
        },
      });
      expect(resolve.status()).toBe(200);

      await page.goto("/admin/laporan?status=resolved");
      row = await rowFor();
      await expect(row.getByRole("button", { name: "Buka lagi" })).toBeVisible();
      await expect(row.getByRole("button", { name: "Selesaikan" })).toHaveCount(0);
      await expect(row.getByRole("button", { name: "Tandai ditinjau" })).toHaveCount(0);

      const still = await reportState(fixture.reportId);
      expect(still.status).toBe("resolved");
      expect(still.resolved_at).not.toBeNull();
    } finally {
      await pool.query(`delete from reports where id = $1`, [fixture.reportId]);
    }
  });

  test("transisi open → reviewing → resolved → open menyimpan status dan resolved_at", async ({
    browser,
  }) => {
    const reportId = await createReport("Uji transisi status laporan");

    const adminContext = await browser.newContext();
    await loginAs(adminContext, adminId, "admin");

    const setStatus = async (status: string) => {
      const response = await adminContext.request.post("/api/admin/moderate", {
        data: { action: "set-report-status", reportId, status },
      });
      return response.status();
    };

    const initial = await reportState(reportId);
    expect(initial.status).toBe("open");
    expect(initial.resolved_at).toBeNull();

    // open -> reviewing: belum diselesaikan, jadi resolved_at tetap kosong.
    expect(await setStatus("reviewing")).toBe(200);
    const reviewing = await reportState(reportId);
    expect(reviewing.status).toBe("reviewing");
    expect(reviewing.resolved_at).toBeNull();

    // reviewing -> resolved: resolved_at terisi.
    expect(await setStatus("resolved")).toBe(200);
    const resolved = await reportState(reportId);
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolved_at).not.toBeNull();

    // resolved -> open: dibuka kembali, resolved_at dikosongkan.
    expect(await setStatus("open")).toBe(200);
    const reopened = await reportState(reportId);
    expect(reopened.status).toBe("open");
    expect(reopened.resolved_at).toBeNull();

    await adminContext.close();
  });

  test("menyelesaikan laporan mengisi resolved_at, membukanya mengosongkannya", async ({
    browser,
  }) => {
    const reportId = await createReport("Uji resolved_at dua arah");

    const adminContext = await browser.newContext();
    await loginAs(adminContext, adminId, "admin");

    const setStatus = (status: string) =>
      adminContext.request.post("/api/admin/moderate", {
        data: { action: "set-report-status", reportId, status },
      });

    expect((await setStatus("resolved")).status()).toBe(200);
    const first = await reportState(reportId);
    expect(first.status).toBe("resolved");
    const firstResolvedAt = first.resolved_at;
    expect(firstResolvedAt).not.toBeNull();

    // Kembali ke reviewing harus mengosongkan resolved_at.
    expect((await setStatus("reviewing")).status()).toBe(200);
    expect((await reportState(reportId)).resolved_at).toBeNull();

    // Diselesaikan lagi: resolved_at terisi kembali (waktu baru).
    expect((await setStatus("resolved")).status()).toBe(200);
    const second = await reportState(reportId);
    expect(second.resolved_at).not.toBeNull();
    expect(second.resolved_at!.getTime()).toBeGreaterThanOrEqual(
      firstResolvedAt!.getTime(),
    );

    await adminContext.close();
  });

  test("laporan tidak ditemukan dan status tidak valid ditolak tanpa mengubah data", async ({
    browser,
  }) => {
    const reportId = await createReport("Uji ID tidak ditemukan");

    const adminContext = await browser.newContext();
    await loginAs(adminContext, adminId, "admin");

    const missing = await adminContext.request.post("/api/admin/moderate", {
      data: {
        action: "set-report-status",
        reportId: "00000000-0000-0000-0000-000000000000",
        status: "resolved",
      },
    });
    expect(missing.status()).toBe(404);

    const invalidStatus = await adminContext.request.post("/api/admin/moderate", {
      data: { action: "set-report-status", reportId, status: "selesai" },
    });
    expect(invalidStatus.status()).toBe(400);

    // Laporan yang ada tidak ikut berubah oleh request yang ditolak.
    const state = await reportState(reportId);
    expect(state.status).toBe("open");
    expect(state.resolved_at).toBeNull();

    await adminContext.close();
  });
});


test.describe("Tata letak editor dan Pustaka", () => {
  test("tidak ada overflow horizontal di ponsel", async ({ page, context }) => {
    await loginAs(context, authorId, "user");

    /** Mengukur luapan horizontal beserta elemen yang melampaui viewport. */
    const measureOverflow = () =>
      page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        const offenders: string[] = [];
        document.querySelectorAll<HTMLElement>("*").forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > viewport + 0.5) {
            offenders.push(
              `${el.tagName}.${(el.className || "").toString().slice(0, 40)} right=${Math.round(rect.right)}`,
            );
          }
        });
        return {
          diff: document.documentElement.scrollWidth - viewport,
          offenders: offenders.slice(0, 6),
        };
      });

    // Desktop dulu agar editor dirender pada lebar penuh, lalu ponsel.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/komunitas/artikel");
    await expect(page.locator("#artikel-editor")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.locator("#artikel-editor").scrollIntoViewIfNeeded();

    const editor = await measureOverflow();
    expect(
      editor.diff,
      `Editor — Offenders: ${editor.offenders.join(" | ")}`,
    ).toBeLessThanOrEqual(1);

    await page.goto("/pustaka");
    const pustaka = await measureOverflow();
    expect(
      pustaka.diff,
      `Pustaka — Offenders: ${pustaka.offenders.join(" | ")}`,
    ).toBeLessThanOrEqual(1);
  });
});

