import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { sealData } from "iron-session";

/**
 * Audit responsivitas Saring.
 *
 * Setiap test mengukur tata letak yang benar-benar dirender, bukan hanya
 * memeriksa keberadaan kelas Tailwind:
 *   1. `documentElement.scrollWidth` tidak melebihi lebar viewport,
 *   2. tidak ada elemen yang kotaknya keluar dari viewport (kecuali memang
 *      dipotong oleh induk ber-`overflow: hidden`),
 *   3. navigasi admin dan pemilihan kondisi /langkah dapat dipakai tanpa geser
 *      horizontal pada 320px,
 *   4. drawer navbar opak, menutup konten di belakang, dan dapat ditutup lewat
 *      tombol, backdrop, dan Escape.
 *
 * Data uji dibuat dengan awalan unik pada database lokal lalu dihapus kembali.
 */

loadEnvConfig(process.cwd(), true);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = "kata-sandi-uji-yang-panjang-123";
const THEME_STORAGE_KEY = "saring.theme";

const SCREENSHOT_DIR = path.join(process.cwd(), "test-results", "responsive");

const suffix = randomUUID().slice(0, 8);
/** Nama tampilan panjang tanpa spasi: dulu membuat /akun melebar di 320px. */
const LONG_NAME = `PenggunaUjiResponsif${suffix}`;
const USER_EMAIL = `resp-user-${suffix}@contoh.test`;
const ADMIN_EMAIL = `resp-admin-${suffix}@contoh.test`;

const LONG_TITLE =
  `PesanPenipuanDenganJudulSangatPanjangTanpaSpasi${suffix} ` +
  "yang meniru undangan pernikahan digital dan meminta biaya administrasi";
/** Judul normal berspasi: harus membungkus pada spasi, bukan di tengah kata. */
const NORMAL_TITLE = `Pengajuan Dengan Judul Normal ${suffix} Yang Cukup Panjang`;
const LONG_URL = `https://contoh-penipuan.test/${"a".repeat(160)}`;
const LONG_THREAD_TITLE =
  `DiskusiPanjangTanpaSpasi${suffix} tentang tautan undangan pernikahan ` +
  "yang meminta pembayaran di muka";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL === "verify-full" },
});

const createdUserIds: string[] = [];
let userId = "";
let adminId = "";
let threadId = "";

