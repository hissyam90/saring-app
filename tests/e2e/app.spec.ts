import { expect, test } from "@playwright/test";

const ROUTES = [
  { path: "/", heading: "Berhenti sebentar. Periksa sinyalnya." },
  { path: "/periksa", heading: "Periksa pesan" },
  { path: "/latihan", heading: "Latihan keputusan" },
  { path: "/langkah", heading: "Langkah selanjutnya" },
  { path: "/pustaka", heading: "Pustaka kepercayaan digital" },
];

test.describe("Routes", () => {
  for (const route of ROUTES) {
    test(`${route.path} loads directly without 404`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).not.toBe(404);
      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible();
    });
  }
});

test.describe("Pustaka", () => {
  test("indeks menampilkan grid artikel dan membuka halaman detail", async ({
    page,
  }) => {
    await page.goto("/pustaka");
    await expect(page.getByText(/14 dari 14 artikel/)).toBeVisible();

    await page.getByRole("link", { name: /Nomor baru, minta pinjaman/ }).click();
    await expect(page).toHaveURL(/\/pustaka\/nomor-baru-minta-uang/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Nomor baru, minta pinjaman/,
      }),
    ).toBeVisible();
    await expect(page.getByText(/menit baca/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Sumber rujukan" }),
    ).toBeVisible();
    await expect(page.getByText("Daftar periksa")).toBeVisible();
  });

  test("artikel terkait dan navigasi kembali berfungsi", async ({ page }) => {
    await page.goto("/pustaka/otp-dan-pengambilalihan-akun");
    await expect(page.getByText("Artikel terkait")).toBeVisible();
    await page.getByRole("link", { name: "Semua artikel" }).click();
    await expect(page).toHaveURL(/\/pustaka$/);
  });

  test("pencarian menyaring artikel", async ({ page }) => {
    await page.goto("/pustaka");
    await page.getByLabel("Cari topik pustaka").fill("qris");
    await expect(
      page.getByRole("link", { name: /QR code dan QRIS/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Lowongan kerja yang meminta/ }),
    ).toHaveCount(0);
  });

  test("slug tidak dikenal menghasilkan 404", async ({ page }) => {
    const response = await page.goto("/pustaka/slug-yang-tidak-ada");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Latihan", () => {
  test("sesi cepat berjalan 5 soal sampai ringkasan dengan poin", async ({
    page,
  }) => {
    await page.goto("/latihan");
    await expect(page.getByText("Cara penilaian")).toBeVisible();
    await page.getByRole("button", { name: /Latihan cepat/ }).click();
    await expect(page.getByText("1/5")).toBeVisible();

    for (let i = 0; i < 5; i += 1) {
      await page
        .locator("fieldset button")
        .first()
        .click();
      await page
        .getByRole("button", { name: /Soal berikutnya|Lihat hasil/ })
        .click();
    }

    await expect(page.getByRole("heading", { name: "Hasil sesi" })).toBeVisible();
    await expect(page.getByText(/dari 5 soal dijawab/)).toBeVisible();
    await expect(page.getByText(/dari poin maksimum/)).toBeVisible();
    await expect(page.getByText("Per kategori")).toBeVisible();
  });

  test("sesi standar memakai 10 soal", async ({ page }) => {
    await page.goto("/latihan");
    await page.getByRole("button", { name: /Latihan standar/ }).click();
    await expect(page.getByText("1/10")).toBeVisible();
  });
});

test.describe("Rencana tindakan", () => {
  test("menampilkan lima bagian rencana", async ({ page }) => {
    await page.goto("/langkah");
    for (const heading of [
      "Lakukan sekarang",
      "Setelah itu",
      "Bukti yang perlu disimpan",
      "Yang perlu diperiksa",
      "Sumber bantuan resmi",
    ]) {
      await expect(
        page.getByRole("heading", { name: heading }),
      ).toBeVisible();
    }
  });

  test("membuka kondisi tertentu dari tautan", async ({ page }) => {
    await page.goto("/langkah?kondisi=transferred-money");
    await expect(
      page.getByText(/hubungi bank\/e-wallet lewat kanal resmi/),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Indonesia Anti-Scam Centre/ }),
    ).toBeVisible();
  });

  test("hasil pemeriksaan menautkan ke rencana tindakan", async ({ page }) => {
    await page.goto("/periksa");
    await page
      .getByLabel("Pesan yang ingin diperiksa")
      .fill("Segera kirim kode OTP Anda atau akun Anda akan diblokir.");
    await page.getByRole("button", { name: "Periksa pesan" }).click();
    await page.getByRole("link", { name: /Susun rencana tindakan/ }).click();
    await expect(page).toHaveURL(/\/langkah\?kondisi=/);
  });
});

