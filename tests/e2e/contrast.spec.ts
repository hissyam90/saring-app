import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { sealData } from "iron-session";

/**
 * Verifikasi kontras & keterbacaan (WCAG 2.2 AA) dari warna yang **benar-benar
 * dirender** di browser, pada light dan dark mode.
 *
 * Metode:
 *  - untuk setiap elemen dengan simpul teks langsung, ambil `color` hasil
 *    komputasi dan latar efektif (menelusuri leluhur, melebur alpha);
 *  - ambang 4.5:1 untuk teks normal, 3:1 untuk teks besar (>=24px atau
 *    >=18.66px bold) sesuai WCAG 1.4.3;
 *  - batas kontrol dianggap jelas bila isian latarnya berbeda >=3:1 dari latar
 *    sekitar; jika tidak, warna border harus >=3:1 (WCAG 1.4.11);
 *  - placeholder diperiksa >=4.5:1.
 *
 * Cakupan = daftar `PAGES` + blok "permukaan interaktif". Ini bukan klaim bahwa
 * seluruh situs memenuhi WCAG; lihat laporan untuk komponen yang diperiksa.
 */

loadEnvConfig(process.cwd(), true);

/**
 * Penanda waktu yang direkam di dalam peramban untuk menguji kilatan tema.
 * Dideklarasikan agar TypeScript mengenali properti tambahan pada `window`.
 */
declare global {
  interface Window {
    __themeMarks: { themeAt: number | null; firstPaint: number | null };
  }
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL === "verify-full" },
});

const PAGES = [
  "/",
  "/periksa",
  "/latihan",
  "/langkah",
  "/pustaka",
  "/pustaka/nomor-baru-minta-uang",
  "/komunitas",
  "/komunitas/artikel",
  "/komunitas/baru",
  "/akun",
  "/akun/tersimpan",
  "/admin",
  "/admin/artikel",
  "/admin/revisi",
  "/admin/laporan",
  "/admin/diskusi",
  "/admin/pengguna",
  "/masuk",
  "/daftar",
];

/**
 * Halaman yang diuji untuk pilihan tema **manual**.
 *
 * Pilihan manual dan "Ikuti sistem" memakai palet token yang sama (kesamaan itu
 * diperiksa `npm run audit:contrast`), sehingga yang perlu dibuktikan di sini
 * hanya bahwa jalur override benar-benar menghasilkan warna yang sama pada
 * halaman yang mewakili setiap jenis permukaan: beranda, artikel, komunitas,
 * form autentikasi, dan admin.
 */
const MANUAL_PAGES = [
  "/",
  "/pustaka/nomor-baru-minta-uang",
  "/komunitas",
  "/masuk",
  "/admin",
];

/** Kunci localStorage preferensi tema. Harus sama dengan `lib/theme.ts`. */
const THEME_STORAGE_KEY = "saring.theme";

type ThemeMode = {
  id: string;
  /** Preferensi sistem yang ditiru peramban. */
  scheme: "light" | "dark";
  /** Nilai yang disimpan di localStorage sebelum halaman dibuka. */
  stored: "system" | "light" | "dark";
  pages: string[];
  /** Warna latar `body` yang harus benar-benar dirender. */
  expectBodyBg: string;
};

const THEME_MODES: ThemeMode[] = [
  {
    id: "system-terang",
    scheme: "light",
    stored: "system",
    pages: PAGES,
    expectBodyBg: "rgb(245, 242, 234)",
  },
  {
    id: "system-gelap",
    scheme: "dark",
    stored: "system",
    pages: PAGES,
    expectBodyBg: "rgb(13, 19, 29)",
  },
  {
    id: "manual-gelap",
    scheme: "light",
    stored: "dark",
    pages: MANUAL_PAGES,
    expectBodyBg: "rgb(13, 19, 29)",
  },
  {
    id: "manual-terang",
    scheme: "dark",
    stored: "light",
    pages: MANUAL_PAGES,
    expectBodyBg: "rgb(245, 242, 234)",
  },
];

/**
 * Menyiapkan preferensi tema di peramban.
 *
 * `localStorage` hanya bisa ditulis setelah origin dimuat, jadi halaman
 * dibuka sekali dulu. Setelah itu setiap navigasi berikutnya harus memakai
 * tema pilihan tanpa kilatan (diuji terpisah).
 */
async function primeTheme(page: Page, mode: ThemeMode) {
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: THEME_STORAGE_KEY, value: mode.stored },
  );
}


interface AuditResult {
  text: string[];
  controls: string[];
}