async function createUser(
  email: string,
  displayName: string,
  role: "user" | "admin",
) {
  const hash = await bcrypt.hash(PASSWORD, 10);
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
  subjectId: string,
  role: "user" | "admin",
) {
  const value = await sealData(
    { userId: subjectId, role, issuedAt: Date.now(), version: 0 },
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

async function storeTheme(page: Page, value: "light" | "dark") {
  await page.goto("/");
  await page.evaluate(
    ({ key, mode }) => window.localStorage.setItem(key, mode),
    { key: THEME_STORAGE_KEY, mode: value },
  );
}

function screenshotPath(projectName: string, name: string) {
  const dir = path.join(SCREENSHOT_DIR, projectName);
  mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

/**
 * Memeriksa bahwa tidak ada elemen yang keluar dari viewport. Elemen yang
 * dipotong induk ber-`overflow: hidden` (mis. dekorasi hero) tidak dihitung
 * karena memang tidak terlihat keluar.
 */
async function measureLayout(page: Page) {
  return page.evaluate(() => {
    const viewport = window.innerWidth;

    const clippedByAncestor = (element: Element) => {
      let node = element.parentElement;
      while (node) {
        const style = getComputedStyle(node);
        const clipped =
          style.overflowX === "hidden" ||
          style.overflowX === "clip" ||
          style.overflow === "hidden" ||
          style.overflow === "clip";
        if (clipped) return true;
        node = node.parentElement;
      }
      return false;
    };

    const offenders: string[] = [];
    for (const element of Array.from(
      document.querySelectorAll<HTMLElement>("body *"),
    )) {
      if (element.closest("script, style, svg, iframe, noscript")) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const outside = rect.right - viewport > 1 || rect.left < -1;
      if (!outside) continue;
      if (clippedByAncestor(element)) continue;
      offenders.push(
        `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 48)} ` +
          `left=${Math.round(rect.left)} right=${Math.round(rect.right)}`,
      );
    }

    return {
      viewport,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      offenders: offenders.slice(0, 6),
    };
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const layout = await measureLayout(page);
  const detail = layout.offenders.length
    ? ` | elemen: ${layout.offenders.join(" ; ")}`
    : "";
  expect(
    layout.scrollWidth,
    `${label}: documentElement.scrollWidth melebihi innerWidth${detail}`,
  ).toBeLessThanOrEqual(layout.viewport + 1);
  expect(
    layout.clientWidth,
    `${label}: clientWidth melebihi viewport`,
  ).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.offenders, `${label}: elemen keluar dari viewport`).toEqual([]);
}

test.beforeAll(async () => {
  userId = await createUser(USER_EMAIL, LONG_NAME, "user");
  adminId = await createUser(ADMIN_EMAIL, `AdminResponsif${suffix}`, "admin");

  const thread = await pool.query(
    `insert into threads (author_id, title, category, body)
     values ($1, $2, 'phishing', $3) returning id`,
    [
      userId,
      LONG_THREAD_TITLE,
      `Saya menerima pesan ini: ${LONG_URL}\nMohon bantu periksa apakah aman.`,
    ],
  );
  threadId = String(thread.rows[0].id);

  const approved = await pool.query(
    `insert into submissions (author_id, title, summary, category, body, status, slug)
     values ($1, $2, $3, 'Rekayasa sosial', $4, 'approved', $5) returning id`,
    [
      userId,
      LONG_TITLE,
      `Ringkasan panjang untuk menguji pembungkusan teks ${LONG_URL}`,
      `Isi artikel lama yang sangat panjang ${LONG_URL}`,
      `artikel-uji-responsif-${suffix}`,
    ],
  );
  const approvedId = String(approved.rows[0].id);

  await pool.query(
    `insert into submission_revisions
       (submission_id, author_id, title, summary, category, body, status)
     values ($1, $2, $3, $4, 'Rekayasa sosial', $5, 'pending')`,
    [
      approvedId,
      userId,
      `${LONG_TITLE} versi revisi`,
      `Ringkasan revisi dengan tautan panjang ${LONG_URL}`,
      `Isi revisi yang jauh lebih panjang ${LONG_URL}\nBaris kedua revisi.`,
    ],
  );

  await pool.query(
    `insert into submissions (author_id, title, summary, category, body, status)
     values ($1, $2, $3, 'Rekayasa sosial', $4, 'pending')`,
    [
      userId,
      LONG_TITLE,
      `Ringkasan menunggu tinjauan ${LONG_URL}`,
      `Isi artikel menunggu tinjauan ${LONG_URL}`,
    ],
  );

  // Judul berspasi untuk memastikan pembungkusan tetap wajar (bukan per huruf).
  await pool.query(
    `insert into submissions (author_id, title, summary, category, body, status)
     values ($1, $2, $3, 'Rekayasa sosial', $4, 'pending')`,
    [
      userId,
      NORMAL_TITLE,
      `Ringkasan judul normal ${suffix}`,
      `Isi artikel dengan judul normal ${LONG_URL}`,
    ],
  );

  await pool.query(
    `insert into reports (reporter_id, target_type, target_id, reason, details, status)
     values ($1, 'thread', $2, $3, $4, 'open')`,
    [
      userId,
      threadId,
      "Dugaan penipuan dengan tautan mencurigakan",
      `Laporan dengan detail panjang ${LONG_URL}`,
    ],
  );
});

test.afterAll(async () => {
  if (createdUserIds.length > 0) {
    await pool.query(`delete from users where id = any($1::uuid[])`, [
      createdUserIds,
    ]);
  }
  await pool.end();
});

/**
 * Serial: seluruh test berkas ini memakai satu pool PostgreSQL yang dibuat di
 * `beforeAll` dan ditutup di `afterAll`. Dengan `fullyParallel` bawaan, test
 * dalam satu berkas bisa tersebar ke beberapa worker sehingga `pool.end()`
 * berpotensi berjalan saat worker lain masih memakai pool yang sama
 * ("Cannot use a pool after calling end"). Mode serial memastikan hook hanya
 * berjalan sekali dan pool tidak ditutup sebelum seluruh test selesai.
 */
test.describe.configure({ mode: "serial" });

/** Viewport yang diwajibkan pada laporan audit. */
const ALL_VIEWPORTS: [number, number][] = [
  [320, 740],
  [360, 800],
  [375, 812],
  [390, 844],
  [412, 915],
  [768, 1024],
  [1024, 768],
  [1280, 800],
];

/** Subset untuk seluruh route agar durasi tetap wajar. */
const ROUTE_VIEWPORTS: [number, number][] = [
  [320, 740],
  [390, 844],
  [768, 1024],
  [1280, 800],
];

const PUBLIC_ROUTES = [
  "/",
  "/periksa",
  "/latihan",
  "/langkah",
  "/pustaka",
  "/pustaka/nomor-baru-minta-uang",
  "/komunitas",
  "/masuk",
  "/daftar",
  "/lupa-sandi",
  "/reset-sandi",
];

const ACCOUNT_ROUTES = [
  "/akun",
  "/akun/tersimpan",
  "/komunitas/artikel",
  "/komunitas/baru",
];

const ADMIN_ROUTES = [
  "/admin",
  "/admin/artikel",
  "/admin/revisi",
  "/admin/laporan",
  "/admin/diskusi",
  "/admin/pengguna",
];

test.describe("Tidak ada overflow horizontal", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`publik ${route}`, async ({ page }) => {
      for (const [width, height] of ROUTE_VIEWPORTS) {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        await expectNoHorizontalOverflow(page, `${route} @${width}x${height}`);
      }
    });
  }

  for (const route of ACCOUNT_ROUTES) {
    test(`akun ${route}`, async ({ page, context }) => {
      await loginAs(context, userId, "user");
      for (const [width, height] of ROUTE_VIEWPORTS) {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        await expectNoHorizontalOverflow(page, `${route} @${width}x${height}`);
      }
    });
  }

  for (const route of ADMIN_ROUTES) {
    test(`admin ${route}`, async ({ page, context }) => {
      await loginAs(context, adminId, "admin");
      for (const [width, height] of ROUTE_VIEWPORTS) {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        await expectNoHorizontalOverflow(page, `${route} @${width}x${height}`);
      }
    });
  }

  test("diskusi komunitas /komunitas/[id]", async ({ page }) => {
    for (const [width, height] of ROUTE_VIEWPORTS) {
      await page.setViewportSize({ width, height });
      await page.goto(`/komunitas/${threadId}`);
      await expectNoHorizontalOverflow(page, `/komunitas/${threadId} @${width}px`);
    }
  });
});

test("halaman /akun tetap di dalam frame pada 320px", async ({
  page,
  context,
}, testInfo) => {
  await loginAs(context, userId, "user");

  for (const [width, height] of ALL_VIEWPORTS) {
    await page.setViewportSize({ width, height });
    await page.goto("/akun");
    await expectNoHorizontalOverflow(page, `/akun @${width}x${height}`);

    // Nama pengguna panjang tanpa spasi harus membungkus, bukan melebar.
    const heading = await page
      .getByRole("heading", { level: 1, name: LONG_NAME })
      .boundingBox();
    expect(heading).not.toBeNull();
    expect(
      heading!.x + heading!.width,
      `nama akun keluar frame @${width}px`,
    ).toBeLessThanOrEqual(width + 1);

    // Seluruh tombol navigasi akun berada di dalam viewport.
    for (const label of ["Buat pertanyaan", "Ajukan artikel", /^Artikel tersimpan/]) {
      const box = await page.getByRole("link", { name: label }).first().boundingBox();
      expect(box, `tombol ${String(label)} tidak ditemukan`).not.toBeNull();
      expect(box!.x, `tombol ${String(label)} keluar kiri`).toBeGreaterThanOrEqual(-1);
      expect(
        box!.x + box!.width,
        `tombol ${String(label)} keluar kanan @${width}px`,
      ).toBeLessThanOrEqual(width + 1);
    }
  }

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/akun");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "akun-320.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/akun");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "akun-390.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/akun");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "akun-1280.png"),
    fullPage: true,
  });
});

