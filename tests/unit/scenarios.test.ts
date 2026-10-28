import { describe, expect, it } from "vitest";
import {
  SCENARIOS,
  SESSION_MODES,
  createRandom,
  pickSessionScenarios,
  scoreSession,
} from "@/data/scenarios";

describe("bank skenario", () => {
  it("menyediakan sedikitnya 18 skenario utama yang berbeda", () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(18);
    const ids = new Set(SCENARIOS.map((s) => s.id));
    expect(ids.size).toBe(SCENARIOS.length);
  });

  it("tidak memakai ID pilihan sebagai pengganti skenario", () => {
    // Setiap skenario punya minimal 2 pilihan, tetapi jumlah skenario dihitung
    // dari objek skenario, bukan dari total pilihan.
    for (const scenario of SCENARIOS) {
      expect(scenario.options.length).toBeGreaterThanOrEqual(2);
    }
    const totalOptions = SCENARIOS.reduce(
      (sum, s) => sum + s.options.length,
      0,
    );
    expect(totalOptions).toBeGreaterThan(SCENARIOS.length);
  });

  it("setiap skenario punya tepat satu langkah terbaik bernilai 100", () => {
    for (const scenario of SCENARIOS) {
      const best = scenario.options.filter((o) => o.points === 100);
      expect(best, scenario.id).toHaveLength(1);
      expect(
        scenario.options.every((o) => [0, 50, 100].includes(o.points)),
        scenario.id,
      ).toBe(true);
    }
  });

  it("setiap pilihan punya umpan balik dan langkah yang lebih baik", () => {
    for (const scenario of SCENARIOS) {
      for (const option of scenario.options) {
        expect(option.feedback.length, option.id).toBeGreaterThan(20);
        expect(option.betterAction.length, option.id).toBeGreaterThan(20);
        expect(option.rationale.length, option.id).toBeGreaterThan(20);
        if (option.points < 100) {
          expect(option.risk.length, option.id).toBeGreaterThan(10);
        }
      }
    }
  });

  it("setiap skenario merujuk artikel Pustaka yang benar-benar ada", async () => {
    const { LIBRARY } = await import("@/data/resources");
    const slugs = new Set(LIBRARY.map((a) => a.id));
    for (const scenario of SCENARIOS) {
      expect(slugs.has(scenario.article), scenario.id).toBe(true);
    }
  });
});

describe("mode sesi", () => {
  it("menyediakan 5, 10, dan seluruh soal", () => {
    const counts = SESSION_MODES.map((m) => m.count);
    expect(counts).toContain(5);
    expect(counts).toContain(10);
    expect(counts).toContain(SCENARIOS.length);
  });

  it("memilih jumlah soal yang benar tanpa duplikasi", () => {
    for (const mode of SESSION_MODES) {
      const picked = pickSessionScenarios(mode.count, createRandom(7));
      expect(picked).toHaveLength(mode.count);
      const ids = new Set(picked.map((s) => s.id));
      expect(ids.size).toBe(picked.length);
    }
  });

  it("deterministik dengan seed yang sama, berbeda dengan seed lain", () => {
    const a = pickSessionScenarios(5, createRandom(42)).map((s) => s.id);
    const b = pickSessionScenarios(5, createRandom(42)).map((s) => s.id);
    const c = pickSessionScenarios(5, createRandom(43)).map((s) => s.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe("penilaian sesi", () => {
  const perfect = SCENARIOS.slice(0, 3).map((scenario) => ({
    scenario,
    option: scenario.options.find((o) => o.points === 100)!,
  }));

  it("menghitung poin penuh dan persentase", () => {
    const score = scoreSession(perfect);
    expect(score.earned).toBe(300);
    expect(score.max).toBe(300);
    expect(score.percentage).toBe(100);
    expect(score.bestCount).toBe(3);
    expect(score.needsReview).toHaveLength(0);
  });

  it("menghitung poin parsial dan menandainya untuk dipelajari ulang", () => {
    const scenario = SCENARIOS[0];
    const partial = scenario.options.find((o) => o.points === 50)!;
    const score = scoreSession([{ scenario, option: partial }]);
    expect(score.earned).toBe(50);
    expect(score.percentage).toBe(50);
    expect(score.bestCount).toBe(0);
    expect(score.needsReview).toHaveLength(1);
  });

  it("memberi 0 poin untuk tindakan berisiko", () => {
    const scenario = SCENARIOS[0];
    const risky = scenario.options.find((o) => o.points === 0)!;
    const score = scoreSession([{ scenario, option: risky }]);
    expect(score.earned).toBe(0);
    expect(score.percentage).toBe(0);
  });

  it("meringkas skor per kategori", () => {
    const score = scoreSession(perfect);
    const total = score.categories.reduce((sum, c) => sum + c.max, 0);
    expect(total).toBe(score.max);
    for (const category of score.categories) {
      expect(category.max).toBeGreaterThan(0);
    }
  });

  it("menangani sesi kosong tanpa membagi nol", () => {
    const score = scoreSession([]);
    expect(score.earned).toBe(0);
    expect(score.max).toBe(0);
    expect(score.percentage).toBe(0);
  });
});