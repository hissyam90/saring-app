import { describe, expect, it } from "vitest";
import { checkPhoneNoProvider, normalizePhone } from "@/lib/analysis";

describe("normalizePhone", () => {
  it.each([
    ["0812-3456-7890", "081234567890", "+6281234567890"],
    ["62 812 3456 7890", "081234567890", "+6281234567890"],
    ["+62 (812) 3456-7890", "081234567890", "+6281234567890"],
    ["+62 0812-3456-7890", "081234567890", "+6281234567890"],
    ["(0812) 3456 7890", "081234567890", "+6281234567890"],
    ["0812.3456.7890", "081234567890", "+6281234567890"],
    ["0812 3456 7890", "081234567890", "+6281234567890"],
  ])("normalizes %s", (input, national, e164) => {
    const result = normalizePhone(input);
    expect(result.isValid).toBe(true);
    expect(result.national).toBe(national);
    expect(result.e164).toBe(e164);
  });

  it.each([
    ["021-123", /ponsel Indonesia|Panjang/],
    ["12345", /ponsel Indonesia|Panjang/],
    ["0812", /Panjang/],
    ["0812-ABCD-EFGH", /hanya boleh berisi angka/],
    ["", /Masukkan nomor/],
  ])("rejects %s", (input, message) => {
    const result = normalizePhone(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.join(" ")).toMatch(message);
  });
});

describe("pemeriksaan nomor tanpa penyedia", () => {
  it("hanya menormalkan dan menyatakan belum diperiksa", () => {
    const result = checkPhoneNoProvider("0812-3456-7890");
    expect(result.status).toBe("not-checked");
  });

  it("tidak menyimpulkan reputasi dari awalan nomor", () => {
    // Nomor dengan awalan apa pun tidak boleh diberi status "reported".
    const result = checkPhoneNoProvider("081299999999");
    expect(result.status).not.toBe("reported");
  });
});