test("screenshot pembanding /komunitas pada 320px dan 390px", async ({
  page,
  context,
}, testInfo) => {
  await loginAs(context, userId, "user");
  for (const [width, height] of [
    [320, 740],
    [390, 844],
  ] as [number, number][]) {
    await page.setViewportSize({ width, height });
    await page.goto("/komunitas");
    await expectNoHorizontalOverflow(page, `/komunitas @${width}x${height}`);
    await page.screenshot({
      path: screenshotPath(testInfo.project.name, `komunitas-${width}.png`),
      fullPage: true,
    });
  }
});

/**
 * Regresi: judul di "Antrean artikel" `/admin` pernah terjepit menjadi 1–2
 * huruf per baris karena `flex-1` (flex-basis 0) + `min-width: 0` +
 * `overflow-wrap: anywhere` dipaksa berbagi baris dengan nama penulis dan
 * badge. Test ini mengukur lebar elemen judul dan jumlah karakter per baris,
 * bukan hanya `scrollWidth`.
 */
test("judul antrean admin tidak terjepit metadata pada layar sempit", async ({
  page,
  context,
}) => {
  await loginAs(context, adminId, "admin");

  const measureText = (needle: string) =>
    page.evaluate((prefix) => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>("main *"));
      const element = elements.find((candidate) =>
        Array.from(candidate.childNodes).some(
          (child) =>
            child.nodeType === Node.TEXT_NODE &&
            (child.nodeValue ?? "").trim().startsWith(prefix),
        ),
      );
      if (!element) return null;

      const text = Array.from(element.childNodes)
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => child.nodeValue ?? "")
        .join("")
        .trim();

      let container: HTMLElement | null = element.parentElement;
      while (container && parseFloat(getComputedStyle(container).paddingLeft) === 0) {
        container = container.parentElement;
      }
      const containerStyle = container ? getComputedStyle(container) : null;
      const containerWidth =
        container && containerStyle
          ? container.getBoundingClientRect().width -
            parseFloat(containerStyle.paddingLeft) -
            parseFloat(containerStyle.paddingRight)
          : element.getBoundingClientRect().width;

      const range = document.createRange();
      range.selectNodeContents(element);
      const lines = Array.from(range.getClientRects()).filter(
        (line) => line.width > 1,
      );

      return {
        width: element.getBoundingClientRect().width,
        containerWidth,
        lines: lines.length,
        charsPerLine: lines.length > 0 ? text.length / lines.length : 0,
      };
    }, needle);

  for (const width of [320, 360, 390, 412]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin");

    // Judul 120 karakter tanpa spasi.
    const unbroken = await measureText(LONG_TITLE.split(" ")[0]);
    expect(unbroken, `judul tanpa spasi tidak ditemukan @${width}px`).not.toBeNull();
    expect(
      unbroken!.width,
      `judul terjepit metadata @${width}px (${Math.round(unbroken!.width)}px dari ${Math.round(unbroken!.containerWidth)}px)`,
    ).toBeGreaterThan(unbroken!.containerWidth * 0.7);
    expect(
      unbroken!.charsPerLine,
      `judul terpecah per huruf @${width}px (${unbroken!.charsPerLine.toFixed(1)} karakter/baris)`,
    ).toBeGreaterThanOrEqual(10);

    // Judul normal berspasi: membungkus pada spasi.
    const normal = await measureText(NORMAL_TITLE);
    expect(normal, `judul normal tidak ditemukan @${width}px`).not.toBeNull();
    expect(normal!.width).toBeGreaterThan(normal!.containerWidth * 0.7);
    expect(
      normal!.charsPerLine,
      `judul normal terpotong di tengah kata @${width}px`,
    ).toBeGreaterThanOrEqual(12);

    // Nama pengguna 40 karakter tetap mendapat ruang yang wajar.
    const author = await measureText(LONG_NAME);
    expect(author, `nama pengguna tidak ditemukan @${width}px`).not.toBeNull();
    expect(
      author!.width,
      `nama pengguna terjepit @${width}px (${Math.round(author!.width)}px)`,
    ).toBeGreaterThanOrEqual(120);

    await expectNoHorizontalOverflow(page, `/admin judul @${width}px`);
  }
});

