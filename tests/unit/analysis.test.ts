import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeText, extractUrls } from "@/lib/analysis";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analyzeText — credential theft", () => {
  it("flags a message that demands an OTP", () => {
    const result = analyzeText("Segera kirim kode OTP Anda ke nomor ini untuk verifikasi.");
    expect(result.isValid).toBe(true);
    expect(
      result.findings.some((finding) => finding.category === "credential-theft"),
    ).toBe(true);
  });

  it("does not treat an educational OTP mention as credential theft", () => {
    const result = analyzeText(
      "Jangan pernah bagikan kode OTP kepada siapa pun. Aktifkan verifikasi dua langkah.",
    );
    expect(
      result.findings.some((finding) => finding.category === "credential-theft"),
    ).toBe(false);
  });
});

describe("analyzeText — payment & promises", () => {
  it("detects an upfront recruitment fee with an explanation", () => {
    const result = analyzeText(
      "Anda lolos seleksi. Silakan transfer biaya administrasi Rp250.000 untuk aktivasi data calon karyawan.",
    );
    const finding = result.findings.find(
      (item) => item.category === "upfront-payment",
    );
    expect(finding).toBeDefined();
    expect(finding?.title).toBe("Permintaan pembayaran di muka");
    expect(finding?.explanation.length).toBeGreaterThan(10);
  });

  it("flags a guaranteed-return investment promise", () => {
    const result = analyzeText(
      "Investasi emas digital dijamin untung 20% per bulan, tanpa risiko.",
    );
    expect(
      result.findings.some((f) => f.category === "unrealistic-promise"),
    ).toBe(true);
  });
});

describe("analyzeText — classification", () => {
  it("keeps a neutral message at limited signals", () => {
    const result = analyzeText(
      "Besok rapat tim jam 10.00 di ruang serbaguna. Tolong siapkan laporan bulanan ya. Terima kasih.",
    );
    expect(result.isValid).toBe(true);
    expect(result.classification).toBe("limited-signals");
  });

  it("classifies a multi-signal scam message as many signals", () => {
    const result = analyzeText(
      "Akun Anda akan diblokir dalam 24 jam. Segera kirim kode OTP Anda ke admin kami agar tidak terkena sanksi.",
    );
    expect(result.classification).toBe("many-signals");
  });
});

describe("analyzeText — validation", () => {
  it("rejects empty input", () => {
    const result = analyzeText("   ");
    expect(result.isValid).toBe(false);
    expect(result.errors.join(" ")).toContain("Masukkan pesan");
  });

  it("rejects input over the character limit", () => {
    const long = "a".repeat(2501);
    const result = analyzeText(long);
    expect(result.isValid).toBe(false);
    expect(result.errors.join(" ")).toContain("melebihi batas");
  });
});

describe("analyzeText — safe URL inspection", () => {
  it("detects shortened and IP URLs without fetching", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = analyzeText(
      "Cek info gaji di https://bit.ly/gaji-karyawan atau http://192.168.1.10/login",
    );

    expect(
      result.findings.some((finding) => finding.category === "suspicious-link"),
    ).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses a shortener host and its signal", () => {
    const urls = extractUrls("Buka https://bit.ly/abc123 sekarang");
    expect(urls).toHaveLength(1);
    expect(urls[0].host).toBe("bit.ly");
    expect(urls[0].signals).toContain("shortened");
  });
});

describe("analyzeText — risky instructions", () => {
  it("flags moving a transaction off the platform", () => {
    const result = analyzeText(
      "Bayarnya jangan lewat aplikasi ya, transfer langsung ke rekening pribadi saya.",
    );
    expect(
      result.findings.some((finding) => finding.category === "risky-instruction"),
    ).toBe(true);
  });
});