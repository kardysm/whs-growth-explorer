/** Shared types for the calculation model (GOAL.md §4). */

export type Sex = "boys" | "girls";
export type Measure = "weight" | "length";
export type WhsLine = "+2SD" | "+1SD" | "mean" | "-1SD" | "-2SD";
export type Tone = "hypotonic" | "normal" | "hypertonic";
export type Mobility = "bedridden" | "dependent" | "crawling" | "ambulatory";
export type Activity = "inactive" | "low_active" | "active" | "very_active";

export interface Band {
  low: number | null;
  central: number | null;
  high: number | null;
}

/** Bilingual calculator note / warning string (PL primary, EN secondary). */
export interface CalcNote {
  pl: string;
  en: string;
}

export interface MethodResult {
  id: string;
  label: string;
  kcalPerDay: Band;
  sourceIds: string[];
  notes: CalcNote[];
  /** Visible safety/validity alerts (rendered as banners, audit R2-1). */
  alerts?: CalcNote[];
}

export interface CalcInput {
  sex: Sex;
  ageMonths: number;
  weightKg: number;
  lengthCm: number | null;
  tone: Tone;
  mobility: Mobility;
  /** Reference line for target weight / catch-up. */
  targetRef: "whs_mean" | "whs_minus1sd" | "who_wfl_median";
  /** Custom target weight in kg overrides targetRef when set. */
  customTargetKg: number | null;
  horizonWeeks: number;
  /** Energy densities for the milk / meals split (user request 2026-10-05). */
  milkDensityKcalPerMl: number;
  mealDensityKcalPerG: number;
  milkMlPerDay: number;
  feedsPerDay: number | null;
  mlPerFeed: number | null;
  actualIntakeKcalPerDay: number | null;
  actualIntakeMlPerDay: number | null;
}

export interface WhoTable {
  source: string;
  indicator: string;
  sex: Sex;
  axis: "age_months" | "length_cm" | "height_cm";
  columns: string[];
  rows: number[][];
}

export interface WhsDigitizedRow {
  sex: Sex;
  measure: Measure;
  age_months: number;
  line: WhsLine;
  value: number | null;
  est_error: number | null;
}

export interface Dataset {
  who: Record<string, WhoTable>;
  whs: WhsDigitizedRow[];
}
