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
  await expect(
    page.getByRole("heading", { name: "Banyak sinyal bahaya" }),
  ).toBeVisible({ timeout: 5000 });
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

test("mobile navigation opens and links work", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile viewport only");
  await page.goto("/");
  await page.getByRole("button", { name: "Buka menu" }).click();
  await expect(
    page.getByRole("link", { name: "Pustaka", exact: true }),
  ).toBeVisible();
});