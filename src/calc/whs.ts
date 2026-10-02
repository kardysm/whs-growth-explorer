/**
 * WHS (Wolf-Hirschhorn) reference lines from the digitized Antonius 2008 charts.
 * Data: src/data/whs_digitized.json (see research/data/whs_growth/provenance.md).
 */
import type { Measure, Sex, WhsDigitizedRow, WhsLine } from "./types.js";

export interface WhsIndex {
  get(sex: Sex, measure: Measure, line: WhsLine, month: number): number | null;
  sd(sex: Sex, measure: Measure, month: number): number | null;
  range(sex: Sex, measure: Measure): [number, number] | null;
}

export function buildWhsIndex(rows: WhsDigitizedRow[]): WhsIndex {
  const map = new Map<string, { m: number; v: number }[]>();
  for (const r of rows) {
    if (r.value === null) continue;
    const key = `${r.sex}|${r.measure}|${r.line}`;
    const arr = map.get(key) ?? [];
    arr.push({ m: r.age_months, v: r.value });
    map.set(key, arr);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.m - b.m);

  const interp = (key: string, month: number): number | null => {
    const arr = map.get(key);
    if (!arr || arr.length === 0) return null;
    if (month < arr[0]!.m || month > arr[arr.length - 1]!.m) return null;
    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i]!;
      const b = arr[i + 1]!;
      if (month >= a.m && month <= b.m) {
        if (b.m === a.m) return a.v;
        return a.v + ((month - a.m) / (b.m - a.m)) * (b.v - a.v);
      }
    }
    return arr[arr.length - 1]!.v;
  };

  return {
    get(sex, measure, line, month) {
      return interp(`${sex}|${measure}|${line}`, month);
    },
    sd(sex, measure, month) {
      const p1 = interp(`${sex}|${measure}|+1SD`, month);
      const m1 = interp(`${sex}|${measure}|-1SD`, month);
      if (p1 === null || m1 === null) return null;
      return (p1 - m1) / 2;
    },
    range(sex, measure) {
      const arr = map.get(`${sex}|${measure}|mean`);
      if (!arr || arr.length === 0) return null;
      return [arr[0]!.m, arr[arr.length - 1]!.m];
    },
  };
}
