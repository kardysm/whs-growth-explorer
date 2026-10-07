import { describe, expect, it } from "vitest";
import { efsaAr, faoEnergy, hollidaySegar, nasemEer, schofieldBmrBand } from "./energy.js";

describe("Holliday-Segar maintenance fluid", () => {
  it("8 kg -> 800 ml", () => expect(hollidaySegar(8)).toBe(800));
  it("15 kg -> 1250 ml", () => expect(hollidaySegar(15)).toBe(1250));
  it("25 kg -> 1600 ml", () => expect(hollidaySegar(25)).toBe(1600));
});

describe("NASEM 2023 EER (hand-calculated)", () => {
  it("boys 12 mo, 75.7 cm, 9.65 kg", () => {
    // -716.45 - 1.00*1 + 17.82*75.7 + 15.06*9.65 + 20
    const v = nasemEer("boys", 12, 75.7, 9.65)!;
    expect(v.kcal).toBeCloseTo(796.85, 1);
    expect(v.band).toBe("6mo-2.99y");
  });

  it("girls 24 mo, 85.7 cm, 11.5 kg", () => {
    // -69.15 + 80*2 + 2.65*85.7 + 54.15*11.5 + 15
    const v = nasemEer("girls", 24, 85.7, 11.5)!;
    expect(v.kcal).toBeCloseTo(955.72, 1);
  });

  it("boys 1 mo, 54.7 cm, 4.5 kg", () => {
    // -716.45 - 1.00*(1/12) + 17.82*54.7 + 15.06*4.5 + 200
    const v = nasemEer("boys", 1, 54.7, 4.5)!;
    const expected = -716.45 - 1 / 12 + 17.82 * 54.7 + 15.06 * 4.5 + 200;
    expect(v.kcal).toBeCloseTo(expected, 6);
  });
});

describe("EFSA AR table lookups", () => {
  it("boys 7 mo -> 636 kcal/day", () => expect(efsaAr("boys", 7)).toBe(636));
  it("girls 11 mo -> 673 kcal/day", () => expect(efsaAr("girls", 11)).toBe(673));
  it("boys 12 mo -> 777 kcal/day", () => expect(efsaAr("boys", 12)).toBe(777));
  it("boys 6 mo -> 597 kcal/day (PZH 2024 month-6 value)", () => expect(efsaAr("boys", 6)).toBe(597));
  it("girls 6 mo -> 549 kcal/day (PZH 2024)", () => expect(efsaAr("girls", 6)).toBe(549));
  it("fractional month 7.638 interpolates 636..661 -> 651.95 (audit F2 fix)", () => expect(efsaAr("boys", 7.638)!).toBeCloseTo(651.95, 1));
  it("girls 30 mo interpolates 946..1096 -> 1021 (audit F3 fix)", () => expect(efsaAr("girls", 30)!).toBeCloseTo(1021, 3));
  it("null below 6 months", () => expect(efsaAr("boys", 5)).toBeNull());
});

describe("FAO/WHO/UNU 2004 lookups (child values anchored at mid-year — audit M1)", () => {
  it("boys 0-1 mo bin -> 518", () => expect(faoEnergy("boys", 0)).toBe(518));
  it("girls 4-5 mo bin -> 571", () => expect(faoEnergy("girls", 4)).toBe(571));
  it("girls 5-6 mo bin -> 599", () => expect(faoEnergy("girls", 5)).toBe(599));
  it("girls 11-12 mo bin -> 712 (audit F5 fix)", () => expect(faoEnergy("girls", 11)).toBe(712));
  it("boys 12 mo -> 775 (month-12 infant value; no jump at the 1st birthday)", () => {
    expect(faoEnergy("boys", 12)!).toBeCloseTo(775, 6);
  });
  it("boys 18 mo -> 948 exactly (FAO mid-year anchor)", () => {
    expect(faoEnergy("boys", 18)!).toBeCloseTo(948, 6);
  });
  it("boys 24 mo -> 1038.5 (mid-way 18->30)", () => {
    expect(faoEnergy("boys", 24)!).toBeCloseTo(1038.5, 1);
  });
  it("boys 30 mo -> 1129 (next mid-year anchor)", () => {
    expect(faoEnergy("boys", 30)!).toBeCloseTo(1129, 6);
  });
  it("girls 18 mo -> 865; girls 36 mo -> 1101.5 (mid-way 30->42)", () => {
    expect(faoEnergy("girls", 18)!).toBeCloseTo(865, 6);
    expect(faoEnergy("girls", 36)!).toBeCloseTo(1047 + (1156 - 1047) * 0.5, 6);
  });
  it("continuity at 12 mo: |fao(11.99) - fao(12.01)| < 6 kcal (was a 173 kcal step)", () => {
    expect(Math.abs(faoEnergy("boys", 11.99)! - faoEnergy("boys", 12.01)!)).toBeLessThan(6);
  });
});

describe("Schofield BMR (ESPGHAN/ESPEN tables; form chosen by weight-age — audit H1)", () => {
  it("boys 24 mo, 9.65 kg (weight-age ~12): weight-only (W) form", () => {
    // 59.48*9.65 - 30.33
    const v = schofieldBmrBand("boys", 24, 9.65, 75.7, 12);
    expect(v).toBeCloseTo(59.48 * 9.65 - 30.33, 3);
  });
  it("girls 24 mo, 9.0 kg (weight-age ~11): weight-only (W) form", () => {
    const v = schofieldBmrBand("girls", 24, 9.0, 74.0, 11);
    expect(v).toBeCloseTo(58.29 * 9.0 - 31.05, 3);
  });
  it("small-for-age child at 40 mo stays on the W form while weight-age < 36 (audit H1)", () => {
    // WHS-typical: 40 mo, 8.65 kg -> weight-age ~8.5 mo; the old calendar rule inflated this by ~40%
    const v = schofieldBmrBand("boys", 40, 8.646, 80.9, 8.5);
    expect(v).toBeCloseTo(59.48 * 8.646 - 30.33, 3);
  });
  it("weight+height (WH) form once weight-age >= 36 (boys 48 mo, 15 kg, 100 cm)", () => {
    const v = schofieldBmrBand("boys", 48, 15.0, 100, 37);
    expect(v).toBeCloseTo(19.6 * 15.0 + 130.3 * 1.0 + 414.9, 3);
  });
  it("null weight-age (outside the WHO table) falls back to the calendar-age boundary", () => {
    expect(schofieldBmrBand("boys", 30, 5, 60, null)).toBeCloseTo(59.48 * 5 - 30.33, 3);
    expect(schofieldBmrBand("boys", 40, 16, 100, null)).toBeCloseTo(19.6 * 16 + 130.3 * 1.0 + 414.9, 3);
  });
});
