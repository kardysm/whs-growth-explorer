/**
 * WHO Child Growth Standards helpers (LMS-based, no external deps).
 * Data: research/data/who_lms/*.json (monthly tables, 0-60 months / 45-120 cm).
 */
import type { Sex, WhoTable } from "./types.js";

export function colIndex(table: WhoTable, name: string): number {
  const i = table.columns.findIndex((c) => c.trim() === name);
  if (i < 0) throw new Error(`column ${name} not found in ${table.indicator}`);
  return i;
}

export function lmsAt(table: WhoTable, anchor: number): { L: number; M: number; S: number } | null {
  const rows = table.rows;
  if (rows.length === 0) return null;
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  if (anchor < first[0]! || anchor > last[0]!) return null;
  const iL = colIndex(table, "L");
  const iM = colIndex(table, "M");
  const iS = colIndex(table, "S");
  // rows are sorted by anchor; linear interpolation between neighbours
  let lo = 0;
  let hi = rows.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (rows[mid]![0]! <= anchor) lo = mid;
    else hi = mid;
  }
  const r0 = rows[lo]!;
  const r1 = rows[hi]!;
  const a0 = r0[0]!;
  const a1 = r1[0]!;
  const t = a1 === a0 ? 0 : (anchor - a0) / (a1 - a0);
  const lerp = (i: number) => r0[i]! + (r1[i]! - r0[i]!) * t;
  return { L: lerp(iL), M: lerp(iM), S: lerp(iS) };
}

/** WHO LMS z-score of a measurement x at a given anchor. */
export function zScore(L: number, M: number, S: number, x: number): number {
  if (L !== 0) return (Math.pow(x / M, L) - 1) / (L * S);
  return Math.log(x / M) / S;
}

/** Inverse: measurement value at a given z, from LMS. */
export function valueForZ(L: number, M: number, S: number, z: number): number {
  if (L !== 0) return M * Math.pow(1 + L * S * z, 1 / L);
  return M * Math.exp(S * z);
}

/** Median (M) at an age/length anchor, linearly interpolated. */
export function medianAt(table: WhoTable, anchor: number): number | null {
  const l = lmsAt(table, anchor);
  return l ? l.M : null;
}

/** Age at which the median weight equals the given weight (inverse of WFA median). */
export function ageForWeight(wfaTable: WhoTable, weightKg: number): number | null {
  const iM = colIndex(wfaTable, "M");
  const rows = wfaTable.rows;
  const first = rows[0]![iM]!;
  const last = rows[rows.length - 1]![iM]!;
  if (weightKg < first || weightKg > last) return null;
  for (let i = 0; i < rows.length - 1; i++) {
    const a0 = rows[i]![0]!;
    const a1 = rows[i + 1]![0]!;
    const m0 = rows[i]![iM]!;
    const m1 = rows[i + 1]![iM]!;
    if ((weightKg >= m0 && weightKg <= m1) || (weightKg <= m0 && weightKg >= m1)) {
      if (m1 === m0) return a0;
      return a0 + ((weightKg - m0) / (m1 - m0)) * (a1 - a0);
    }
  }
  return null;
}

/** Weight-for-age z of a measurement. */
export function weightForAgeZ(table: WhoTable, ageMonths: number, weightKg: number): number | null {
  const l = lmsAt(table, ageMonths);
  return l ? zScore(l.L, l.M, l.S, weightKg) : null;
}

/** Weight-for-length/height z of a measurement (table chosen by caller). */
export function weightForLengthZ(table: WhoTable, lengthCm: number, weightKg: number): number | null {
  const l = lmsAt(table, lengthCm);
  return l ? zScore(l.L, l.M, l.S, weightKg) : null;
}

export function whoTable(ds: Record<string, WhoTable>, key: string): WhoTable {
  const t = ds[key];
  if (!t) throw new Error(`WHO table ${key} missing`);
  return t;
}

/** Convenience: median weight-for-age from dataset. */
export function whoMedianWeightForAge(ds: Record<string, WhoTable>, sex: Sex, ageMonths: number): number | null {
  return medianAt(whoTable(ds, `wfa_${sex}`), ageMonths);
}

/** Convenience: median length/height-for-age. */
export function whoMedianLengthForAge(ds: Record<string, WhoTable>, sex: Sex, ageMonths: number): number | null {
  return medianAt(whoTable(ds, `lhfa_${sex}`), ageMonths);
}
