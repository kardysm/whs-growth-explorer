import { describe, expect, it } from "vitest";
import { loadContext } from "./load.js";
import { computeAll } from "./methods.js";
import type { CalcInput } from "./types.js";

const { dataset, whs } = loadContext();
const ctx = { who: dataset.who, whs };

const base: CalcInput = {
  sex: "boys",
  ageMonths: 24,
  weightKg: 9.0,
  lengthCm: 80,
  tone: "hypotonic",
  mobility: "bedridden",
  targetRef: "whs_mean",
  customTargetKg: null,
  horizonWeeks: 12,
  feedDensityKcalPerMl: 1.0,
  feedsPerDay: null,
  mlPerFeed: null,
  actualIntakeKcalPerDay: null,
  actualIntakeMlPerDay: null,
};

describe("full pipeline (representative case)", () => {
  const r = computeAll(base, ctx);

  it("A/B/C produce finite bands", () => {
    for (const m of [r.A, r.B, r.C]) {
      expect(m.kcalPerDay.central).toBeGreaterThan(0);
      expect(m.kcalPerDay.low).toBeLessThanOrEqual(m.kcalPerDay.central!);
      expect(m.kcalPerDay.high).toBeGreaterThanOrEqual(m.kcalPerDay.central!);
    }
  });

  it("C equals Schofield x tone x activity", () => {
    // boys 24mo, w=9.0, h=80cm: 0.167*9 + 1517.4*0.8 - 617.6
    const bmr = 0.167 * 9.0 + 1517.4 * 0.8 - 617.6;
    expect(r.C.kcalPerDay.central!).toBeCloseTo(bmr * 0.9 * 1.15, 3);
  });

  it("WHS reference at 24 months (boys weight mean)", () => {
    expect(r.whsRef.weight["mean"]!).toBeCloseTo(7.4, 1);
  });

  it("D catch-up adds gain x 5 kcal/g", () => {
    const r5 = computeAll({ ...base, weightKg: 7.0, customTargetKg: 9.2, horizonWeeks: 12 }, ctx);
    expect(r5.D.gainPerDayGrams!).toBeCloseTo(((9.2 - 7.0) / (12 * 7)) * 1000, 6);
    const expected = r5.C.kcalPerDay.central! + r5.D.gainPerDayGrams! * 5;
    expect(r5.D.kcalPerDay.central!).toBeCloseTo(expected, 3);
    expect(r5.D.targetKg).toBe(9.2);
  });

  it("E volume ordering and maintenance fluid", () => {
    const mlFor = (d: number) => r.E.byDensity.find((x) => x.density === d)!.mlForC!;
    expect(mlFor(0.67)).toBeGreaterThan(mlFor(1.0));
    expect(mlFor(1.0)).toBeGreaterThan(mlFor(1.5));
    expect(r.E.maintenanceFluidMl).toBe(900); // 9 kg -> 900 ml
  });

  it("F gap analysis with measured intake", () => {
    const r2 = computeAll({ ...base, actualIntakeKcalPerDay: 500 }, ctx);
    expect(r2.F!.percentOfC!).toBeCloseTo((500 / r.C.kcalPerDay.central!) * 100, 6);
  });

  it("guardrail fires for an aggressive catch-up target", () => {
    const r3 = computeAll({ ...base, weightKg: 6, customTargetKg: 12, horizonWeeks: 4 }, ctx);
    expect(r3.D.guardrails.length).toBeGreaterThan(0);
  });

  it("no gain target -> band falls back to C and notes the shortfall", () => {
    const r4 = computeAll({ ...base, customTargetKg: 8.5 }, ctx);
    expect(r4.D.kcalPerDay.central!).toBeCloseTo(r4.C.kcalPerDay.central!, 6);
    expect(r4.D.guardrails.map((g) => g.en).join(" ")).toContain("not above the current weight");
  });

  it("D-2 scenario guardrail fires above the TRS 935 range (audit CS-7)", () => {
    const r6 = computeAll({ ...base, ageMonths: 18, weightKg: 4, lengthCm: 80 }, ctx);
    expect(r6.D.guardrails.some((g) => g.en.includes("D-2"))).toBe(true);
  });

  it("default length follows the WHS chart (audit F1)", () => {
    const r7 = computeAll({ ...base, lengthCm: null }, ctx);
    const whsLen = r7.whsRef.length["mean"]!;
    const bmr = 0.167 * 9.0 + 1517.4 * (whsLen / 100) - 617.6;
    expect(r7.C.kcalPerDay.central!).toBeCloseTo(bmr * 0.9 * 1.15, 3);
    expect(r7.whsZ.weight).not.toBeNull();
  });

  it("month 0-2 boys: C is positive but flagged as below a plausible range (audit R2-1)", () => {
    const r8 = computeAll({ ...base, ageMonths: 0, weightKg: 3, lengthCm: null }, ctx);
    expect(r8.C.kcalPerDay.central).not.toBeNull();
    expect(r8.C.alerts && r8.C.alerts.length).toBeGreaterThan(0);
    const r9 = computeAll({ ...base, ageMonths: 2, weightKg: 4.5, lengthCm: null }, ctx);
    expect(r9.C.alerts && r9.C.alerts.length).toBeGreaterThan(0);
  });

  it("negative-BMR inputs suppress C and D with a visible alert (audit R2-1)", () => {
    const r10 = computeAll({ ...base, ageMonths: 18, weightKg: 8, lengthCm: 30 }, ctx);
    expect(r10.C.kcalPerDay.central).toBeNull();
    expect(r10.C.alerts && r10.C.alerts.length).toBeGreaterThan(0);
    expect(r10.D.kcalPerDay.central).toBeNull();
    expect(r10.D.guardrails.map((g) => g.en).join(" ")).toContain("D withheld");
  });

  it("D-1 per-kg ceiling banner fires above the TRS 935 range (audit R2-6)", () => {
    const r11 = computeAll({ ...base, ageMonths: 18, weightKg: 4, lengthCm: 80 }, ctx);
    expect(r11.D.guardrails.map((g) => g.en).join(" ")).toContain("D-1");
  });

  it("whsZ uses the same-side half-gap (audit R2-4)", () => {
    const r12 = computeAll({ ...base, ageMonths: 18, weightKg: 8, lengthCm: null }, ctx);
    expect(r12.whsZ.weight!).toBeCloseTo(1.66, 1);
  });

  it("girls 18 mo / 8 kg / 30 cm: implausible-range C alert, age-agnostic (audit R3-1)", () => {
    const r13 = computeAll({ ...base, sex: "girls", ageMonths: 18, weightKg: 8, lengthCm: 30 }, ctx);
    expect(r13.C.kcalPerDay.central).not.toBeNull();
    expect(r13.C.alerts && r13.C.alerts.length).toBeGreaterThan(0);
  });

  it("implausible high C per kg is flagged (audit R3-5)", () => {
    const r14 = computeAll({ ...base, ageMonths: 48, weightKg: 2, lengthCm: null }, ctx);
    expect(r14.C.alerts && r14.C.alerts.length).toBeGreaterThan(0);
  });

  it("who_wfl_median target uses WHO median at length", () => {
    const r5 = computeAll({ ...base, targetRef: "who_wfl_median", lengthCm: 62, ageMonths: 10 }, ctx);
    expect(r5.D.targetKg).not.toBeNull();
  });
});

describe("property sweeps", () => {
  it("low <= central <= high and no NaN across a grid", () => {
    for (const sex of ["boys", "girls"] as const) {
      for (let age = 0; age <= 48; age += 12) {
        for (let w = 3; w <= 15; w += 3) {
          const r = computeAll({ ...base, sex, ageMonths: age, weightKg: w }, ctx);
          for (const m of [r.A, r.B, r.C, r.D]) {
            const { low, central, high } = m.kcalPerDay;
            if (central !== null) {
              expect(Number.isFinite(central)).toBe(true);
              if (low !== null) expect(low).toBeLessThanOrEqual(central + 1e-9);
              if (high !== null) expect(high).toBeGreaterThanOrEqual(central - 1e-9);
            }
          }
        }
      }
    }
  });
});