test("homepage tidak mengulang daftar fitur di footer", async ({ page }) => {
  await page.goto("/");
  // Section navigasi duplikat sudah dihapus.
  await expect(page.getByText("Bagian lain dari Saring")).toHaveCount(0);
  // Section pengganti memberi nilai berbeda.
  await expect(
    page.getByRole("heading", { name: "Kalau sudah terlanjur" }),
  ).toBeVisible();
  // Footer memuat batasan, bukan mengulang prinsip privasi.
  await expect(
    page.getByText("Yang tidak bisa dilakukan Saring"),
  ).toBeVisible();
});

test("analyzer produces an explainable result", async ({ page }) => {
  await page.goto("/periksa");
  await page
    .getByLabel("Pesan yang ingin diperiksa")
    .fill("Segera kirim kode OTP Anda atau akun Anda akan diblokir dalam 24 jam.");
  await page.getByRole("button", { name: "Periksa pesan" }).click();

  // Keputusan sementara yang dapat ditindaklanjuti.
  await expect(
    page.getByRole("heading", { name: "Jangan bagikan kode rahasia apa pun" }),
  ).toBeVisible({ timeout: 8000 });

  // Sinyal, kutipan bukti, dan klasifikasi tetap tersaji.
  await expect(
    page.getByRole("heading", { name: "Sinyal yang terdeteksi" }),
  ).toBeVisible();
  await expect(page.getByText("Kutipan dari pesan").first()).toBeVisible();
  await expect(page.getByText(/Banyak sinyal bahaya/).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Langkah yang disarankan" }),
  ).toBeVisible();
});

test("notification and controls stay usable on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile viewport only");
  await page.goto("/periksa");
  await page
    .getByLabel("Pesan yang ingin diperiksa")
    .fill("kirim kode OTP Anda sekarang");
  await page.getByRole("button", { name: "Periksa pesan" }).click();
  await expect(page.getByText(/Permintaan kode rahasia/)).toBeVisible({
    timeout: 5000,
  });
});

test("homepage surfaces the friend-money verification verdict", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Pesan yang ingin diperiksa")
    .fill(
      "Ra, ini aku. nomor baru. hp lama ilang kmrn. bisa pinjem 500 dulu ga? buat bayar kos, hari ini harus setor. nanti sore aku balikin",
    );
  await page.getByRole("button", { name: "Periksa pesan" }).click();
  await expect(
    page.getByRole("heading", { name: "Perlu verifikasi sebelum mengirim uang" }),
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByRole("heading", { name: "Langkah yang disarankan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Yang belum dapat dipastikan" }),
  ).toBeVisible();
  await expect(page.getByText("Kutipan dari pesan").first()).toBeVisible();
});

test("phone mode gives an in-site assessment", async ({ page }) => {
  await page.goto("/periksa");
  await page.getByRole("tab", { name: /Periksa Nomor/ }).click();
  await page.getByLabel("Nomor telepon pengirim").fill("0812-3456-7890");
  await page.getByLabel(/Meminta uang atau pinjaman/).check();
  await page.getByRole("button", { name: "Nilai nomor ini" }).click();
  await expect(page.getByText("Nomor ternormalisasi")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("081234567890")).toBeVisible();
  await expect(page.getByText("Langkah berikutnya")).toBeVisible();
});

test("link mode keeps local findings without consent", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Periksa Tautan/ }).click();
  await page.getByLabel("Tautan yang dikirim pengirim").fill("https://bit.ly/contoh-login");
  await page.getByRole("button", { name: "Periksa tautan" }).click();
  await expect(page.getByText("Struktur tautan yang dikenali")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByText(/Tautan pendek \(shortened URL\)/)).toBeVisible();
  await expect(
    page.getByText("Reputasi eksternal · Google Safe Browsing"),
  ).toBeVisible();
});

test("no horizontal overflow on mobile after redesign", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile viewport only");
  await page.goto("/periksa");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("mobile navigation opens and links work", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile viewport only");
  await page.goto("/");
  await page.getByRole("button", { name: "Buka menu" }).click();

  const menu = page.getByRole("dialog", { name: "Menu navigasi" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "Pustaka" })).toBeVisible();

  await menu.getByRole("link", { name: "Langkah" }).click();
  await expect(page).toHaveURL(/\/langkah/);
});