/**
 * Energy estimation for healthy children (method A / B building blocks).
 * Sources: research/data/parameters.json (nasem2023_eer, efsa2013_ar, fao2004, pzh2024).
 */
import type { Activity, Sex } from "./types.js";

const kcalPerMj = 238.8459; // 1 MJ = 238.8459 kcal

const inRange = (v: number, a: number, b: number) => v >= a && v < b;

/**
 * NASEM 2023 Table S-2 "energy cost of growth" addends. The published values step at the age-band
 * boundaries (boys: 200->50 at 3 mo, 50->20 at 6 mo; girls: 180->60, 60->20, 20->15 at 12 mo).
 * Through the weight->age mapping ("healthy child of the same weight") those steps surface as
 * cliffs on the B line right where WHS children live (user report 2026-10-05), so the addend is
 * interpolated linearly across a ±0.5-month window around each boundary. Band interiors keep the
 * exact published values; the crossing itself is smoothed (documented in DECISIONS D-029).
 */
const GROWTH_RAMP_MONTHS = 0.5;

function growthAddend(sex: Sex, ageMonths: number): number {
  const bands: [number, number, number][] = sex === "boys"
    ? [[3, 200, 50], [6, 50, 20]]
    : [[3, 180, 60], [6, 60, 20], [12, 20, 15]];
  let g = bands[0]![1];
  for (const [at, from, to] of bands) {
    if (ageMonths >= at + GROWTH_RAMP_MONTHS) g = to;
    else if (ageMonths > at - GROWTH_RAMP_MONTHS) {
      g = from + ((to - from) * (ageMonths - (at - GROWTH_RAMP_MONTHS))) / (2 * GROWTH_RAMP_MONTHS);
    }
  }
  return g;
}

/** NASEM 2023 EER (Table S-2). age in months here; equations use years. */
export function nasemEer(
  sex: Sex,
  ageMonths: number,
  heightCm: number,
  weightKg: number,
  activity: Activity = "low_active",
): { kcal: number; band: string } | null {
  const age = ageMonths / 12;
  const growth = (() => {
    if (sex === "boys") {
      if (ageMonths < 48) return 20; // 6mo-2.99y and 3y: 20 kcal/d
      if (ageMonths < 108) return 15;
      return 25;
    }
    if (ageMonths < 48) return 15; // girls: 12-35.99 mo and 3y both 15 (Table S-2 footnotes a, c)
    if (ageMonths < 108) return 15;
    return 30;
  })();

  if (inRange(ageMonths, 0, 3)) {
    const base = sex === "boys"
      ? -716.45 - 1.0 * age + 17.82 * heightCm + 15.06 * weightKg
      : -69.15 + 80.0 * age + 2.65 * heightCm + 54.15 * weightKg;
    return { kcal: base + growthAddend(sex, ageMonths), band: "0-2.99mo" };
  }
  if (inRange(ageMonths, 3, 6)) {
    const base = sex === "boys"
      ? -716.45 - 1.0 * age + 17.82 * heightCm + 15.06 * weightKg
      : -69.15 + 80.0 * age + 2.65 * heightCm + 54.15 * weightKg;
    return { kcal: base + growthAddend(sex, ageMonths), band: "3-5.99mo" };
  }
  if (inRange(ageMonths, 6, 35.5)) {
    if (sex === "boys") {
      return { kcal: -716.45 - 1.0 * age + 17.82 * heightCm + 15.06 * weightKg + growthAddend(sex, ageMonths), band: "6mo-2.99y" };
    }
    return { kcal: -69.15 + 80.0 * age + 2.65 * heightCm + 54.15 * weightKg + growthAddend(sex, ageMonths), band: "6mo-2.99y" };
  }
  // Audit L8 (2026-10-07): the 0-2.99y -> 3-13.99y child-equation switch at 36 mo steps the A/B low
  // edges (boys 1227->1169, girls 1186->1069 kcal/day at the WHO reference child). Bridged linearly
  // across a ±0.5-month window, same rationale as the growth-addend seams (D-029).
  const childEqOld = (): number => (sex === "boys"
    ? -716.45 - 1.0 * age + 17.82 * heightCm + 15.06 * weightKg
    : -69.15 + 80.0 * age + 2.65 * heightCm + 54.15 * weightKg);
  const childEqNew = (): number => (sex === "boys"
    ? {
      inactive: -447.51 + 3.68 * age + 13.01 * heightCm + 13.15 * weightKg,
      low_active: 19.12 + 3.68 * age + 8.62 * heightCm + 20.28 * weightKg,
      active: -388.19 + 3.68 * age + 12.66 * heightCm + 20.46 * weightKg,
      very_active: -671.75 + 3.68 * age + 15.38 * heightCm + 23.25 * weightKg,
    }[activity]
    : {
      inactive: 55.59 - 22.25 * age + 8.43 * heightCm + 17.07 * weightKg,
      low_active: -297.54 - 22.25 * age + 12.77 * heightCm + 14.73 * weightKg,
      active: -189.55 - 22.25 * age + 11.74 * heightCm + 18.34 * weightKg,
      very_active: -709.59 - 22.25 * age + 18.22 * heightCm + 14.25 * weightKg,
    }[activity]);
  if (inRange(ageMonths, 35.5, 36.5)) {
    const t = ageMonths - 35.5;
    return { kcal: childEqOld() * (1 - t) + childEqNew() * t + growthAddend(sex, ageMonths), band: "3y-bridge" };
  }
  if (inRange(ageMonths, 36.5, 168)) {
    return { kcal: childEqNew() + growth, band: "3-13.99y" };
  }
  return null;
}

