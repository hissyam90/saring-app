import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/analysis";

describe("normalizePhone", () => {
  it.each([
    ["0812-3456-7890", "081234567890", "+6281234567890"],
    ["62 812 3456 7890", "081234567890", "+6281234567890"],
    ["+62 (812) 3456-7890", "081234567890", "+6281234567890"],
  ])("normalizes %s", (input, national, e164) => {
    const result = normalizePhone(input);
    expect(result.isValid).toBe(true);
    expect(result.national).toBe(national);
    expect(result.e164).toBe(e164);
  });

  it("rejects an invalid Indonesian mobile number", () => {
    const result = normalizePhone("021-123");
    expect(result.isValid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/ponsel Indonesia|Panjang/);
  });
});
