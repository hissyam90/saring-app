import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { sealData } from "iron-session";

/**
 * Pengujian end-to-end editor artikel.
 *
 * Berbeda dari pengujian komponen, berkas ini memakai **PostgreSQL sungguhan**
 * dan **server produksi** (`next build` + `next start`) yang dijalankan oleh
 * `playwright.config.ts`. Tujuannya membuktikan tiga hal yang tidak bisa
 * dibuktikan unit test:
 *
 * 1. Dokumen yang dibuat lewat toolbar benar-benar tersimpan di kolom
 *    `submissions.body_json`.
 * 2. Format tetap utuh setelah halaman dimuat ulang dan setelah artikel
 *    disetujui admin.
 * 3. Konten berbahaya tampil sebagai teks di halaman publik (tidak XSS).
 *
 * Data uji dibuat dengan awalan unik lalu dihapus kembali di `afterAll`.
 */

loadEnvConfig(process.cwd(), true);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = "kata-sandi-uji-yang-panjang-123";

const suffix = randomUUID().slice(0, 8);
const AUTHOR_EMAIL = `editor-e2e-author-${suffix}@contoh.test`;
const ADMIN_EMAIL = `editor-e2e-admin-${suffix}@contoh.test`;
const AUTHOR_NAME = `Penulis Uji ${suffix}`;

const TITLE = `Mengenali pesan kurir palsu ${suffix}`;
const SUMMARY =
  "Panduan singkat mengenali pesan kurir palsu yang meminta biaya tambahan, beserta langkah aman yang bisa langsung dilakukan pembaca.";

/**
 * Gambar uji 1×1 PNG. Dipakai untuk memenuhi permintaan ke Imgur selama E2E
 * agar hasil tes tidak bergantung pada ketersediaan atau kecepatan layanan
 * eksternal tersebut.
 */
const TEST_IMAGE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const TEST_IMAGE_DATA_URL = `data:image/png;base64,${TEST_IMAGE_PNG.toString("base64")}`;

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

async function createUser(email: string, displayName: string, role: "user" | "admin") {
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

async function loginAs(context: BrowserContext, userId: string, role: "user" | "admin") {
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
    `select id, status, slug, body, body_json
     from submissions where title = $1 order by created_at desc limit 1`,
    [title],
  );
  return result.rows[0] as
    | {
        id: string;
        status: string;
        slug: string | null;
        body: string;
        body_json: unknown;
      }
    | undefined;
}

/** Paragraf panjang agar melewati batas minimal 300 karakter di server. */
const FIRST_PARAGRAPH =
  "Pesan kurir palsu biasanya meminta biaya tambahan dengan alasan paket " +
  "tertahan di gudang. Tautan di dalam pesan mengarah ke halaman pembayaran " +
  "yang meniru situs resmi. Langkah aman: buka aplikasi kurir resmi, periksa " +
  "nomor resi di sana, dan jangan pernah membayar lewat tautan dari pesan.";

test.beforeAll(async () => {
  authorId = await createUser(AUTHOR_EMAIL, AUTHOR_NAME, "user");
  adminId = await createUser(ADMIN_EMAIL, `Admin Uji ${suffix}`, "admin");
});

test.afterAll(async () => {
  if (createdUserIds.length > 0) {
    // Menghapus hanya baris yang dibuat pengujian ini (cascade ke submissions).
    await pool.query(`delete from users where id = any($1::uuid[])`, [
      createdUserIds,
    ]);
  }
  await pool.end();
});

test.describe.configure({ mode: "serial" });

/** Membuka halaman pengajuan artikel sebagai penulis uji. */
async function openSubmissionPage(page: Page) {
  await page.goto("/komunitas/artikel");
  await expect(
    page.getByRole("heading", { name: "Ajukan artikel Pustaka" }),
  ).toBeVisible();
  await expect(page.locator("#artikel-editor")).toBeVisible();
}

async function fillArticleFields(page: Page) {
  await page.getByLabel("Judul artikel").fill(TITLE);
  await page.getByLabel("Ringkasan").fill(SUMMARY);
  await page.getByLabel("Kategori").fill("Rekayasa sosial");
}

/**
 * Panel "Pengajuan baru".
 *
 * Halaman pengajuan dapat memuat beberapa form (pengajuan baru + daftar
 * "Perbaiki:"), masing-masing dengan toolbar sendiri. Semua query media
 * di-scope ke panel pertama agar tidak ambigu.
 */
function newSubmissionForm(page: Page) {
  return page.locator("section").filter({ hasText: "Pengajuan baru" }).first();
}