test("navigasi admin mobile memakai dropdown tanpa geser horizontal", async ({
  page,
  context,
}, testInfo) => {
  await loginAs(context, adminId, "admin");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/admin");

  const nav = page.getByRole("navigation", { name: "Navigasi admin" });
  await expect(nav).toBeVisible();

  // Tidak ada area yang perlu digeser: lebar isi <= lebar kotak navigasi.
  const metrics = await nav.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    scrollLeft: element.scrollLeft,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.scrollLeft).toBe(0);

  const select = page.getByLabel("Halaman admin");
  await expect(select).toBeVisible();
  await expect(select).toHaveValue("/admin");

  // Badge jumlah tidak hilang: tampil pada label pilihan dropdown.
  const options = await select.locator("option").allTextContents();
  expect(options).toHaveLength(6);
  expect(options.join("|")).toMatch(/Artikel \(\d+\)/);
  expect(options.join("|")).toMatch(/Laporan \(\d+\)/);

  // Memilih halaman langsung membawa ke route yang benar.
  await select.selectOption("/admin/laporan");
  await expect(page).toHaveURL(/\/admin\/laporan$/);
  await expect(page.getByLabel("Halaman admin")).toHaveValue("/admin/laporan");
  await expectNoHorizontalOverflow(page, "/admin/laporan setelah pilih dropdown");

  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "admin-320.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "admin-390.png"),
    fullPage: true,
  });

  await page.goto("/admin/artikel");
  await expectNoHorizontalOverflow(page, "/admin/artikel @390px");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "admin-artikel-390.png"),
    fullPage: true,
  });

  await page.goto("/admin/revisi");
  await expectNoHorizontalOverflow(page, "/admin/revisi @390px");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "admin-revisi-390.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/admin/revisi");
  await expectNoHorizontalOverflow(page, "/admin/revisi @320px");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "admin-revisi-320.png"),
    fullPage: true,
  });

  // Desktop tidak mengalami regresi: daftar vertikal dengan tautan asli.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/admin");
  await expect(page.getByLabel("Halaman admin")).toBeHidden();
  for (const label of [
    "Ringkasan",
    "Artikel",
    "Revisi",
    "Laporan",
    "Diskusi",
    "Pengguna",
  ]) {
    // Nama aksesibel ikut memuat badge jumlah (mis. "Artikel 1").
    await expect(
      nav.getByRole("link", { name: new RegExp(`^${label}`) }),
    ).toBeVisible();
  }
  await expectNoHorizontalOverflow(page, "/admin @1280px");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "admin-1280.png"),
    fullPage: true,
  });
});

