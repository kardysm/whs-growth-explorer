import { describe, expect, it } from "vitest";
import wfaBoys from "../data/who_lms/wfa_boys.json";
import wflBoys from "../data/who_lms/wfl_boys.json";
import type { WhoTable } from "./types.js";
import { ageForWeight, colIndex, medianAt, valueForZ, weightForAgeZ, weightForLengthZ, zScore } from "./who.js";

const wfa = wfaBoys as unknown as WhoTable;
const wfl = wflBoys as unknown as WhoTable;

describe("WHO LMS helpers", () => {
  it("median at 12 months (boys wfa) equals the WHO M column", () => {
    expect(medianAt(wfa, 12)).toBeCloseTo(9.6479, 3);
  });

  it("z of the median is 0", () => {
    const L = 0.1769, M = 9.6479, S = 0.11169; // approximate values at 12 mo
    expect(zScore(L, M, S, M)).toBeCloseTo(0, 10);
  });

  it("valueForZ(2) matches the SD2 column at 12 months", () => {
    const iL = colIndex(wfa, "L"), iM = colIndex(wfa, "M"), iS = colIndex(wfa, "S");
    const iSD2 = colIndex(wfa, "SD2");
    const row = wfa.rows.find((r) => r[0] === 12)!;
    const v = valueForZ(row[iL]!, row[iM]!, row[iS]!, 2);
    expect(v).toBeCloseTo(row[iSD2]!, 1);
  });

  it("weight-age inversion: 9.6479 kg -> 12 months (boys)", () => {
    expect(ageForWeight(wfa, 9.6479)!).toBeCloseTo(12, 1);
  });

  it("weight-for-age z at the median is 0", () => {
    expect(weightForAgeZ(wfa, 12, 9.6479)!).toBeCloseTo(0, 6);
  });

  it("weight-for-length median at 60.0 cm (boys wfl) from table", () => {
    const iM = colIndex(wfl, "M");
    const row = wfl.rows.find((r) => r[0] === 60)!;
    expect(medianAt(wfl, 60)).toBeCloseTo(row[iM]!, 6);
    expect(weightForLengthZ(wfl, 60, row[iM]!)!).toBeCloseTo(0, 6);
  });

  it("returns null outside the table range", () => {
    expect(medianAt(wfa, 61)).toBeNull();
    expect(ageForWeight(wfa, 1.5)).toBeNull();
  });
});
