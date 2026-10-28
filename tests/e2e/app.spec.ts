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
  await expect(page.getByText("Reputasi eksternal · PhishTank")).toBeVisible();
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
  await expect(
    page.getByRole("link", { name: "Pustaka", exact: true }),
  ).toBeVisible();
});