test("pemilihan kondisi /langkah dapat dipakai tanpa geser horizontal", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/langkah");

  const select = page.getByLabel("Pilih kondisi Anda");
  await expect(select).toBeVisible();
  await expectNoHorizontalOverflow(page, "/langkah @320px");

  // Tidak ada kontainer yang menyisakan isi tersembunyi di samping.
  const scrollers = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("main *"))
      .filter((element) => element.scrollWidth - element.clientWidth > 1)
      .map((element) => `${element.tagName}.${String(element.className).slice(0, 40)}`),
  );
  expect(scrollers).toEqual([]);

  await select.selectOption("transferred-money");
  await expect(
    page.getByText(/hubungi bank\/e-wallet lewat kanal resmi/),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Buka IASC/ })).toHaveAttribute(
    "href",
    "https://iasc.ojk.go.id/",
  );
  await expect(select).toHaveValue("transferred-money");
  await expectNoHorizontalOverflow(page, "/langkah setelah pilih kondisi");

  for (const heading of [
    "Lakukan sekarang",
    "Setelah itu",
    "Bukti yang perlu disimpan",
    "Yang perlu diperiksa",
    "Sumber bantuan resmi",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "langkah-320.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/langkah?kondisi=transferred-money");
  await expectNoHorizontalOverflow(page, "/langkah @390px");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "langkah-390.png"),
    fullPage: true,
  });

  // Desktop mempertahankan daftar vertikal tombol kondisi.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/langkah");
  await expect(page.getByLabel("Pilih kondisi Anda")).toBeHidden();
  await expect(
    page.getByRole("button", { name: /sudah mentransfer uang/ }),
  ).toBeVisible();
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "langkah-1280.png"),
    fullPage: true,
  });
});

/**
 * Alpha dari nilai `getComputedStyle`. Tailwind v4 mengembalikan `oklab(...)`
 * untuk warna dengan opasitas, bukan hanya `rgba(...)`.
 */