// EFSA 2013 AR summary (kcal/day).
// Infants: month 6 uses the PZH 2024 value (EFSA 2013 AR starts at month 7); months 7-11 are EFSA
// per-month values; month 12 anchors to the children year-1 value. Fractional months are
// interpolated linearly (fixes the earlier fractional-index fallback to NASEM, audit F2).
const EFSA_INFANTS_M6: Record<Sex, number[]> = {
  boys: [597, 636, 661, 688, 725, 742], // months 6..11 (month 6 = PZH 2024)
  girls: [549, 573, 599, 625, 656, 673],
};
const EFSA_CHILD_YEAR1: Record<Sex, number> = { boys: 777, girls: 712 };

const EFSA_CHILDREN: Record<Sex, Record<number, number[]>> = {
  boys: { 1: [777], 2: [1028], 3: [1174], 4: [1256, 1436, 1615], 5: [1332, 1522, 1712], 6: [1409, 1610, 1811], 7: [1497, 1711, 1925], 8: [1592, 1819, 2046], 9: [1684, 1925, 2165], 10: [1933, 2174, 2416], 11: [2043, 2298, 2554], 12: [2174, 2445, 2717], 13: [2333, 2625, 2916], 14: [2513, 2828, 3142], 15: [2699, 3036, 3374], 16: [2845, 3201, 3556], 17: [2940, 3307, 3675] },
  girls: { 1: [712], 2: [946], 3: [1096], 4: [1168, 1335, 1502], 5: [1239, 1417, 1594], 6: [1312, 1500, 1687], 7: [1392, 1591, 1790], 8: [1477, 1688, 1899], 9: [1566, 1790, 2013], 10: [1818, 2046, 2273], 11: [1908, 2146, 2385], 12: [2004, 2255, 2505], 13: [2099, 2361, 2624], 14: [2175, 2447, 2719], 15: [2228, 2507, 2786], 16: [2259, 2542, 2824], 17: [2277, 2562, 2846] },
};

/** EFSA AR at PAL column index (0 -> 1.4; 1 -> 1.6; 2 -> 1.8). */
export function efsaAr(sex: Sex, ageMonths: number, palIndex = 0): number | null {
  if (ageMonths >= 6 && ageMonths < 12) {
    const nodes = [...EFSA_INFANTS_M6[sex], EFSA_CHILD_YEAR1[sex]]; // months 6..12
    const pos = ageMonths - 6;
    const i = Math.min(Math.floor(pos), nodes.length - 2);
    const frac = Math.min(1, Math.max(0, pos - i));
    const a = nodes[i]!;
    const b = nodes[i + 1]!;
    return a + (b - a) * frac;
  }
  if (ageMonths < 12 || ageMonths >= 216) return null;
  const year = ageMonths / 12;
  const loYear = Math.floor(year);
  const hiYear = Math.min(17, loYear + 1);
  const at = (y: number, i: number): number | null => {
    const row = EFSA_CHILDREN[sex][y];
    if (!row) return null;
    const v = row[Math.min(i, row.length - 1)];
    return v ?? null;
  };
  const a = at(loYear, palIndex);
  const b = at(hiYear, palIndex);
  if (a === null) return null;
  if (b === null || hiYear === loYear) return a;
  const t = year - loYear;
  return a + (b - a) * t;
}

