import { describe, expect, it } from "vitest";
import { analyzeText } from "@/lib/analysis";
import { EXAMPLES } from "@/data/examples";

const FRIEND_SCAM =
  "Ra ini aku, nomor baru. HP lama hilang. Bisa pinjem 500 dulu gak? Buat bayar kos hari ini. Sore aku balikin ya.";
const FRIEND_BENIGN =
  "Ra ini aku, nomor baru ya. HP lama ilang. Nanti aku kabarin lagi kalau udah dapet nomor lama.";

describe("social engineering — nomor baru minta uang", () => {
  it("detects the combined pattern, not just a keyword", () => {
    const result = analyzeText(FRIEND_SCAM);
    const categories = result.findings.map((f) => f.category);
    expect(categories).toContain("acquaintance-impersonation");
    expect(categories).toContain("money-request");
  });

  it("produces an identity-verification verdict with concrete steps", () => {
    const result = analyzeText(FRIEND_SCAM);
    expect(result.verdict.title).toBe("Perlu verifikasi sebelum mengirim uang");
    expect(result.verdict.tone).toBe("critical");
    expect(result.verdict.actionSteps.length).toBeGreaterThanOrEqual(4);
    const steps = result.verdict.actionSteps.join(" ").toLowerCase();
    expect(steps).toMatch(/nomor lama/);
    expect(steps).toMatch(/video call|telepon/);
    expect(steps).toMatch(/jangan transfer/);
  });

  it("hedges instead of accusing the sender", () => {
    const result = analyzeText(FRIEND_SCAM);
    const text = JSON.stringify(result).toLowerCase();
    // Tidak boleh ada tuduhan langsung tanpa kualifikasi.
    expect(text).not.toMatch(/adalah penipu|terbukti penipu|pelaku kejahatan|penipu yang/);
    // Penyebutan "penipu" hanya boleh muncul dalam bentuk penyangkalan.
    const accusations = text.match(/[^."]{0,30}\bpenipu\b/g) ?? [];
    for (const phrase of accusations) {
      expect(phrase).toMatch(/bukan|belum tentu|tanpa|tidak/);
    }
    expect(result.verdict.summary.toLowerCase()).toMatch(/bukan berarti|belum tentu/);
    expect(result.verdict.title.toLowerCase()).not.toContain("penipu");
  });

  it("cites evidence from the original message", () => {
    const result = analyzeText(FRIEND_SCAM);
    const withEvidence = result.findings.filter((f) => f.evidence);
    expect(withEvidence.length).toBeGreaterThan(0);
    expect(withEvidence.some((f) => /nomor baru|pinjem/i.test(f.evidence ?? ""))).toBe(
      true,
    );
  });

  it("records what cannot be determined", () => {
    const result = analyzeText(FRIEND_SCAM);
    expect(result.verdict.uncertainties.length).toBeGreaterThan(0);
    expect(result.verdict.uncertainties.join(" ").toLowerCase()).toMatch(
      /identitas|tidak dapat/,
    );
  });
});

describe("social engineering — false positives", () => {
  it("does not flag a new-number message that asks for nothing", () => {
    const result = analyzeText(FRIEND_BENIGN);
    expect(
      result.findings.some((f) => f.category === "acquaintance-impersonation"),
    ).toBe(false);
    expect(result.classification).toBe("limited-signals");
    expect(result.verdict.tone).toBe("neutral");
  });

  it("does not treat an ordinary meeting reminder as risky", () => {
    const result = analyzeText(
      "besok kita meeting jam 10 ya di ruang rapat lt 3. jangan lupa bawa draft proposal",
    );
    expect(result.findings).toHaveLength(0);
    expect(result.classification).toBe("limited-signals");
  });

  it("does not treat a shipping notification as risky", () => {
    const result = analyzeText(
      "Halo, pesanan #BS-2041 sudah kami kirim. Estimasi tiba 2-4 hari kerja.",
    );
    expect(result.findings).toHaveLength(0);
  });

  it("does not flag a plain money request as impersonation", () => {
    const result = analyzeText("bang bisa pinjem 50rb dulu ga buat bensin");
    expect(
      result.findings.some((f) => f.category === "acquaintance-impersonation"),
    ).toBe(false);
    expect(result.findings.some((f) => f.category === "money-request")).toBe(true);
  });

  it("keeps at least two example messages non-suspicious", () => {
    const results = EXAMPLES.map((example) => ({
      id: example.id,
      result: analyzeText(example.text),
    }));
    const benign = results.filter((r) => r.result.findings.length === 0);
    expect(benign.length).toBeGreaterThanOrEqual(2);
  });

  it("makes the suspicious examples actually produce findings", () => {
    const suspicious = ["friend-new-number", "otp", "job-fee", "giveaway", "investment"];
    for (const id of suspicious) {
      const example = EXAMPLES.find((e) => e.id === id);
      expect(example, `missing example ${id}`).toBeDefined();
      const result = analyzeText(example!.text);
      expect(result.findings.length, `no findings for ${id}`).toBeGreaterThan(0);
    }
  });
});

describe("verdict ordering for credential theft", () => {
  it("prioritises the OTP warning above generic review", () => {
    const result = analyzeText(
      "Halo kak, saya dari CS bank. Boleh info kode OTP yang masuk ke SMS?",
    );
    expect(result.verdict.title).toBe("Jangan bagikan kode rahasia apa pun");
    expect(result.verdict.actionSteps.join(" ")).toMatch(/jangan/i);
  });
});