function alphaOf(color: string) {
  if (color.startsWith("rgba(") || color.startsWith("hsla(")) {
    const part = color.split(",")[3];
    return part ? Number(part.replace(")", "").trim()) : 1;
  }
  const slash = color.match(/\/\s*([\d.]+)\s*\)/);
  return slash ? Number(slash[1]) : 1;
}

/** Apakah warna tampak gelap? Mendukung `rgb()`, `oklab()`, dan `oklch()`. */
function isDarkColor(color: string) {
  if (color.startsWith("oklab(") || color.startsWith("oklch(")) {
    const lightness = Number(color.slice(6).split(/[\s/)]/)[0]);
    return lightness < 0.45;
  }
  const numbers = (color.match(/[\d.]+/g) ?? []).map(Number);
  if (numbers.length < 3) return false;
  return numbers[0] + numbers[1] + numbers[2] < 200;
}

test("drawer navbar pekat, mengunci scroll, dan dapat ditutup", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Buka menu" });
  await expect(toggle).toBeVisible();
  await toggle.click();

  const drawer = page.getByTestId("nav-drawer");
  await expect(drawer).toBeVisible();

  // Buka ulang drawer sampai benar-benar terbuka: klik tombol lalu tunggu
  // `data-open="true"` pada overlay. `renderMenu` memasang drawer di DOM segera
  // setelah klik, tetapi `open` baru menjadi true dua frame kemudian; sebelum
  // itu listener Escape belum terpasang dan konten masih `inert`, sehingga
  // Escape/klik backdrop yang dikirim terlalu cepat akan diabaikan. Menunggu
  // `data-open` adalah kondisi terukur, bukan jeda waktu.
  const reopenDrawer = async () => {
    await page.getByRole("button", { name: "Buka menu" }).click();
    await expect(drawer).toBeVisible();
    await expect(page.locator(".nav-overlay")).toHaveAttribute("data-open", "true");
  };

  // Tunggu animasi entrance selesai secara terukur sebelum mengukur kotak:
  // tepi kanan drawer harus sudah masuk penuh ke viewport (transform tidak
  // lagi bertranslasi keluar). Tanpa menunggu, bounding box bisa terukur di
  // tengah transisi 0,3 detik dan tampak keluar layar.
  await expect
    .poll(async () => {
      const box = await drawer.boundingBox();
      return box ? box.x + box.width : Number.POSITIVE_INFINITY;
    })
    .toBeLessThanOrEqual(321);

  // Panel harus benar-benar opak: konten di belakang tidak boleh tembus.
  const panel = await drawer.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      opacity: style.opacity,
      zIndex: style.zIndex,
    };
  });
  expect(panel.opacity).toBe("1");
  expect(alphaOf(panel.backgroundColor), `panel harus opak: ${panel.backgroundColor}`).toBe(1);

  // Lebar mengikuti viewport dan tidak keluar layar; tinggi mengisi layar.
  const box = await drawer.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(321);
  expect(box!.width).toBeGreaterThanOrEqual(240);
  expect(box!.height).toBeGreaterThanOrEqual(700);

  // Backdrop menutup seluruh viewport dan warnanya berbeda dari panel.
  const backdrop = page.getByTestId("nav-backdrop");
  expect(await backdrop.boundingBox()).toEqual({ x: 0, y: 0, width: 320, height: 740 });
  const backdropColor = await backdrop.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(backdropColor).not.toBe(panel.backgroundColor);
  expect(panel.zIndex).toBe("10");

  // Tidak ada overflow horizontal selama drawer terbuka.
  await expectNoHorizontalOverflow(page, "drawer terbuka @320px");

  // Scroll halaman belakang terkunci.
  expect(
    await page.evaluate(() => getComputedStyle(document.body).overflow),
  ).toBe("hidden");

  // Menu panjang tetap dapat digulir sampai item terakhir.
  const daftar = page.getByRole("dialog").getByRole("link", { name: "Daftar" });
  await daftar.scrollIntoViewIfNeeded();
  await expect(daftar).toBeVisible();
  const scrollable = await drawer.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  expect(scrollable.scrollHeight).toBeGreaterThanOrEqual(scrollable.clientHeight);

  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "navbar-open-320.png"),
  });

  // 1. Tutup lewat tombol di dalam panel.
  await page.getByRole("button", { name: "Tutup menu navigasi" }).click();
  await expect(drawer).toHaveCount(0);
  expect(
    await page.evaluate(() => getComputedStyle(document.body).overflow),
  ).not.toBe("hidden");

  // 2. Tutup lewat Escape; fokus kembali ke tombol menu.
  await reopenDrawer();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Buka menu" })).toBeFocused();

  // 3. Tutup lewat backdrop.
  await reopenDrawer();
  await page.getByTestId("nav-backdrop").click({ position: { x: 10, y: 400 } });
  await expect(drawer).toHaveCount(0);

  // 4. Memilih tautan menutup drawer dan berpindah halaman.
  await reopenDrawer();
  await page.getByRole("dialog").getByRole("link", { name: "Pustaka" }).click();
  await expect(page).toHaveURL(/\/pustaka$/);
  await expect(page.getByTestId("nav-drawer")).toHaveCount(0);
});