// FAO/WHO/UNU 2004 infants (kcal/day) and children (kcal/day).
const FAO_INFANTS: Record<Sex, number[]> = {
  boys: [518, 570, 596, 569, 608, 639, 653, 680, 702, 731, 752, 775],
  girls: [464, 517, 550, 537, 571, 599, 604, 629, 652, 676, 694, 712],
};
const FAO_CHILDREN: Record<Sex, Record<number, number>> = {
  boys: { 1: 948, 2: 1129, 3: 1252, 4: 1360 },
  girls: { 1: 865, 2: 1047, 3: 1156, 4: 1241 },
};

export function faoEnergy(sex: Sex, ageMonths: number): number | null {
  if (ageMonths >= 60) return null;
  // Audit M1 (full detail, 2026-10-07): BOTH FAO tables refer to band MIDPOINTS — the infant Table 3.2
  // values are per monthly band ("11-12" = months 11-12, midpoint m+0.5) and the child Table 4.2 values
  // to the mid-year (§4.4: "median weights at 1.5, 2.5... years"). Nodes: 0.5...11.5 mo (infants) and
  // 18/30/42/54 mo (children); piecewise-linear between them; below 0.5 mo the first value is held.
  // (Earlier fix placed the child anchors at mid-year but left the infant values as step functions and
  // bridged from exactly 12.0 mo, so FAO(12) read 775 instead of ~788.)
  const nodes: [number, number][] = [
    ...FAO_INFANTS[sex].map((v, i): [number, number] => [i + 0.5, v]),
    [18, FAO_CHILDREN[sex][1]!], [30, FAO_CHILDREN[sex][2]!],
    [42, FAO_CHILDREN[sex][3]!], [54, FAO_CHILDREN[sex][4]!],
  ];
  if (ageMonths <= nodes[0]![0]) return nodes[0]![1];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a0 = nodes[i]![0];
    const v0 = nodes[i]![1];
    const a1 = nodes[i + 1]![0];
    const v1 = nodes[i + 1]![1];
    if (ageMonths <= a1) return v0 + (v1 - v0) * ((ageMonths - a0) / (a1 - a0));
  }
  return nodes[nodes.length - 1]![1];
}

/** Holliday-Segar maintenance fluid (ml/day). */
export function hollidaySegar(weightKg: number): number {
  if (weightKg <= 10) return weightKg * 100;
  if (weightKg <= 20) return 1000 + (weightKg - 10) * 50;
  return 1500 + (weightKg - 20) * 20;
}

/**
 * Schofield (1985) REE, kcal/day (EFSA Appendix 13; height in cm).
 *
 * The equation band is selected by BODY SIZE, not the birthday (audit H1, 2026-10-07): the 3-10 y
 * weight+height (WH) forms were fitted on children weighing ~13-35 kg, so applying them to a
 * small-for-age child (e.g. a WHS 3-year-old at ~8.5 kg) inflated BMR by ~40% — C jumped 522->745
 * kcal/day at the 3rd birthday and D/E and the charts jumped with it. `weightAgeMonths` is the age
 * at which the WHO median weight equals this child's weight (computed by the caller from the WHO
 * weight-for-age table; null = weight outside the WHO 0-60 mo table -> calendar-age fallback).
 * The two forms agree within ~0-2% at the crossover weight for a reference-height child, so the
 * switch no longer produces a birthday cliff.
 */
export function schofieldBmrBand(
  sex: Sex,
  ageMonths: number,
  weightKg: number,
  heightCm: number,
  weightAgeMonths: number | null,
): number {
  const H = heightCm / 100;
  const useWeightHeight = weightAgeMonths === null ? ageMonths >= 36 : weightAgeMonths >= 36;
  if (!useWeightHeight) {
    // Schofield WEIGHT-ONLY (W) forms, as tabulated in the ESPGHAN/ESPEN paediatric PN energy
    // guideline (Table 2.1). Switched 2026-10-03 (user report): the weight+height form is nearly
    // weight-independent here (flat C line on the chart). Height intentionally unused in this band.
    return sex === "boys" ? 59.48 * weightKg - 30.33 : 58.29 * weightKg - 31.05;
  }
  if (ageMonths < 120) {
    return sex === "boys"
      ? 19.6 * weightKg + 130.3 * H + 414.9
      : 16.97 * weightKg + 161.8 * H + 371.2;
  }
  return sex === "boys"
    ? 16.25 * weightKg + 137.2 * H + 515.5
    : 8.365 * weightKg + 465 * H + 200;
}

export const energyConst = { kcalPerMj };
