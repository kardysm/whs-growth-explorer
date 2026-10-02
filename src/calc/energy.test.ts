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

describe("FAO/WHO/UNU 2004 lookups", () => {
  it("boys 0-1 mo bin -> 518", () => expect(faoEnergy("boys", 0)).toBe(518));
  it("girls 4-5 mo bin -> 571", () => expect(faoEnergy("girls", 4)).toBe(571));
  it("girls 5-6 mo bin -> 599", () => expect(faoEnergy("girls", 5)).toBe(599));
  it("boys 18 mo interpolates 948..1129 -> 1038.5", () => expect(faoEnergy("boys", 18)!).toBeCloseTo(1038.5, 1));
  it("girls 11-12 mo bin -> 712 (audit F5 fix)", () => expect(faoEnergy("girls", 11)).toBe(712));
});

describe("Schofield 1985 (weight+height, EFSA Appendix 13)", () => {
  it("boys 24 mo, 9.65 kg, 75.7 cm", () => {
    // 0.167*9.65 + 1517.4*0.757 - 617.6
    const v = schofieldBmrBand("boys", 24, 9.65, 75.7);
    expect(v).toBeCloseTo(0.167 * 9.65 + 1517.4 * 0.757 - 617.6, 3);
  });
  it("girls 24 mo, 9.0 kg, 74.0 cm", () => {
    const v = schofieldBmrBand("girls", 24, 9.0, 74.0);
    expect(v).toBeCloseTo(16.25 * 9.0 + 1023.2 * 0.74 - 413.5, 3);
  });
});