async function auditPage(page: Page): Promise<AuditResult> {
  return (await page.evaluate(() => {
    type Rgb = { r: number; g: number; b: number; a: number };

    /**
     * Mengurai warna hasil komputasi. Tailwind v4 mengeluarkan warna dengan
     * opacity sebagai `oklab(L a b / alpha)` atau `color(srgb ...)`, bukan
     * selalu `rgb()`. Tanpa konversi ini, elemen beropacity akan terlewat dari
     * audit (false negative).
     */
    const oklabToRgb = (L: number, a: number, b: number): Rgb => {
      const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = L - 0.0894841775 * a - 1.291485548 * b;
      const l = l_ ** 3;
      const m = m_ ** 3;
      const s = s_ ** 3;
      const lin = [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
      ];
      const [r, g, bb] = lin.map((v) => {
        const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
        return Math.min(255, Math.max(0, Math.round(c * 255)));
      });
      return { r, g, b: bb, a: 1 };
    };

    const parse = (v: string): Rgb | null => {
      if (!v) return null;
      const oklab = v.match(/oklab\(([^)]+)\)/);
      if (oklab) {
        const parts = oklab[1].split("/");
        const nums = parts[0].trim().split(/\s+/).map(Number);
        const alpha = parts[1] ? parseFloat(parts[1]) : 1;
        return { ...oklabToRgb(nums[0], nums[1], nums[2]), a: alpha };
      }
      const srgb = v.match(/color\(srgb\s+([^)]+)\)/);
      if (srgb) {
        const parts = srgb[1].split("/");
        const nums = parts[0].trim().split(/\s+/).map(Number);
        const alpha = parts[1] ? parseFloat(parts[1]) : 1;
        return {
          r: Math.round(nums[0] * 255),
          g: Math.round(nums[1] * 255),
          b: Math.round(nums[2] * 255),
          a: alpha,
        };
      }
      const m = v.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(",").map((x: string) => parseFloat(x.trim()));
      return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
    };
    const blend = (f: Rgb, b: Rgb): Rgb => ({
      r: f.r * f.a + b.r * (1 - f.a),
      g: f.g * f.a + b.g * (1 - f.a),
      b: f.b * f.a + b.b * (1 - f.a),
      a: 1,
    });
    const lum = (c: Rgb): number => {
      const ch = [c.r, c.g, c.b].map((v: number) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    const ratio = (a: Rgb, b: Rgb): number => {
      const la = lum(a);
      const lb = lum(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    const bgOf = (el: Element): Rgb => {
      let node: Element | null = el;
      let bg: Rgb | null = null;
      while (node) {
        const p = parse(getComputedStyle(node).backgroundColor);
        if (p && p.a > 0.001) {
          bg = bg ? blend(bg, p) : p;
          if (bg.a >= 0.999) return bg;
        }
        node = node.parentElement;
      }
      return bg ?? { r: 255, g: 255, b: 255, a: 1 };
    };
    const rgb = (c: Rgb): string =>
      `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;

    const text: string[] = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("script, style, svg, iframe, noscript")) continue;
      const own = [...el.childNodes].some(
        (n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 1,
      );
      if (!own) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || parseFloat(st.opacity) < 0.5) continue;
      const fg = parse(st.color);
      if (!fg) continue;
      const bg = bgOf(el);
      const f2 = fg.a < 1 ? blend(fg, bg) : fg;
      const size = parseFloat(st.fontSize);
      const bold = Number(st.fontWeight) >= 700;
      const min = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      const value = ratio(f2, bg);
      if (value + 0.005 < min) {
        text.push(
          `${value.toFixed(2)}<${min} | ${Math.round(size)}px | ${st.color} on ${rgb(bg)} | "${(el.textContent ?? "").trim().slice(0, 32)}"`,
        );
      }
    }

    const controls: string[] = [];
    const parentBgOf = (el: Element): Rgb => {
      let node: Element | null = el.parentElement;
      while (node) {
        const p = parse(getComputedStyle(node).backgroundColor);
        if (p && p.a > 0.9) return p;
        node = node.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };

    for (const el of document.querySelectorAll(
      "input, select, textarea, button, a",
    )) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || parseFloat(st.opacity) < 0.5) continue;

      const bg: Rgb = parse(st.backgroundColor) ?? { r: 0, g: 0, b: 0, a: 0 };
      const parentBg = parentBgOf(el);
      const filled = bg.a > 0.9;
      const distinguishableByFill = filled && ratio(bg, parentBg) >= 3;

      const border = parse(st.borderTopColor);
      const width = parseFloat(st.borderTopWidth);
      if (!distinguishableByFill && border && width >= 1 && border.a > 0.5) {
        const v = ratio(border, parentBg);
        if (v < 3) {
          controls.push(
            `border ${v.toFixed(2)}<3 | ${el.tagName} | ${st.borderTopColor} on ${rgb(parentBg)}`,
          );
        }
      }

      const placeholder = getComputedStyle(el, "::placeholder").color;
      if (placeholder && placeholder !== st.color) {
        const p = parse(placeholder);
        if (p) {
          const base = filled ? bg : parentBg;
          const v = ratio(p, base);
          if (v < 4.5) {
            controls.push(
              `placeholder ${v.toFixed(2)}<4.5 | ${el.tagName} | ${placeholder} on ${rgb(base)}`,
            );
          }
        }
      }
    }

    return { text, controls: Array.from(new Set(controls)) };
  })) as AuditResult;
}

function expectReadable(result: AuditResult, label: string) {
  expect(
    result.text,
    `Teks berkontras rendah pada ${label}:\n${result.text.join("\n")}`,
  ).toEqual([]);
  expect(
    result.controls,
    `Batas kontrol/placeholder berkontras rendah pada ${label}:\n${result.controls.join("\n")}`,
  ).toEqual([]);
}

const userIds: string[] = [];
let adminId = "";
let readerId = "";

test.beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const hash = await bcrypt.hash("kata-sandi-uji-yang-panjang-123", 12);

  const insert = async (email: string, name: string, role: "admin" | "user") => {
    const r = await pool.query(
      `insert into users (email, display_name, password_hash, role)
       values (lower($1), $2, $3, $4) returning id`,
      [email, name, hash, role],
    );
    const id = String(r.rows[0].id);
    userIds.push(id);
    return id;
  };

  adminId = await insert(`v17-admin-${suffix}@contoh.test`, `Admin v17 ${suffix}`, "admin");
  readerId = await insert(`v17-user-${suffix}@contoh.test`, `Pembaca v17 ${suffix}`, "user");

  await pool.query(
    `insert into notifications (user_id, kind, title, body, href, dedupe_key)
     values ($1, 'thread_reply', 'Balasan baru untuk pertanyaan Anda',
             'Pertanyaan uji kontras', '/komunitas', $2)`,
    [adminId, `v17-${suffix}`],
  );
});

test.afterAll(async () => {
  if (userIds.length > 0) {
    await pool.query(`delete from users where id = any($1::uuid[])`, [userIds]);
  }
  // Pool sengaja tidak ditutup: Playwright dapat menjalankan beberapa berkas
  // test pada worker yang sama, dan menutup pool lebih awal membuat query
  // berikutnya gagal ("Cannot use a pool after calling end").
});

async function loginAs(
  context: BrowserContext,
  userId: string,
  role: "user" | "admin",
) {
  const value = await sealData(
    { userId, role, issuedAt: Date.now() },
    { password: process.env.SESSION_SECRET as string, ttl: 3600 },
  );
  await context.addCookies([
    { name: "saring_session", value, url: BASE_URL, httpOnly: true, sameSite: "Lax" },
  ]);
}


test.describe("Kontras halaman", () => {
  for (const mode of THEME_MODES) {
    test(`semua halaman lolos ambang kontras (${mode.id})`, async ({
      page,
      context,
    }) => {
      await loginAs(context, adminId, "admin");
      await page.emulateMedia({ colorScheme: mode.scheme });
      await primeTheme(page, mode);

      const failures: string[] = [];
      for (const path of mode.pages) {
        await page.goto(path);
        await page.waitForTimeout(250);

        // Pastikan tema yang dipilih benar-benar yang dirender, bukan hanya
        // tersimpan sebagai preferensi.
        const bg = await page.evaluate(
          () => getComputedStyle(document.body).backgroundColor,
        );
        if (bg !== mode.expectBodyBg) {
          failures.push(`${path} TEMA: latar ${bg} != ${mode.expectBodyBg}`);
        }

        const result = await auditPage(page);
        if (result.text.length > 0) {
          failures.push(`${path} TEKS:\n${result.text.join("\n")}`);
        }
        if (result.controls.length > 0) {
          failures.push(`${path} KONTROL:\n${result.controls.join("\n")}`);
        }
      }

      expect(failures, failures.join("\n\n")).toEqual([]);
    });
  }
});

test.describe("Kontras permukaan interaktif", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`editor, dialog media, notifikasi, dan menu mobile (${scheme})`, async ({
      page,
      context,
    }) => {
      await loginAs(context, readerId, "user");
      await page.emulateMedia({ colorScheme: scheme });

      // Editor berisi teks + toolbar.
      await page.goto("/komunitas/artikel");
      await page.locator("#artikel-editor").click();
      await page.keyboard.type(
        "Pesan kurir palsu meminta biaya tambahan. Periksa nomor resi di aplikasi resmi.",
      );
      expectReadable(await auditPage(page), `editor (${scheme})`);

      // Dialog media (termasuk hint privasi & label).
      await page
        .getByRole("button", { name: "Sisipkan gambar atau media" })
        .first()
        .click();
      await page
        .getByLabel("URL atau kode media")
        .fill("https://i.postimg.cc/abcd1234/contoh.jpg");
      expectReadable(await auditPage(page), `dialog media (${scheme})`);
      await page.keyboard.press("Escape");

      // Panel notifikasi.
      await page.goto("/komunitas");
      const bell = page.getByRole("button", { name: /Notifikasi/ }).first();
      await bell.click();
      await page.waitForTimeout(250);
      expectReadable(await auditPage(page), `panel notifikasi (${scheme})`);
      await page.keyboard.press("Escape");

      // Form masuk (placeholder & border input).
      await page.goto("/masuk");
      expectReadable(await auditPage(page), `form masuk (${scheme})`);

      // Pustaka (search placeholder).
      await page.goto("/pustaka");
      expectReadable(await auditPage(page), `pustaka (${scheme})`);

      // Menu navigasi mobile.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/");
      await page.getByRole("button", { name: "Buka menu" }).click();
      await page.waitForTimeout(250);
      expectReadable(await auditPage(page), `menu mobile (${scheme})`);
      await page.setViewportSize({ width: 1280, height: 900 });
    });
  }
});


/**
 * Kontrol tema.
 *
 * Membuktikan tiga mode bekerja sungguhan di peramban:
 *   - "Ikuti sistem" (default) mengikuti `prefers-color-scheme`,
 *   - "Terang" dan "Gelap" mengalahkan preferensi sistem dan bertahan setelah
 *     reload,
 *   - pilihan disimpan di localStorage saja (bukan cookie/PostgreSQL),
 *   - tema sudah benar sebelum first-paint (tidak ada kilatan).
 */
test.describe("Kontrol tema", () => {
  const bodyBg = (page: Page) =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  const themeHtml = (page: Page) =>
    page.evaluate(() => document.documentElement.getAttribute("data-theme"));

  const readStored = (page: Page) =>
    page.evaluate((key) => window.localStorage.getItem(key), THEME_STORAGE_KEY);

  /** Kontrol tema berada di halaman akun (bagian Preferensi tampilan). */
  async function openThemePanel(page: Page) {
    await page.goto("/akun");
    const group = page.getByRole("group", { name: "Pilihan tema tampilan" });
    await expect(group).toBeVisible();
    return group;
  }

  test("default mengikuti sistem dan berubah tanpa reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/pustaka");

    // Tanpa pilihan tersimpan, nilai default adalah "system".
    expect(await themeHtml(page)).toBe("system");
    expect(await readStored(page)).toBeNull();
    expect(await bodyBg(page)).toBe("rgb(245, 242, 234)");

    // Ubah preferensi sistem tanpa memuat ulang halaman.
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => bodyBg(page)).toBe("rgb(13, 19, 29)");

    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => bodyBg(page)).toBe("rgb(245, 242, 234)");
  });

  test("pilihan Gelap menang atas sistem terang dan bertahan setelah reload", async ({
    page,
    context,
  }) => {
    await loginAs(context, readerId, "user");
    await page.emulateMedia({ colorScheme: "light" });

    const group = await openThemePanel(page);
    await group.getByRole("button", { name: "Gelap" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await bodyBg(page)).toBe("rgb(13, 19, 29)");
    expect(await readStored(page)).toBe("dark");
    await expect(
      group.getByRole("button", { name: "Gelap" }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await bodyBg(page)).toBe("rgb(13, 19, 29)");
    expect(await readStored(page)).toBe("dark");
  });

  test("pilihan Terang menang atas sistem gelap dan bertahan setelah reload", async ({
    page,
    context,
  }) => {
    await loginAs(context, readerId, "user");
    await page.emulateMedia({ colorScheme: "dark" });

    const group = await openThemePanel(page);
    await group.getByRole("button", { name: "Terang" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await bodyBg(page)).toBe("rgb(245, 242, 234)");

    await page.reload();
    expect(await bodyBg(page)).toBe("rgb(245, 242, 234)");
    expect(await readStored(page)).toBe("light");
  });

  test("kembali ke Ikuti sistem memulihkan perilaku otomatis", async ({
    page,
    context,
  }) => {
    await loginAs(context, readerId, "user");
    await page.emulateMedia({ colorScheme: "light" });

    let group = await openThemePanel(page);
    await group.getByRole("button", { name: "Gelap" }).click();
    expect(await bodyBg(page)).toBe("rgb(13, 19, 29)");

    group = page.getByRole("group", { name: "Pilihan tema tampilan" });
    await group.getByRole("button", { name: "Ikuti sistem" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
    expect(await readStored(page)).toBe("system");
    expect(await bodyBg(page)).toBe("rgb(245, 242, 234)");

    // Sekali lagi mengikuti sistem, tanpa reload.
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => bodyBg(page)).toBe("rgb(13, 19, 29)");
  });

  test("preferensi tidak dikirim ke server dan tidak memakai cookie", async ({
    page,
    context,
  }) => {
    await loginAs(context, readerId, "user");
    const group = await openThemePanel(page);
    await group.getByRole("button", { name: "Gelap" }).click();

    const cookies = await page.context().cookies();
    expect(cookies.filter((cookie) => /theme/i.test(cookie.name))).toEqual([]);

    // Server tidak pernah melihat pilihan tema: HTML selalu tanpa atribut
    // `data-theme`, dan atribut itu baru dipasang skrip di peramban.
    const response = await page.request.get("/akun");
    const html = await response.text();
    expect(html).not.toMatch(/<html[^>]*\sdata-theme=/);
  });

  test("kontrol tema tidak lagi berada di navigasi", async ({ page, context }) => {
    await loginAs(context, readerId, "user");
    await page.goto("/");

    // Sidebar desktop tidak memuat kontrol tema.
    await expect(
      page.locator("aside").getByRole("group", { name: "Pilihan tema tampilan" }),
    ).toHaveCount(0);
    await expect(page.locator("aside")).not.toContainText("Preferensi tampilan");

    // Menu navigasi ponsel juga tidak memuatnya.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Buka menu" }).click();

    const menu = page.getByRole("dialog", { name: "Menu navigasi" });
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("group", { name: "Pilihan tema tampilan" }),
    ).toHaveCount(0);
    await expect(menu).not.toContainText("Preferensi tampilan");
  });

  test("tema diterapkan sebelum first-paint (tanpa kilatan)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });

    // Tetapkan pilihan manual "terang" sementara sistem gelap: bila skrip tema
    // berjalan terlambat, satu frame akan tampil gelap.
    await page.goto("/");
    await page.evaluate(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: THEME_STORAGE_KEY, value: "light" },
    );

    await page.addInitScript(() => {
      window.__themeMarks = { themeAt: null, firstPaint: null };
      const record = () => {
        if (
          document.documentElement?.hasAttribute("data-theme") &&
          window.__themeMarks.themeAt === null
        ) {
          window.__themeMarks.themeAt = performance.now();
        }
      };
      new MutationObserver(record).observe(document, {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      record();
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-paint") {
            window.__themeMarks.firstPaint = entry.startTime;
          }
        }
      }).observe({ type: "paint", buffered: true });
    });

    await page.goto("/");
    await page.waitForTimeout(250);

    const marks = await page.evaluate(() => window.__themeMarks);
    expect(marks.themeAt, "atribut data-theme tidak pernah dipasang").not.toBeNull();
    expect(marks.firstPaint, "first-paint tidak terukur").not.toBeNull();
    expect(
      marks.themeAt as number,
      "data-theme harus terpasang sebelum first-paint",
    ).toBeLessThanOrEqual(marks.firstPaint as number);
  });

  test("sidebar tetap bisa digulir sehingga kontrol akun terjangkau di jendela pendek", async ({
    page,
  }, testInfo) => {
    // Sidebar desktop hanya tampil pada lebar >= 1024px (breakpoint lg).
    test.skip(testInfo.project.name !== "chromium", "sidebar desktop saja");

    await page.setViewportSize({ width: 1280, height: 520 });
    await page.goto("/");

    const sidebar = page.locator("aside");
    await expect(sidebar).toHaveCount(1);

    // Gulir sidebar sampai bawah, lalu pastikan kontrol terakhir (tautan akun)
    // benar-benar berada di dalam viewport.
    const geometry = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      if (!aside) return null;
      aside.scrollTop = aside.scrollHeight;
      const controls = [...aside.querySelectorAll("a, button")];
      const last = controls[controls.length - 1];
      return {
        overflowY: getComputedStyle(aside).overflowY,
        viewport: window.innerHeight,
        lastBottom: Math.round(last.getBoundingClientRect().bottom),
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.overflowY).toBe("auto");
    expect(
      geometry!.lastBottom,
      "tautan akun terakhir harus terlihat setelah sidebar digulir",
    ).toBeLessThanOrEqual(geometry!.viewport);
  });

  test("tidak ada hydration warning dan tidak ada overflow horizontal", async ({
    page,
  }) => {
    const messages: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        messages.push(msg.text());
      }
    });

    await page.emulateMedia({ colorScheme: "dark" });
    for (const path of ["/", "/pustaka", "/komunitas", "/komunitas/artikel"]) {
      await page.goto(path);
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `overflow horizontal di ${path}`).toBeLessThanOrEqual(1);
    }

    const hydration = messages.filter((message) =>
      /hydrat|did not match|server rendered HTML/i.test(message),
    );
    expect(hydration, hydration.join("\n")).toEqual([]);
  });
});

/** Membaca token warna hasil komputasi di peramban. */
const readTokens = (page: Page) =>
  page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const get = (name: string) => style.getPropertyValue(name).trim();
    return {
      lime: get("--color-lime"),
      amber: get("--color-amber"),
      coral: get("--color-coral"),
      safe: get("--color-safe"),
      limeSoft: get("--color-lime-soft"),
      amberSoft: get("--color-amber-soft"),
      coralSoft: get("--color-coral-soft"),
      safeSoft: get("--color-safe-soft"),
      paper: get("--color-paper"),
      surface: get("--color-surface"),
      graphite: get("--color-graphite"),
      onLime: get("--color-on-lime"),
    };
  });

const toRgb = (hex: string) => {
  let h = hex.replace("#", "");
  // Lightning CSS meminimalkan nilai seperti `#ffffff` menjadi `#fff`.
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastOf = (a: string, b: string) => {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

/** Jarak kanal terbesar-minimal: rendah berarti warna mendekati abu-abu. */
const chroma = (hex: string) => {
  const [r, g, b] = toRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b);
};

test.describe("Warna aksen", () => {
  test("aksen kuat tetap pekat dan kontras di light maupun dark", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "token tema sama untuk semua project");

    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      const t = await readTokens(page);

      // Aksen kuat: kontras >= 4,5:1 terhadap permukaan tempat teks aksen dipakai.
      for (const accent of [t.coral, t.amber, t.safe]) {
        expect(
          contrastOf(accent, t.surface),
          `${accent} vs surface (${scheme})`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastOf(t.onLime, t.lime)).toBeGreaterThanOrEqual(4.5);
      expect(contrastOf(t.lime, t.graphite)).toBeGreaterThanOrEqual(4.5);

      // Aksen kuat tidak boleh menjadi abu-abu/lumpur.
      for (const accent of [t.coral, t.amber, t.safe, t.lime]) {
        expect(chroma(accent), `${accent} terlalu kusam (${scheme})`).toBeGreaterThanOrEqual(90);
      }
    }
  });

  test("latar aksen lembut tetap berrona dan terpisah dari aksen kuat", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "token tema sama untuk semua project");

    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const t = await readTokens(page);

    // Latar lembut bukan abu-abu gelap: masih punya rona yang jelas.
    for (const soft of [t.limeSoft, t.amberSoft, t.coralSoft, t.safeSoft]) {
      expect(chroma(soft), `${soft} terlalu kelabu`).toBeGreaterThanOrEqual(30);
    }

    // Peran terpisah: aksen kuat jelas berbeda dari latar lembutnya.
    expect(contrastOf(t.coral, t.coralSoft)).toBeGreaterThanOrEqual(3);
    expect(contrastOf(t.amber, t.amberSoft)).toBeGreaterThanOrEqual(3);
    expect(contrastOf(t.safe, t.safeSoft)).toBeGreaterThanOrEqual(3);
    expect(contrastOf(t.lime, t.limeSoft)).toBeGreaterThanOrEqual(3);

    // Halaman tetap gelap, bukan ikut menjadi terang.
    expect(luminance(t.paper)).toBeLessThan(0.05);
    expect(luminance(t.surface)).toBeLessThan(0.06);
  });

  test("tombol primary benar-benar kontras di kedua tema", async ({ page }) => {
    const parseRgb = (value: string) => {
      const nums = value.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
      return `#${nums.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
    };

    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      // /masuk publik dan selalu memuat satu tombol primary.
      await page.goto("/masuk");

      const colors = await page.evaluate(() => {
        const el =
          document.querySelector<HTMLElement>("a.bg-lime, button.bg-lime") ?? null;
        if (!el) return null;
        const style = getComputedStyle(el);
        return { color: style.color, background: style.backgroundColor };
      });

      expect(colors, `tombol primary tidak ditemukan (${scheme})`).not.toBeNull();
      const ratio = contrastOf(
        parseRgb(colors!.color),
        parseRgb(colors!.background),
      );
      expect(ratio, `tombol primary (${scheme})`).toBeGreaterThanOrEqual(4.5);
    }
  });
});



test.describe("Panel notifikasi", () => {
  /** Tombol lonceng yang benar-benar tampil pada viewport saat ini. */
  async function bellFor(page: Page, desktop: boolean) {
    const scope = desktop ? page.locator("aside") : page.locator("header");
    return scope.getByRole("button", { name: /^Notifikasi/ });
  }

  test("panel tetap di dalam layar dan tidak terpotong di desktop maupun mobile", async ({
    page,
    context,
  }) => {
    await loginAs(context, adminId, "admin");

    for (const viewport of [
      { width: 1280, height: 800, desktop: true },
      { width: 390, height: 844, desktop: false },
    ]) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/komunitas");

      const bell = await bellFor(page, viewport.desktop);
      await expect(bell).toHaveCount(1);
      await bell.click();

      const panel = page.getByTestId("notification-panel");
      await expect(panel).toBeVisible();

      const box = await panel.boundingBox();
      expect(box, "panel harus punya kotak").not.toBeNull();
      const label = `${viewport.width}x${viewport.height}`;

      expect(box!.x, `kiri ${label}`).toBeGreaterThanOrEqual(0);
      expect(box!.y, `atas ${label}`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `kanan ${label}`).toBeLessThanOrEqual(
        viewport.width + 0.5,
      );
      expect(box!.y + box!.height, `bawah ${label}`).toBeLessThanOrEqual(
        viewport.height + 0.5,
      );

      // Tidak terpotong: titik di dalam panel harus benar-benar milik panel,
      // bukan tertutup sidebar atau area konten.
      const onTop = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="notification-panel"]');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + Math.min(20, rect.height / 2),
        );
        return el.contains(hit);
      });
      expect(onTop, `panel tertutup elemen lain (${label})`).toBe(true);

      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);
    }
  });

  test("panel dapat ditutup dengan Escape dan klik di luar", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "cukup satu viewport");

    await loginAs(context, adminId, "admin");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/komunitas");

    const bell = await bellFor(page, true);
    const panel = page.getByTestId("notification-panel");

    await bell.click();
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(bell).toBeFocused();

    await bell.click();
    await expect(panel).toBeVisible();
    await page.mouse.click(900, 200);
    await expect(panel).toHaveCount(0);

    // Tombol tetap berfungsi lewat keyboard.
    await bell.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });

  test("varian desktop dan mobile tidak memicu permintaan notifikasi ganda", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "cukup satu viewport");

    await loginAs(context, adminId, "admin");

    const requests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/community/notifications")) requests.push(url);
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/komunitas");
    await page.waitForTimeout(1500);

    const initial = requests.filter((url) => !url.includes("/read"));
    expect(initial.length, `permintaan awal: ${initial.join(", ")}`).toBe(1);
  });
});

test.describe("Tata letak halaman akun", () => {
  test("kontainer akun rata kiri terhadap area konten di desktop dan mobile", async ({
    page,
    context,
  }) => {
    await loginAs(context, readerId, "user");

    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/akun");
      await expect(page.getByRole("heading", { level: 1, name: /./ })).toBeVisible();

      const geometry = await page.evaluate(() => {
        const main = document.querySelector("main");
        const heading = document.querySelector("main h1");
        if (!main || !heading) return null;

        // Kontainer = leluhur terdekat h1 yang membatasi lebar konten.
        let container: HTMLElement | null = heading as HTMLElement;
        while (container && container !== main) {
          const maxWidth = getComputedStyle(container).maxWidth;
          if (maxWidth && maxWidth !== "none") break;
          container = container.parentElement;
        }

        const mainRect = main.getBoundingClientRect();
        const box = (container ?? heading).getBoundingClientRect();

        return {
          leftGap: Math.round(box.left - mainRect.left),
          rightGap: Math.round(mainRect.right - box.right),
          panelLefts: [...document.querySelectorAll("main section")].map((panel) =>
            Math.round(panel.getBoundingClientRect().left),
          ),
        };
      });

      expect(geometry, "struktur halaman akun tidak ditemukan").not.toBeNull();
      const label = `${viewport.width}x${viewport.height}`;

      // Rata kiri: jarak kiri hanya selebar padding konten (16/24 px).
      expect(geometry!.leftGap, `jarak kiri (${label})`).toBeGreaterThanOrEqual(0);
      expect(geometry!.leftGap, `jarak kiri (${label})`).toBeLessThanOrEqual(24);

      // Desktop: max-w-3xl lebih sempit dari area konten, jadi sisa ruang ada
      // di kanan. Bila tercentang, kedua sisi akan hampir sama.
      if (viewport.width >= 1024) {
        expect(
          geometry!.rightGap,
          `sisa ruang kanan harus lebih besar dari kiri (${label})`,
        ).toBeGreaterThan(geometry!.leftGap + 40);
      }

      // Semua panel (preferensi, draf, pertanyaan, pengajuan) mulai di garis
      // kiri yang sama.
      expect(geometry!.panelLefts.length).toBeGreaterThan(0);
      for (const left of geometry!.panelLefts) {
        expect(
          Math.abs(left - geometry!.panelLefts[0]),
          `panel rata kiri (${label})`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });
});

test.describe("Justify teks halaman akun", () => {
  test("paragraf panjang rata kanan-kiri, heading dan kontrol tetap rata kiri", async ({
    page,
    context,
  }) => {
    await loginAs(context, readerId, "user");

    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/akun");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const styles = await page.evaluate(() => {
        const main = document.querySelector("main");
        if (!main) return null;
        const pick = (el: Element | null) => {
          if (!el) return null;
          const s = getComputedStyle(el);
          return {
            textAlign: s.textAlign,
            // `textJustify` belum ada di tipe DOM, jadi dibaca lewat getPropertyValue.
            textJustify: s.getPropertyValue("text-justify").trim(),
          };
        };
        const justified = [...main.querySelectorAll("p.saring-justify")];
        return {
          justified: justified.map((p) => ({
            ...pick(p),
            text: (p.textContent ?? "").trim().slice(0, 40),
          })),
          heading: pick(main.querySelector("h1")),
          panelTitle: pick(main.querySelector("section h2")),
          button: pick(main.querySelector("section button")),
          link: pick(main.querySelector("a")),
          metadata: pick(main.querySelector("span.font-mono")),
        };
      });

      expect(styles, "halaman akun tidak ditemukan").not.toBeNull();
      const label = `${viewport.width}x${viewport.height}`;

      // Paragraf isi benar-benar dijustify dengan perenggangan antarkata saja.
      expect(styles!.justified.length, `jumlah paragraf (${label})`).toBeGreaterThan(0);
      for (const p of styles!.justified) {
        expect(p.textAlign, `text-align "${p.text}" (${label})`).toBe("justify");
        expect(p.textJustify, `text-justify "${p.text}" (${label})`).toBe("inter-word");
      }

      // Elemen non-prosa tidak boleh ikut dijustify.
      for (const [name, value] of [
        ["heading", styles!.heading],
        ["judul panel", styles!.panelTitle],
        ["tombol", styles!.button],
        ["tautan", styles!.link],
        ["metadata", styles!.metadata],
      ] as const) {
        if (!value) continue;
        expect(value.textAlign, `${name} tidak boleh justify (${label})`).not.toBe(
          "justify",
        );
      }

      // Justify tidak boleh menyebabkan luapan horizontal (terutama ponsel).
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `overflow horizontal (${label})`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("Panel notifikasi saat gagal", () => {
  const NOTIFICATIONS = "**/api/community/notifications";
  const READ = "**/api/community/notifications/read";

  async function openPanel(page: Page) {
    const bell = page.locator("aside").getByRole("button", { name: /^Notifikasi/ });
    await bell.click();
    const panel = page.getByTestId("notification-panel");
    await expect(panel).toBeVisible();
    return panel;
  }

  test("menampilkan state gagal, bukan status memuat terus-menerus", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "cukup satu viewport");

    await loginAs(context, adminId, "admin");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.route(NOTIFICATIONS, (route) => route.fulfill({ status: 500, body: "{}" }));

    await page.goto("/komunitas");
    const panel = await openPanel(page);

    await expect(panel.getByText(/Memuat notifikasi/i)).toHaveCount(0);
    await expect(panel.getByText("Notifikasi gagal dimuat.")).toBeVisible();

    // Setelah endpoint sehat, "Coba lagi" memuat data.
    await page.unroute(NOTIFICATIONS);
    await panel.getByRole("button", { name: "Coba lagi" }).click();
    await expect(panel.getByText("Notifikasi gagal dimuat.")).toHaveCount(0);
    await expect(
      panel.getByText(/Belum ada notifikasi|Tandai semua/),
    ).toBeVisible();
  });

  test("tandai semua yang gagal memulihkan state belum dibaca", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "cukup satu viewport");

    // Notifikasi nyata di database uji agar badge pasti belum dibaca.
    const dedupe = randomUUID();
    const inserted = await pool.query(
      `insert into notifications (user_id, kind, title, dedupe_key)
       values ($1, 'thread_reply', 'Notifikasi uji panel', $2) returning id`,
      [adminId, dedupe],
    );

    try {
      await loginAs(context, adminId, "admin");
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/komunitas");

      const badge = page.locator('aside button[aria-label^="Notifikasi, "]');
      await expect(badge).toHaveAttribute("aria-label", /belum dibaca/);
      const before = await badge.getAttribute("aria-label");

      // Penulisan status baca gagal.
      await page.route(READ, (route) => route.fulfill({ status: 500, body: "{}" }));

      const panel = await openPanel(page);
      await panel.getByRole("button", { name: "Tandai semua" }).click();

      await expect(panel.getByText("Status baca gagal disimpan.")).toBeVisible();
      // Snapshot dipulihkan: badge belum dibaca tidak hilang.
      await expect(badge).toHaveAttribute("aria-label", before!);
      await expect(panel.getByRole("button", { name: "Tandai semua" })).toBeVisible();
    } finally {
      await pool.query(`delete from notifications where id = $1`, [
        inserted.rows[0].id,
      ]);
    }
  });
});

