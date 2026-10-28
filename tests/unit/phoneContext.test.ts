import { describe, expect, it } from "vitest";
import { assessPhoneBehavior, normalizePhone } from "@/lib/analysis";

describe("normalizePhone", () => {
  it("normalizes common Indonesian formats identically", () => {
    for (const input of [
      "0812-3456-7890",
      "081234567890",
      "6281234567890",
      "+62 812 3456 7890",
      "(0812) 3456 7890",
      "+62-812-3456-7890",
    ]) {
      const result = normalizePhone(input);
      expect(result.isValid, input).toBe(true);
      expect(result.national, input).toBe("081234567890");
      expect(result.e164, input).toBe("+6281234567890");
    }
  });

  it("rejects clearly invalid input with a reason", () => {
    expect(normalizePhone("").isValid).toBe(false);
    expect(normalizePhone("abc").isValid).toBe(false);
    expect(normalizePhone("12345").isValid).toBe(false);
    expect(normalizePhone("0812").isValid).toBe(false);
    const landline = normalizePhone("021-555-1234");
    expect(landline.isValid).toBe(false);
    expect(landline.errors[0]).toMatch(/ponsel/i);
  });
});

describe("assessPhoneBehavior", () => {
  it("raises verification when the sender asks for money", () => {
    const assessment = assessPhoneBehavior(["money"]);
    expect(assessment.level).toBe("medium");
    expect(assessment.indicators).toHaveLength(1);
    expect(assessment.actionSteps.join(" ").toLowerCase()).toContain("transfer");
  });

  it("escalates OTP requests to the highest level", () => {
    const assessment = assessPhoneBehavior(["otp", "money"]);
    expect(assessment.level).toBe("high");
    expect(assessment.levelLabel).toMatch(/verifikasi tinggi/i);
    expect(assessment.actionSteps.join(" ").toLowerCase()).toContain("otp");
  });

  it("keeps a known-contact conversation at low verification", () => {
    const assessment = assessPhoneBehavior(["normal"]);
    expect(assessment.level).toBe("low");
    expect(assessment.indicators).toHaveLength(0);
    expect(assessment.summary.toLowerCase()).toMatch(/bukan penilaian reputasi/);
  });

  it("never claims the number is reported, clean, or safe", () => {
    for (const behaviors of [["otp"], ["money", "fee"], ["normal"]] as const) {
      const assessment = assessPhoneBehavior([...behaviors]);
      const text = JSON.stringify(assessment).toLowerCase();
      expect(text).not.toMatch(/nomor (ini )?(terlapor|bersih|aman)\b/);
      expect(assessment.uncertainties.join(" ").toLowerCase()).toMatch(
        /bukan pencarian reputasi|tidak memiliki data laporan/,
      );
    }
  });

  it("is deterministic for the same input", () => {
    expect(assessPhoneBehavior(["link", "prize"])).toEqual(
      assessPhoneBehavior(["link", "prize"]),
    );
  });
});