test.describe("Editor artikel", () => {
  test("menampilkan editor dan toolbar yang berfungsi", async ({ page, context }) => {
    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);

    const toolbar = page.getByRole("toolbar", { name: "Format artikel" });
    await expect(toolbar).toBeVisible();

    for (const label of [
      "Tebal",
      "Miring",
      "Garis bawah",
      "Coret",
      "Judul tingkat 2",
      "Judul tingkat 3",
      "Paragraf biasa",
      "Kode sebaris",
      "Daftar butir",
      "Daftar bernomor",
      "Kutipan",
      "Garis pemisah",
      "Sisipkan atau ubah tautan",
      "Urungkan",
      "Ulangi",
    ]) {
      await expect(toolbar.getByRole("button", { name: label })).toBeVisible();
    }

    // Placeholder membantu penulis memulai. Dekorasi placeholder baru
    // dipasang setelah editor menerima fokus.
    await page.locator("#artikel-editor").click();
    await expect(
      page.locator("#artikel-editor p.is-editor-empty").first(),
    ).toHaveAttribute("data-placeholder", /Mulai dari masalah/);

    // Menulis lalu memakai toolbar: H2, tebal, miring, daftar.
    await toolbar.getByRole("button", { name: "Judul tingkat 2" }).click();
    await page.keyboard.type("Ciri pesan kurir palsu");
    await page.keyboard.press("Enter");
    await toolbar.getByRole("button", { name: "Paragraf biasa" }).click();
    await toolbar.getByRole("button", { name: "Tebal" }).click();
    await page.keyboard.type("Periksa nomor resi di aplikasi resmi.");
    await toolbar.getByRole("button", { name: "Tebal" }).click();
    await page.keyboard.type(" ");

    // Shortcut standar untuk miring.
    await page.keyboard.press("Control+i");
    await page.keyboard.type("Jangan bayar lewat tautan.");
    await page.keyboard.press("Control+i");

    await page.keyboard.press("Enter");
    await toolbar.getByRole("button", { name: "Daftar butir" }).click();
    await page.keyboard.type("Buka aplikasi kurir resmi");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Periksa nomor resi");

    const editor = page.locator("#artikel-editor");
    await expect(editor.locator("h2")).toHaveText("Ciri pesan kurir palsu");
    await expect(editor.locator("strong")).toContainText("Periksa nomor resi");
    await expect(editor.locator("em")).toContainText("Jangan bayar lewat tautan");
    await expect(editor.locator("ul li")).toHaveCount(2);
  });

  test("ketikan tepat setelah tombol toolbar tidak hilang saat frame tertunda", async ({
    page,
    context,
  }) => {
    await loginAs(context, authorId, "user");

    // Tiptap memulihkan fokus editor lewat requestAnimationFrame. Menunda rAF
    // meniru runner CI yang sibuk: tanpa perbaikan, karakter yang diketik
    // sebelum frame berikutnya jatuh ke tombol toolbar dan hilang.
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) =>
        raf(() => setTimeout(() => callback(performance.now()), 120));
    });

    await openSubmissionPage(page);
    await page.locator("#artikel-editor").click();

    const toolbar = page.getByRole("toolbar", { name: "Format artikel" });
    await toolbar.getByRole("button", { name: "Tebal" }).click();
    await page.keyboard.type("Tidak hilang");

    // Tidak ada karakter yang hilang dan format tebal tetap aktif.
    await expect(page.locator("#artikel-editor strong")).toHaveText(
      "Tidak hilang",
    );
  });

  test("menolak tautan berbahaya di dialog tautan", async ({ page, context }) => {
    const form = newSubmissionForm(page);
    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);

    await page.locator("#artikel-editor").click();
    await page.keyboard.type("Tautan uji");

    await page.getByRole("button", { name: "Sisipkan atau ubah tautan" }).click();
    const input = page.getByLabel("Alamat tautan");
    await input.fill("javascript:alert(1)");
    await form.getByRole("button", { name: "Sisipkan", exact: true }).click();

    await expect(page.locator("#editor-link-error")).toContainText(/https:\/\//i);
    await expect(page.locator("#artikel-editor a")).toHaveCount(0);
  });

  test("menolak artikel kosong dengan pesan yang jelas", async ({ page, context }) => {
    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);
    await fillArticleFields(page);

    await page.getByRole("button", { name: "Ajukan artikel" }).click();

    await expect(
      page.getByText(/Isi artikel minimal 300 karakter/i),
    ).toBeVisible();
    expect(await submissionByTitle(TITLE)).toBeUndefined();
  });


  test("menyimpan format ke PostgreSQL lalu menerbitkannya di Pustaka", async ({
    page,
    context,
    browser,
  }) => {
    const form = newSubmissionForm(page);
    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);
    await fillArticleFields(page);

    const editor = page.locator("#artikel-editor");
    const toolbar = page.getByRole("toolbar", { name: "Format artikel" });

    // Judul bagian (H2).
    await editor.click();
    await toolbar.getByRole("button", { name: "Judul tingkat 2" }).click();
    await page.keyboard.type("Langkah aman");
    await page.keyboard.press("Enter");

    // Paragraf dengan teks tebal dan miring.
    await toolbar.getByRole("button", { name: "Paragraf biasa" }).click();
    await toolbar.getByRole("button", { name: "Tebal" }).click();
    await page.keyboard.type("Jangan pernah membayar lewat tautan.");
    await toolbar.getByRole("button", { name: "Tebal" }).click();
    await page.keyboard.type(" ");

    await toolbar.getByRole("button", { name: "Miring" }).click();
    await page.keyboard.type("Periksa dulu di aplikasi resmi.");
    await page.keyboard.press("Enter");
    // Paragraf baru mewarisi mark miring (perilaku editor biasa), matikan.
    await toolbar.getByRole("button", { name: "Miring" }).click();

    // Daftar bernomor.
    await toolbar.getByRole("button", { name: "Daftar bernomor" }).click();
    await page.keyboard.type("Buka aplikasi kurir resmi");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Cocokkan nomor resi");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    // Kutipan.
    await toolbar.getByRole("button", { name: "Kutipan" }).click();
    await page.keyboard.type("Laporkan pesan ke layanan resmi.");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await toolbar.getByRole("button", { name: "Paragraf biasa" }).click();

    // Tautan: tanpa protokol, editor menambahkan https://.
    await page.getByRole("button", { name: "Sisipkan atau ubah tautan" }).click();
    await page.getByLabel("Alamat tautan").fill("ojk.go.id/edukasi");
    await form.getByRole("button", { name: "Sisipkan", exact: true }).click();

    await toolbar.getByRole("button", { name: "Garis pemisah" }).click();

    // Markup HTML di dalam teks harus tetap menjadi teks.
    await page.keyboard.type("<script>alert(1)</script>");
    await page.keyboard.press("Enter");
    await page.keyboard.type(FIRST_PARAGRAPH);

    // Pratinjau memakai renderer yang sama dengan halaman publik.
    await page.getByRole("button", { name: "Pratinjau" }).click();
    await expect(
      page.getByText("Pratinjau · tampilan sama dengan halaman Pustaka"),
    ).toBeVisible();

    const previewBlock = page.getByTestId("submission-preview").first();
    await expect(previewBlock.locator("h2")).toHaveText("Langkah aman");
    await expect(previewBlock.locator("ol li")).toHaveCount(2);
    await expect(previewBlock.locator("blockquote")).toContainText(
      "Laporkan pesan ke layanan resmi.",
    );
    await expect(previewBlock.locator("hr")).toHaveCount(1);
    await expect(previewBlock.locator("a")).toHaveAttribute(
      "href",
      "https://ojk.go.id/edukasi",
    );
    await expect(previewBlock.locator("script")).toHaveCount(0);

    await page.getByRole("button", { name: "Kembali menulis" }).click();


    // Kirim pengajuan.
    await page.getByRole("button", { name: "Ajukan artikel" }).click();
    await expect(page.getByText(/Artikel terkirim/i)).toBeVisible({
      timeout: 20_000,
    });

    // 1) Tersimpan di PostgreSQL dengan format lengkap.
    const saved = await submissionByTitle(TITLE);
    expect(saved).toBeDefined();
    expect(saved?.status).toBe("pending");

    const doc = saved!.body_json as { type: string; content: { type: string }[] };
    expect(doc.type).toBe("doc");
    const blockTypes = doc.content.map((node) => node.type);
    expect(blockTypes).toContain("heading");
    expect(blockTypes).toContain("orderedList");
    expect(blockTypes).toContain("blockquote");
    expect(blockTypes).toContain("horizontalRule");

    const serialized = JSON.stringify(doc);
    expect(serialized).toContain('"bold"');
    expect(serialized).toContain('"italic"');
    expect(serialized).toContain("https://ojk.go.id/edukasi");

    // Teks biasa diturunkan server dan tidak memuat markup HTML.
    expect(saved!.body).toContain("Langkah aman");
    expect(saved!.body).not.toContain("<h2>");
    expect(saved!.body).not.toContain("<strong>");

    // 2) Format tetap utuh setelah halaman dimuat ulang (editor penulis).
    await page.reload();
    const reloaded = page.locator(`#artikel-editor-${saved!.id}`);
    await expect(reloaded.locator("h2")).toHaveText("Langkah aman");
    await expect(reloaded.locator("ol li")).toHaveCount(2);
    await expect(reloaded.locator("blockquote")).toContainText(
      "Laporkan pesan ke layanan resmi.",
    );

    // 3) Admin menyetujui artikel lewat endpoint moderasi.
    const adminContext = await browser.newContext();
    await loginAs(adminContext, adminId, "admin");
    const approve = await adminContext.request.post("/api/admin/moderate", {
      data: { action: "approve-submission", submissionId: saved!.id },
    });
    expect(approve.status()).toBe(200);
    await adminContext.close();

    const approved = await submissionByTitle(TITLE);
    expect(approved?.status).toBe("approved");
    expect(approved?.slug).toBeTruthy();

    // 4) Artikel terbit di Pustaka dengan format yang benar.
    await page.goto(`/pustaka/${approved!.slug}`);
    const article = page.locator("article").first();
    await expect(article.locator("h1")).toContainText("Mengenali pesan kurir palsu");
    await expect(article.locator("h2")).toContainText("Langkah aman");
    await expect(article.locator("strong").first()).toContainText(
      "Jangan pernah membayar lewat tautan.",
    );
    await expect(article.locator("em").first()).toContainText(
      "Periksa dulu di aplikasi resmi.",
    );
    await expect(article.locator("ol li")).toHaveCount(2);
    await expect(article.locator("blockquote")).toContainText(
      "Laporkan pesan ke layanan resmi.",
    );
    await expect(article.locator("hr")).toHaveCount(1);
    await expect(article.locator("a[href='https://ojk.go.id/edukasi']")).toHaveText(
      "https://ojk.go.id/edukasi",
    );

    // Tidak ada XSS dan tidak ada tag mentah yang bocor sebagai markup.
    await expect(article.locator("script")).toHaveCount(0);
    await expect(article).not.toContainText("<h2>");
    await expect(
      article.getByText("<script>alert(1)</script>", { exact: true }),
    ).toBeVisible();
  });

  test("artikel lama (plain text) tetap bisa diedit tanpa kehilangan isi", async ({
    page,
    context,
  }) => {
    const legacyTitle = `Artikel lama tanpa format ${suffix}`;
    const legacyBody = [
      "Paragraf pertama artikel lama yang ditulis sebelum editor tersedia.",
      "Paragraf kedua berisi langkah lanjutan yang perlu dipertahankan.",
    ].join("\n\n");

    // Mensimulasikan baris pra-migration: body_json NULL, hanya teks biasa.
    const inserted = await pool.query(
      `insert into submissions (author_id, title, summary, category, body, body_json, refs)
       values ($1, $2, $3, $4, $5, null, null) returning id`,
      [
        authorId,
        legacyTitle,
        "Ringkasan artikel lama yang cukup panjang untuk lolos aturan minimal.",
        "Arsip",
        legacyBody,
      ],
    );

    await loginAs(context, authorId, "user");
    await page.goto("/komunitas/artikel");

    const legacyId = String(inserted.rows[0].id);
    const legacyEditor = page.locator(`#artikel-editor-${legacyId}`);
    await expect(legacyEditor).toBeVisible();

    // Isi lama dimuat ke editor sebagai paragraf, bukan dibuang.
    await expect(legacyEditor.locator("p").first()).toContainText(
      "Paragraf pertama artikel lama",
    );
    await expect(legacyEditor.locator("p")).toHaveCount(2);
    await expect(
      page.getByText(/Isi lamanya sudah dimuat ke editor/i),
    ).toBeVisible();

    // Bersihkan baris uji agar tidak meninggalkan form "Perbaiki:" pada
    // pengujian berikutnya di berkas ini.
    await pool.query("delete from submissions where id = $1", [legacyId]);
  });


  test("tidak ada overflow horizontal di halaman editor (mobile)", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile viewport only");

    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // Toolbar tetap bisa dipakai di layar sempit. Toolbar dibatasi ke editor
    // pertama karena halaman dapat memuat lebih dari satu form.
    const toolbar = page.getByRole("toolbar", { name: "Format artikel" }).first();
    await toolbar.getByRole("button", { name: "Tebal" }).click();
    await expect(toolbar.getByRole("button", { name: "Tebal" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("area editor tetap luas meskipun kosong (desktop)", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop viewport only");

    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);

    const metrics = await page.evaluate(() => {
      const editor = document.querySelector("#artikel-editor") as HTMLElement | null;
      const shell = document.querySelector(".saring-editor-shell") as HTMLElement | null;
      const style = editor ? getComputedStyle(editor) : null;
      return {
        editor: editor?.getBoundingClientRect().height ?? 0,
        shell: shell?.getBoundingClientRect().height ?? 0,
        maxHeight: style?.maxHeight ?? null,
        overflowY: style?.overflowY ?? null,
        hasPlaceholder: Boolean(
          document.querySelector("#artikel-editor p.is-editor-empty"),
        ),
      };
    });

    // Area tulis harus benar-benar luas, bukan setinggi satu baris input.
    expect(metrics.editor).toBeGreaterThanOrEqual(360);
    expect(metrics.shell).toBeGreaterThanOrEqual(360);
    // Tidak ada kotak bergulir sendiri: editor tumbuh mengikuti tulisan.
    expect(metrics.maxHeight === "none" || metrics.maxHeight === "").toBe(true);
    expect(metrics.overflowY).toBe("visible");
    expect(metrics.hasPlaceholder).toBe(true);

    // Menulis di area kosong langsung masuk ke dokumen.
    await page.locator("#artikel-editor").click();
    await page.keyboard.type("Teks pertama di area kosong.");
    await expect(page.locator("#artikel-editor")).toContainText(
      "Teks pertama di area kosong.",
    );

    // Tinggi bertambah secara natural saat tulisan memanjang.
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press("Enter");
      await page.keyboard.type(`Baris tambahan ${i}.`);
    }
    const grown = await page.evaluate(
      () =>
        document.querySelector("#artikel-editor")?.getBoundingClientRect()
          .height ?? 0,
    );
    expect(grown).toBeGreaterThan(metrics.editor);
  });

  test("area editor nyaman pada viewport mobile", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile viewport only");

    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);

    const metrics = await page.evaluate(() => {
      const editor = document.querySelector("#artikel-editor") as HTMLElement | null;
      return {
        height: editor?.getBoundingClientRect().height ?? 0,
        width: editor?.getBoundingClientRect().width ?? 0,
        viewport: window.innerWidth,
      };
    });

    expect(metrics.height).toBeGreaterThanOrEqual(280);
    expect(metrics.width).toBeLessThanOrEqual(metrics.viewport);
  });

  test("menyisipkan gambar langsung dan menampilkannya di editor", async ({
    page,
    context,
  }) => {
    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);
    const form = newSubmissionForm(page);

    await page.locator("#artikel-editor").click();
    await page.keyboard.type(FIRST_PARAGRAPH);

    await form.getByRole("button", { name: "Sisipkan gambar atau media" }).click();
    await form.getByLabel("URL atau kode media").fill("https://i.imgur.com/L0pP68gl.jpg");
    await form.getByLabel("Teks alternatif media").fill("Contoh gambar uji");
    await form.getByRole("button", { name: "Sisipkan", exact: true }).click();

    const img = page.locator("#artikel-editor img").first();
    await expect(img).toHaveAttribute("src", "https://i.imgur.com/L0pP68gl.jpg");
    await expect(img).toHaveAttribute("alt", "Contoh gambar uji");

    // Berkas benar-benar termuat di browser, bukan hanya atribut tersimpan.
    await expect
      .poll(async () => await img.evaluate((el: HTMLImageElement) => el.naturalWidth), {
        timeout: 20_000,
      })
      .toBeGreaterThan(0);
  });

  test("menolak URL gambar berbahaya di dialog", async ({ page, context }) => {
    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);
    const form = newSubmissionForm(page);

    await form.getByRole("button", { name: "Sisipkan gambar atau media" }).click();
    await form.getByLabel("URL atau kode media").fill("javascript:alert(1)");

    // Dialog menonaktifkan tombol sisip selama tidak ada media valid, sehingga
    // URL berbahaya tidak pernah masuk ke dokumen.
    await expect(
      form.getByRole("button", { name: "Sisipkan", exact: true }),
    ).toBeDisabled();
    await expect(page.locator("#artikel-editor img")).toHaveCount(0);
  });

  test("menyematkan album Imgur dan benar-benar memuatnya", async ({
    page,
    context,
  }) => {
    // Respons uji lokal untuk Imgur, agar hasil tes tidak bergantung pada
    // ketersediaan atau kecepatan layanan eksternal (lihat catatan di tes
    // "media tampil di Pustaka setelah artikel disetujui").
    await context.route(/^https?:\/\/imgur\.com\//, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: `<!doctype html><html><head><meta charset="utf-8"><title>Album uji</title></head><body><h1>Album uji Imgur</h1><img alt="gambar album uji" src="${TEST_IMAGE_DATA_URL}" width="4" height="4"></body></html>`,
      }),
    );

    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);
    const form = newSubmissionForm(page);

    await page.locator("#artikel-editor").click();
    await page.keyboard.type(FIRST_PARAGRAPH);

    await form.getByRole("button", { name: "Sisipkan gambar atau media" }).click();
    await form
      .getByLabel("URL atau kode media")
      .fill("https://imgur.com/a/l4mKcOj");
    await form.getByRole("button", { name: "Sisipkan", exact: true }).click();

    const embed = page.locator("#artikel-editor .saring-embed");
    await expect(embed).toHaveCount(1);

    await expect(embed.locator("iframe")).toHaveAttribute(
      "src",
      "https://imgur.com/a/l4mKcOj/embed?pub=true",
    );

    // Embed adalah blok tersendiri, bukan teks hyperlink biasa.
    await expect(page.locator("#artikel-editor")).not.toContainText(
      "imgur.com/a/l4mKcOj",
    );

    // Iframe benar-benar memuat dokumen embed yang berisi gambar.
    const frame = page.frames().find((f) => f.url().includes("imgur.com/a/l4mKcOj"));
    expect(frame, "iframe embed tidak memuat dokumen").toBeDefined();
    await expect
      .poll(() => frame!.evaluate(() => document.querySelectorAll("img").length))
      .toBeGreaterThan(0);
  });

  test("menolak kode embed dengan data-id tidak valid", async ({
    page,
    context,
  }) => {
    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);
    const form = newSubmissionForm(page);

    await form.getByRole("button", { name: "Sisipkan gambar atau media" }).click();
    await form
      .getByLabel("URL atau kode media")
      .fill('<blockquote class="imgur-embed-pub" data-id="../../evil"></blockquote>');

    // `data-id` tidak valid tidak menghasilkan media apa pun: tombol sisip
    // tetap nonaktif dan tidak ada embed yang dibuat.
    await expect(
      form.getByRole("button", { name: "Sisipkan", exact: true }),
    ).toBeDisabled();
    await expect(page.locator("#artikel-editor .saring-embed")).toHaveCount(0);
  });

  test("menawarkan pilihan saat URL gambar ditempel", async ({
    page,
    context,
  }) => {
    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);
    const form = newSubmissionForm(page);

    // Tempel lewat clipboard sungguhan agar event `paste` benar-benar terkirim
    // dengan `clipboardData` (`insertText` tidak memicu handler paste).
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, "https://i.imgur.com/L0pP68gl.jpg");

    await page.locator("#artikel-editor").click();
    await page.keyboard.press("Control+V");

    // Tidak langsung menjadi teks biasa: muncul tawaran media.
    await expect(page.getByText(/URL gambar terdeteksi/i)).toBeVisible();
    await form.getByRole("button", { name: "Jadikan gambar" }).click();

    await expect(page.locator("#artikel-editor img").first()).toHaveAttribute(
      "src",
      "https://i.imgur.com/L0pP68gl.jpg",
    );
  });

  test("menyimpan media ke body_json lalu menampilkannya di Pustaka", async ({
    page,
    context,
  }, testInfo) => {
    const mediaTitle = `Artikel dengan media ${suffix} ${testInfo.project.name}`;

    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);
    const form = newSubmissionForm(page);

    await page.getByLabel("Judul artikel").fill(mediaTitle);
    await page.getByLabel("Ringkasan").fill(SUMMARY);
    await page.getByLabel("Kategori").fill("Rekayasa sosial");

    await page.locator("#artikel-editor").click();
    // Paragraf harus melewati batas minimal 300 karakter walau media tidak
    // dihitung sebagai teks isi.
    await page.keyboard.type(
      `${FIRST_PARAGRAPH} Tambahan penjelasan agar panjang isi melewati batas minimal yang diperiksa server.`,
    );

    // Gambar langsung.
    await form.getByRole("button", { name: "Sisipkan gambar atau media" }).click();
    await form.getByLabel("URL atau kode media").fill("https://i.imgur.com/L0pP68gl.jpg");
    await form.getByLabel("Teks alternatif media").fill("Tangkapan layar");
    await form.getByRole("button", { name: "Sisipkan", exact: true }).click();

    // Node gambar yang baru disisipkan masih terpilih. Pindahkan kursor ke
    // setelah node (ArrowRight) lalu buat paragraf baru, agar dialog berikutnya
    // menyisipkan embed baru alih-alih mengganti gambar.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    // Embed album Imgur.
    await form.getByRole("button", { name: "Sisipkan gambar atau media" }).click();
    await form
      .getByLabel("URL atau kode media")
      .fill("https://imgur.com/a/l4mKcOj");
    await form.getByRole("button", { name: "Sisipkan", exact: true }).click();

    // Pratinjau memakai renderer yang sama dengan halaman publik.
    await form.getByRole("button", { name: "Pratinjau" }).click();
    const previewBlock = form.getByTestId("submission-preview");
    await expect(previewBlock.locator("img")).toHaveAttribute(
      "src",
      "https://i.imgur.com/L0pP68gl.jpg",
    );
    await expect(previewBlock.locator("iframe")).toHaveAttribute(
      "src",
      "https://imgur.com/a/l4mKcOj/embed?pub=true",
    );
    await page.getByRole("button", { name: "Kembali menulis" }).click();

    await page.getByRole("button", { name: "Ajukan artikel" }).click();
    await expect(page.getByText(/Artikel terkirim/i)).toBeVisible({
      timeout: 20_000,
    });

    // 1) Media tersimpan di body_json PostgreSQL.
    const saved = await submissionByTitle(mediaTitle);
    expect(saved).toBeDefined();
    const doc = saved!.body_json as {
      content: { type: string; attrs?: Record<string, unknown> }[];
    };
    const types = doc.content.map((node) => node.type);
    expect(types).toContain("image");
    expect(types).toContain("mediaEmbed");

    const imageNode = doc.content.find((node) => node.type === "image");
    expect(imageNode?.attrs).toEqual({
      src: "https://i.imgur.com/L0pP68gl.jpg",
      alt: "Tangkapan layar",
    });

    const embedNode = doc.content.find((node) => node.type === "mediaEmbed");
    expect(embedNode?.attrs).toEqual({ provider: "imgur", id: "l4mKcOj" });

    // Tidak ada HTML/script yang ikut tersimpan.
    const serialized = JSON.stringify(doc);
    expect(serialized).not.toContain("embed.js");
    expect(serialized).not.toContain("<blockquote");

    // 2) Setelah dimuat ulang, media tetap ada di posisi yang sama.
    await page.reload();
    const reloaded = page.locator(`#artikel-editor-${saved!.id}`);
    await expect(reloaded.locator("img")).toHaveAttribute(
      "src",
      "https://i.imgur.com/L0pP68gl.jpg",
    );
    await expect(reloaded.locator(".saring-embed iframe")).toHaveAttribute(
      "src",
      "https://imgur.com/a/l4mKcOj/embed?pub=true",
    );
  });

  test("embed yang gagal dimuat menampilkan fallback tautan aman", async ({
    page,
    context,
  }) => {
    // Blokir seluruh permintaan ke Imgur agar iframe tidak pernah selesai dimuat.
    await context.route("**://imgur.com/**", (route) => route.abort());

    await loginAs(context, authorId, "user");
    await openSubmissionPage(page);
    const form = newSubmissionForm(page);

    await page.locator("#artikel-editor").click();
    await page.keyboard.type(FIRST_PARAGRAPH);

    await form.getByRole("button", { name: "Sisipkan gambar atau media" }).click();
    await form
      .getByLabel("URL atau kode media")
      .fill("https://imgur.com/a/ALc9tWx");
    await form.getByRole("button", { name: "Sisipkan", exact: true }).click();

    const embed = page.locator("#artikel-editor .saring-embed");
    await expect(embed).toHaveCount(1);

    // Tautan fallback yang aman selalu terlihat, sehingga pembaca tidak pernah
    // terjebak pada kotak embed kosong.
    const fallback = embed.getByRole("link", {
      name: /Jika embed tidak tampil, buka album di Imgur/i,
    });
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveAttribute("href", "https://imgur.com/a/ALc9tWx");
    await expect(fallback).toHaveAttribute("rel", /noopener/);
    await expect(fallback).toHaveAttribute("rel", /noreferrer/);
  });

  test("media tampil di Pustaka setelah artikel disetujui", async ({
    page,
    context,
    browser,
  }, testInfo) => {
    // Artikel dari tes sebelumnya masih berstatus pending.
    const mediaTitle = `Artikel dengan media ${suffix} ${testInfo.project.name}`;
    const saved = await submissionByTitle(mediaTitle);
    expect(saved).toBeDefined();

    const adminContext = await browser.newContext();
    await loginAs(adminContext, adminId, "admin");
    const approve = await adminContext.request.post("/api/admin/moderate", {
      data: { action: "approve-submission", submissionId: saved!.id },
    });
    expect(approve.status()).toBe(200);
    await adminContext.close();

    const approved = await submissionByTitle(mediaTitle);
    expect(approved?.status).toBe("approved");
    expect(approved?.slug).toBeTruthy();

    await loginAs(context, authorId, "user");

    /*
     * Imgur tidak boleh menentukan hasil tes.
     *
     * `MediaEmbed` memakai batas waktu 9 detik: bila iframe belum memicu `load`
     * (album lambat, diblokir, atau `loading="lazy"` belum terpicu di viewport
     * ponsel), komponen mengganti iframe dengan fallback sehingga
     * `article.locator("iframe")` tidak menemukan apa pun. Permintaan ke Imgur
     * karena itu dipenuhi dari respons uji lokal: jalur embed berhasil menjadi
     * deterministik, sementara jalur gagal tetap diuji terpisah oleh tes
     * "embed yang gagal dimuat menampilkan fallback tautan aman".
     */
    const embedRequests: { url: string; referer: string | null }[] = [];
    await context.route(/^https?:\/\/imgur\.com\//, async (route) => {
      embedRequests.push({
        url: route.request().url(),
        referer: route.request().headers()["referer"] ?? null,
      });
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: [
          "<!doctype html><html><head><meta charset=\"utf-8\">",
          "<title>Album uji</title></head>",
          "<body><h1>Album uji Imgur</h1>",
          "<img alt=\"gambar album uji\" src=\"",
          TEST_IMAGE_DATA_URL,
          "\" width=\"4\" height=\"4\"></body></html>",
        ].join(""),
      });
    });

    const imageRequests: { url: string; referer: string | null }[] = [];
    await context.route(/^https?:\/\/i\.imgur\.com\//, async (route) => {
      imageRequests.push({
        url: route.request().url(),
        referer: route.request().headers()["referer"] ?? null,
      });
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: TEST_IMAGE_PNG,
      });
    });

    await page.goto(`/pustaka/${approved!.slug}`);

    const article = page.locator("article").first();

    // Gambar artikel: URL tetap persis, dan benar-benar termuat.
    const image = article.locator("img").first();
    await expect(image).toHaveAttribute("src", "https://i.imgur.com/L0pP68gl.jpg");
    await expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect
      .poll(async () => await image.evaluate((el: HTMLImageElement) => el.naturalWidth), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);

    // Embed: iframe bertahan (tidak diganti fallback) dan atributnya benar.
    const iframe = article.locator("iframe");
    await expect(iframe).toHaveAttribute(
      "src",
      "https://imgur.com/a/l4mKcOj/embed?pub=true",
    );
    await expect(iframe).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect(iframe).toHaveAttribute(
      "sandbox",
      /allow-scripts/,
    );

    // Iframe benar-benar memuat dokumen embed (bukan hanya ada di DOM).
    const frame = page.frames().find((f) => f.url().includes("imgur.com/a/l4mKcOj"));
    expect(frame, "iframe embed tidak memuat dokumen").toBeDefined();
    await expect
      .poll(() => frame!.evaluate(() => document.querySelectorAll("img").length))
      .toBeGreaterThan(0);

    // `referrerPolicy="no-referrer"` benar-benar diterapkan: permintaan ke Imgur
    // tidak membawa header Referer. Ini menutup risiko hotlink ditolak (403).
    expect(embedRequests.length).toBeGreaterThan(0);
    expect(imageRequests.length).toBeGreaterThan(0);
    for (const request of [...embedRequests, ...imageRequests]) {
      expect(request.referer, `Referer terkirim ke ${request.url}`).toBeNull();
    }

    // Tautan fallback yang aman selalu tersedia.
    const fallback = article.getByRole("link", { name: /Buka di Imgur/i });
    await expect(fallback).toHaveAttribute("href", "https://imgur.com/a/l4mKcOj");
    await expect(fallback).toHaveAttribute("rel", /noopener/);

    // Tidak ada markup mentah yang bocor ke pembaca.
    await expect(article).not.toContainText("<blockquote");
    await expect(article).not.toContainText("embed.js");
  });




});