test("drawer dan tema tetap benar pada dark mode", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await storeTheme(page, "dark");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Buka menu" }).click();
  const drawer = page.getByTestId("nav-drawer");
  await expect(drawer).toBeVisible();

  const panelColor = await drawer.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  // Panel harus tetap pekat dan gelap, bukan tirai transparan.
  expect(alphaOf(panelColor), `panel harus opak: ${panelColor}`).toBe(1);
  expect(isDarkColor(panelColor), `panel harus gelap: ${panelColor}`).toBe(true);

  // Tautan non-aktif memakai teks terang di atas panel gelap.
  const linkColor = await page
    .getByRole("dialog")
    .getByRole("link", { name: "Pustaka" })
    .evaluate((element) => getComputedStyle(element).color);
  expect(alphaOf(linkColor)).toBeGreaterThan(0.5);
  expect(isDarkColor(linkColor), `teks menu harus terang: ${linkColor}`).toBe(false);

  // Backdrop memakai tirai gelap semi-transparan, bukan kabut putih.
  const backdropColor = await page
    .getByTestId("nav-backdrop")
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(
    alphaOf(backdropColor),
    `tirai harus semi-transparan: ${backdropColor}`,
  ).toBeLessThan(1);
  expect(isDarkColor(backdropColor), `tirai harus gelap: ${backdropColor}`).toBe(true);

  await expectNoHorizontalOverflow(page, "drawer terbuka (dark mode)");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "navbar-open-390-dark.png"),
  });

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("nav-drawer")).toHaveCount(0);

  // Halaman akun pada dark mode juga tidak melebar.
  await page.goto("/akun");
  await expectNoHorizontalOverflow(page, "/akun (dark mode) @390px");
});

test("drawer dan dropdown dapat dijangkau dengan keyboard", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Buka menu" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("nav-drawer")).toBeVisible();

  // Fokus awal berpindah ke dalam drawer.
  await expect(
    page.getByRole("button", { name: "Tutup menu navigasi" }),
  ).toBeFocused();

  // Tab tidak pernah keluar dari drawer selama drawer terbuka.
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="nav-drawer"]');
        return panel ? panel.contains(document.activeElement) : false;
      }),
    ).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("nav-drawer")).toHaveCount(0);
  await expect(toggle).toBeFocused();

  // Dropdown admin dapat dicapai hanya dengan Tab.
  await loginAs(context, adminId, "admin");
  await page.goto("/admin");
  let reached = false;
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.id ?? "",
      ) === "admin-nav-select"
    ) {
      reached = true;
      break;
    }
  }
  expect(reached, "select navigasi admin harus dapat difokuskan dengan Tab").toBe(true);

  // Pemilihan kondisi /langkah juga dapat dicapai dengan Tab.
  await page.goto("/langkah");
  reached = false;
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.id ?? "",
      ) === "langkah-kondisi"
    ) {
      reached = true;
      break;
    }
  }
  expect(reached, "select kondisi harus dapat difokuskan dengan Tab").toBe(true);
});

test("desktop tidak mengalami regresi tata letak", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const sidebar = page.getByRole("navigation", { name: "Navigasi utama" });
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole("button", { name: "Buka menu" })).toBeHidden();
  await expectNoHorizontalOverflow(page, "/ @1280px");

  await page.goto("/komunitas");
  await expectNoHorizontalOverflow(page, "/komunitas @1280px");

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/langkah");
  await expectNoHorizontalOverflow(page, "/langkah @1024px");

  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "home-1280.png"),
  });
});