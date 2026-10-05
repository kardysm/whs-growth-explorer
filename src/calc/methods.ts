/**
 * Full calculation pipeline (GOAL.md §4): methods A-F.
 * Pure functions; all constants from research/data/parameters.json (sourced).
 * Notes/guardrails are bilingual ({pl, en}) — rendered per UI language.
 */
import {
  efsaAr, faoEnergy, hollidaySegar, nasemEer, schofieldBmrBand,
} from "./energy.js";
import type { Band, CalcInput, CalcNote, MethodResult, Sex, WhsLine } from "./types.js";
import type { WhsIndex } from "./whs.js";
import { ageForWeight, medianAt, whoTable } from "./who.js";
import type { WhoTable } from "./types.js";

export interface CalcContext {
  who: Record<string, WhoTable>;
  whs: WhsIndex;
}

const TONE = { hypotonic: 0.9, normal: 1.0, hypertonic: 1.1 } as const;
const ACTIVITY = { bedridden: 1.15, dependent: 1.2, crawling: 1.25, ambulatory: 1.3 } as const;

/** Bilingual note helper. */
const N = (pl: string, en: string): CalcNote => ({ pl, en });

/** Length default when the user gives no length: WHS mean length for age (digitized, Antonius 2008).
 * Falls back to the WHO median only if the WHS line is unavailable. */
function defaultLengthCm(sex: Sex, ageMonths: number, ctx: CalcContext): { cm: number | null; source: "whs" | "who" | "none" } {
  const whs = ctx.whs.get(sex, "length", "mean", Math.min(ageMonths, 48));
  if (whs !== null) return { cm: whs, source: "whs" };
  const who = medianAt(whoTable(ctx.who, `lhfa_${sex}`), ageMonths);
  if (who !== null) return { cm: who, source: "who" };
  return { cm: null, source: "none" };
}

/**
 * Central value for the healthy reference (A/B). The primary source switches from NASEM to EFSA
 * at 6 months (EFSA/PZH start at month 6); the two families differ by ~30 kcal/d there, which made
 * the A/B line step (user report on the B line, 2026-10-05). Across a ±0.5-month window around the
 * switch the two values are blended linearly; below/above the window the primary source is used
 * exactly (D-029). In the lower half of the window EFSA is clamped at its month-6 value.
 */
const HANDOVER_MONTHS = 6;
const HANDOVER_RAMP = 0.5;

function centralHealthy(sex: Sex, ageMonths: number, primary: number | null, nasemKcal: number | null): number | null {
  if (nasemKcal !== null && ageMonths > HANDOVER_MONTHS - HANDOVER_RAMP && ageMonths < HANDOVER_MONTHS + HANDOVER_RAMP) {
    const eAt = primary !== null ? primary : efsaAr(sex, HANDOVER_MONTHS);
    if (eAt !== null) {
      const t = (ageMonths - (HANDOVER_MONTHS - HANDOVER_RAMP)) / (2 * HANDOVER_RAMP);
      return (1 - t) * nasemKcal + t * eAt;
    }
  }
  return primary ?? nasemKcal;
}

function healthyEstimate(sex: Sex, ageMonths: number, ctx: CalcContext): { band: Band; ids: string[]; note: CalcNote | null } {
  const w = medianAt(whoTable(ctx.who, `wfa_${sex}`), ageMonths);
  const h = medianAt(whoTable(ctx.who, `lhfa_${sex}`), ageMonths);
  if (w === null || h === null) {
    return { band: { low: null, central: null, high: null }, ids: [], note: N("Wiek poza zakresem siatek WHO 0–60 mies.", "Age beyond the WHO 0-60 mo tables.") };
  }
  const primary = efsaAr(sex, ageMonths, 0);
  const nasem = nasemEer(sex, ageMonths, h, w);
  const fao = faoEnergy(sex, ageMonths);
  const vals: number[] = [];
  if (primary !== null) vals.push(primary);
  if (nasem) vals.push(nasem.kcal);
  if (fao !== null) vals.push(fao);
  // In the lower half of the 6-month handover window EFSA is not published yet; anchor its month-6
  // value into the band edges so the blended central value stays within [low, high].
  if (primary === null && nasem && ageMonths > HANDOVER_MONTHS - HANDOVER_RAMP && ageMonths < HANDOVER_MONTHS) {
    const e6 = efsaAr(sex, HANDOVER_MONTHS);
    if (e6 !== null) vals.push(e6);
  }
  const central = centralHealthy(sex, ageMonths, primary, nasem ? nasem.kcal : null);
  const band: Band = {
    low: vals.length ? Math.min(...vals) : null,
    central,
    high: vals.length ? Math.max(...vals) : null,
  };
  let note: CalcNote | null = null;
  if (central !== null && band.low !== null && band.high !== null && Math.abs(band.high - band.low) / central > 0.05) {
    note = N("Metody różnią się o więcej niż 5% — pokazano obie wartości.", "Methods differ by more than 5% — both values shown.");
  }
  if (primary === null) {
    note = N("Brak wartości EFSA/PZH poniżej 6. mies.; użyto NASEM 2023.", "EFSA/PZH AR not published below 6 months; NASEM 2023 used.");
  }
  return { band, ids: ["efsa_energy", "pzh2024", "nasem2023", "fao2004"], note };
}

export interface CatchUpResult extends MethodResult {
  targetKg: number | null;
  gainPerDayGrams: number | null;
  targetNote: CalcNote | null;
  method2: MethodResult;
  proteinGPerKgPerDay: number | null;
  proteinGPerDay: number | null;
  guardrails: CalcNote[];
}

export interface CalcResult {
  weightAgeMonths: number | null;
  whsRef: {
    weight: Partial<Record<WhsLine, number | null>>;
    length: Partial<Record<WhsLine, number | null>>;
  };
  /** Approximate standard-deviation position on the digitized WHS weight/length charts. */
  whsZ: { weight: number | null; length: number | null };
  A: MethodResult;
  B: MethodResult;
  C: MethodResult;
  heightBased: { kcalPerDay: number | null; kcalPerCmPerDay: number | null; note: CalcNote };
  percentOfA: number | null;
  percentOfB: number | null;
  D: CatchUpResult;
  E: {
    byDensity: { density: number; mlForC: number | null; mlForD: number | null }[];
    maintenanceFluidMl: number;
    volumeFlags: CalcNote[];
  };
  F: { percentOfC: number | null; percentOfD: number | null; note: CalcNote } | null;
}

export function computeAll(input: CalcInput, ctx: CalcContext): CalcResult {
  const { sex, ageMonths, weightKg } = input;

  // --- A: healthy, same age ---
  const a = healthyEstimate(sex, ageMonths, ctx);
  const A: MethodResult = { id: "A", label: "healthy_same_age", kcalPerDay: a.band, sourceIds: a.ids, notes: a.note ? [a.note] : [] };

  // --- B: healthy, same weight (weight-age) ---
  const weightAge = ageForWeight(whoTable(ctx.who, `wfa_${sex}`), weightKg);
  let B: MethodResult;
  if (weightAge === null) {
    B = { id: "B", label: "healthy_same_weight", kcalPerDay: { low: null, central: null, high: null }, sourceIds: [], notes: [N("Wprowadzona masa poza zakresem siatek WHO 0–60 mies. (masa do wieku).", "Entered weight outside the WHO 0-60 mo weight-for-age range.")] };
  } else {
    const b = healthyEstimate(sex, weightAge, ctx);
    B = {
      id: "B", label: "healthy_same_weight", kcalPerDay: b.band, sourceIds: b.ids,
      notes: [N(`wiek masowy = ${weightAge.toFixed(1).replace(".", ",")} mies.`, `weight-age = ${weightAge.toFixed(1)} months`), ...(b.note ? [b.note] : [])],
    };
  }

  // --- C: WHS hypotonic maintenance (Krick-type) ---
  // Default length when none is entered: WHS mean length for age (digitized Antonius 2008) — the same
  // assumption used for the precomputed chart/table (audit F1: previously a healthy WHO median length,
  // which overstated C by 26-64% for a WHS-typical child).
  const heightSubstituted = input.lengthCm === null;
  const dLen = defaultLengthCm(sex, ageMonths, ctx);
  const height = input.lengthCm ?? dLen.cm ?? 0;
  const bmr = height > 0 ? schofieldBmrBand(sex, ageMonths, weightKg, height) : 0;
  const tone = TONE[input.tone];
  const act = ACTIVITY[input.mobility];
  // Round-2 audit R2-1: validity guard — the Schofield height form collapses (or can go negative) at
  // implausible short lengths / very young ages; suppress and warn instead of showing impossible values.
  const cAlerts: CalcNote[] = [];
  const cValid = bmr > 0 && Number.isFinite(bmr);
  const cLow = cValid ? bmr * 0.9 * act : null;
  const cCentral = cValid ? bmr * tone * act : null;
  const cHigh = cValid ? bmr * 1.1 * act : null;
  if (!cValid) {
    cAlerts.push(N("Model poza zakresem dla podanych danych (BMR ≤ 0) — nie podajemy wartości; sprawdź długość i masę ciała i oprzyj się na A/B oraz ocenie klinicznej.", "Model out of range for these inputs (BMR <= 0) — values withheld; check length and weight and rely on A/B plus clinical assessment."));
  } else if (cCentral !== null && (cCentral / weightKg < 30 || cCentral / weightKg > 250)) {
    // Plausibility guard (R2-1/R3-1 lineage; retuned 2026-10-03 after the weight-only Schofield switch):
    // per-kg bounds only — the old 0.5xA term over-fired for WHS-typical small-for-age weights.
    cAlerts.push(N(`Wartość C (${Math.round(cCentral)} kcal/24h ≈ ${Math.round(cCentral / weightKg)} kcal/kg) poza zakresem fizjologicznym (~30–250 kcal/kg) — sprawdź masę ciała i wiek. NIE używaj C jako celu żywienia bez konsultacji; oprzyj się na A/B i ocenie klinicznej.`, `C (${Math.round(cCentral)} kcal/day ≈ ${Math.round(cCentral / weightKg)} kcal/kg) is outside a physiological range (~30-250 kcal/kg) — check weight and age. Do NOT use C as a feeding target without consultation; rely on A/B and clinical assessment.`));
  }
  const C: MethodResult = {
    id: "C",
    label: "whs_maintenance_krick",
    kcalPerDay: { low: cLow, central: cCentral, high: cHigh },
    sourceIds: ["ni2009_sullivan", "krick1992", "schofield1985", "efsa_energy"],
    alerts: cAlerts.length ? cAlerts : undefined,
    notes: [
      N("Typ Krick: BMR (Schofield — forma wagowa dla 0–3 lat, masa+wzrost od 3 lat) × napięcie mięśniowe × aktywność; pierwotny BMR Kricka opierał się na BSA (udokumentowane odstępstwo).", "Krick-type: BMR (Schofield — weight-only form for 0-3 y, weight+height from 3 y) x tone x activity; Krick's original BMR was BSA-based (documented deviation)."),
      N(`czynnik napięcia: ${String(tone).replace(".", ",")}; czynnik aktywności: ${String(act).replace(".", ",")}`, `tone factor ${tone}; activity factor ${act}`),
      ...(heightSubstituted
        ? [dLen.source === "whs"
            ? N("Nie podano długości — przyjęto średnią długość dla wieku z siatki WHS (zdigitalizowanej, Antonius 2008); ta sama zasada obowiązuje w tabeli i na wykresie.", "Length not provided — WHS mean length for age used (digitized, Antonius 2008); the same assumption applies to the table and chart.")
            : N("Nie podano długości — przyjęto medianę długości WHO dla wieku (siatka WHS niedostępna dla tego wieku).", "Length not provided — WHO median length for age used (WHS chart unavailable for this age).")]
        : []),
      N("Wartości niskie/wysokie obejmują pasmo czynnika napięcia mięśniowego (0,9–1,1).", "Low/high values span the muscle-tone factor range (0.9-1.1)."),
      N("Dla 0–3 lat forma wagowa Schofielda (W): BMR = 59,48 × masa − 30,33 (chłopcy) / 58,29 × masa − 31,05 (dziewczynki); od 3. roku życia forma masa+wzrost (WH). Źródło: wytyczne ESPGHAN/ESPEN.", "Ages 0-3 y use the Schofield weight-only (W) form: BMR = 59.48 × weight − 30.33 (boys) / 58.29 × weight − 31.05 (girls); from age 3 y the weight+height (WH) form. Source: ESPGHAN/ESPEN guideline."),
    ],
  };

  // height-based (Culley) - gated to age >= 12 months
  let heightBased: CalcResult["heightBased"];
  if (ageMonths >= 12) {
    const kcalPerCm = (input.mobility === "bedridden" || input.mobility === "dependent") ? 11.1 : 13.9;
    heightBased = {
      kcalPerDay: kcalPerCm * height,
      kcalPerCmPerDay: kcalPerCm,
      note: N(
        "Typ Culley (wartość wg wzrostu, jak w Sullivan 2009; tekst pierwotny niedostępny). Zakres w literaturze pediatrycznej NI: ok. 6–15 kcal/cm zależnie od funkcji motorycznej. Mapowanie: leżące/zależne → 11,1; raczkujące/samodzielne → 13,9 kcal/cm.",
        "Culley-type height-based value (as tabulated in Sullivan 2009; primary text inaccessible). Range across paediatric NI literature: approx 6-15 kcal/cm depending on motor function. Mapping: bedridden/dependent -> 11.1; crawling/ambulatory -> 13.9 kcal/cm.",
      ),
    };
  } else {
    heightBased = {
      kcalPerDay: null, kcalPerCmPerDay: null,
      note: N("Nie pokazywane poniżej 12. mies.: zakres wieku pochodzenia tej metody jest niejasny dla niemowląt.", "Hidden below 12 months: the derivation age range of this method is unclear for infants."),
    };
  }

  const cForPct = cCentral !== null && cCentral > 0 ? cCentral : null;
  const percentOfA = cForPct !== null && A.kcalPerDay.central ? (cForPct / A.kcalPerDay.central) * 100 : null;
  const percentOfB = cForPct !== null && B.kcalPerDay.central ? (cForPct / B.kcalPerDay.central) * 100 : null;

  // --- D: catch-up ---
  const horizonMonths = (input.horizonWeeks * 7) / 30.4375;
  const targetMonth = ageMonths + horizonMonths;
  let targetKg: number | null = null;
  let targetNote: CalcNote | null = null;
  const line: WhsLine | null = input.targetRef === "whs_mean" ? "mean" : input.targetRef === "whs_minus1sd" ? "-1SD" : null;
  if (input.customTargetKg !== null) {
    targetKg = input.customTargetKg;
    targetNote = N("cel niestandardowy (wpisany ręcznie)", "custom target (entered manually)");
  } else if (line) {
    targetKg = ctx.whs.get(sex, "weight", line, Math.min(targetMonth, 48));
    if (targetKg === null) targetNote = N("siatka WHS jest zdigitalizowana tylko dla 0–48 mies.", "the WHS chart is digitized for 0-48 months only");
    if (targetMonth > 48 && targetKg !== null) targetNote = N("cel ograniczono do 48. mies. (zakres digitalizacji)", "target clamped to 48 months (digitized range)");
  } else {
    // WHO weight-for-length median ideal weight (method 2 uses it directly)
    const len = input.lengthCm;
    if (len !== null) {
      const tbl = ageMonths < 24 ? whoTable(ctx.who, `wfl_${sex}`) : whoTable(ctx.who, `wfh_${sex}`);
      targetKg = medianAt(tbl, len);
      targetNote = N("masa docelowa = mediana WHO (masa do długości/wzrostu) przy obecnej długości", "ideal weight = WHO weight-for-length/height median at current length");
    } else {
      targetNote = N("potrzebna długość, aby wyliczyć medianę masy do długości (WHO)", "needs length to compute the WHO weight-for-length median");
    }
  }
  const days = input.horizonWeeks * 7;
  const gainPerDay = targetKg !== null ? ((targetKg - weightKg) / days) * 1000 : null; // g/day
  const costLow = 4.1, costCentral = 5.0, costHigh = 6.0;
  const dPrice = (cost: number): Band => ({
    low: C.kcalPerDay.low !== null && gainPerDay !== null ? C.kcalPerDay.low + gainPerDay * cost : null,
    central: C.kcalPerDay.central !== null && gainPerDay !== null ? C.kcalPerDay.central + gainPerDay * cost : null,
    high: C.kcalPerDay.high !== null && gainPerDay !== null ? C.kcalPerDay.high + gainPerDay * cost : null,
  });
  const dBand = gainPerDay !== null && gainPerDay > 0
    ? { low: dPrice(costLow).low, central: dPrice(costCentral).central, high: dPrice(costHigh).high }
    : { low: C.kcalPerDay.low, central: C.kcalPerDay.central, high: C.kcalPerDay.high };

  // method 2 (weight-age x ideal weight)
  let method2: MethodResult;
  {
    const wa = ageForWeight(whoTable(ctx.who, `wfa_${sex}`), weightKg);
    const ideal = (() => {
      if (input.lengthCm !== null) {
        const tbl = ageMonths < 24 ? whoTable(ctx.who, `wfl_${sex}`) : whoTable(ctx.who, `wfh_${sex}`);
        return medianAt(tbl, input.lengthCm);
      }
      return null;
    })();
    if (wa === null || ideal === null) {
      method2 = { id: "D2", label: "catchup_weight_age_x_ideal", kcalPerDay: { low: null, central: null, high: null }, sourceIds: [], notes: [N("wymaga masy w zakresie WHO oraz podanej długości", "needs weight within WHO range and length provided")] };
    } else {
      const wWa = medianAt(whoTable(ctx.who, `wfa_${sex}`), wa)!;
      const hWa = medianAt(whoTable(ctx.who, `lhfa_${sex}`), wa)!;
      const eerWa = nasemEer(sex, wa, hWa, wWa);
      const kcalPerKg = eerWa ? eerWa.kcal / wWa : null;
      const total = kcalPerKg !== null ? kcalPerKg * ideal : null;
      method2 = {
        id: "D2",
        label: "catchup_weight_age_x_ideal",
        kcalPerDay: { low: total, central: total, high: total },
        sourceIds: ["who_standards_wfa", "nasem2023", "efsa_energy"],
        notes: [
          N("Wartość scenariuszowa — pojedyncza liczba, nie pasmo; cel = masa odpowiednia do długości.", "Scenario value — a single number, not a range; target = weight appropriate for length."),
          N(`kcal/kg w wieku masowym (${wa.toFixed(1).replace(".", ",")} mies.): ${kcalPerKg !== null ? kcalPerKg.toFixed(1).replace(".", ",") : "n/d"}`, `kcal/kg at weight-age (${wa.toFixed(1)} mo): ${kcalPerKg !== null ? kcalPerKg.toFixed(1) : "n/a"}`),
          N(`masa idealna (mediana WHO dla długości ${input.lengthCm} cm): ${ideal.toFixed(2).replace(".", ",")} kg`, `ideal weight (WHO median at length ${input.lengthCm} cm): ${ideal.toFixed(2)} kg`),
          N(`= ${total !== null ? total.toFixed(0) : "n/d"} kcal/dzień; na kg aktualnej masy: ${total !== null ? (total / weightKg).toFixed(1).replace(".", ",") : "n/d"} kcal/kg`, `= ${total !== null ? total.toFixed(0) : "n/a"} kcal/day; per kg actual weight: ${total !== null ? (total / weightKg).toFixed(1) : "n/a"} kcal/kg`),
        ],
      };
    }
  }

  // protein for catch-up from TRS935 Table 38 interpolation
  let proteinPerKg: number | null = null;
  if (gainPerDay !== null && gainPerDay > 0) {
    const rate = (gainPerDay / weightKg); // g/kg/day
    const table = [{ g: 1, p: 1.02 }, { g: 2, p: 1.22 }, { g: 5, p: 1.82 }, { g: 10, p: 2.82 }, { g: 20, p: 4.82 }];
    const clampRate = Math.min(20, Math.max(1, rate));
    for (let i = 0; i < table.length - 1; i++) {
      const a = table[i]!, b = table[i + 1]!;
      if (clampRate >= a.g && clampRate <= b.g) {
        proteinPerKg = a.p + ((clampRate - a.g) / (b.g - a.g)) * (b.p - a.p);
        break;
      }
    }
  }
  const guardrails: CalcNote[] = [];
  if (gainPerDay !== null && gainPerDay > 0) {
    const rate = gainPerDay / weightKg;
    if (rate > 20) guardrails.push(N("Tempo doganiania powyżej ~20 g/kg/d (limit „optymalnych warunków” wg FAO) — nie zaczynaj od tego poziomu; zwiększaj stopniowo pod nadzorem.", "Catch-up rate above ~20 g/kg/day (FAO optimal-conditions ceiling) — do not start at this level; titrate under supervision."));
    else if (rate > 10) guardrails.push(N("Tempo doganiania powyżej ~10 g/kg/d — ściśle monitoruj tolerancję.", "Catch-up rate above ~10 g/kg/day — monitor tolerance closely."));
  }
  if (gainPerDay !== null && gainPerDay <= 0) guardrails.push(N("Masa docelowa nie przewyższa obecnej dla wybranego horyzontu/odniesienia — metoda D równa się C (bez doganiania).", "Target weight is not above the current weight for the chosen horizon/reference — method D equals C (no catch-up)."));
  // D-2 specific guardrail (audit CS-7): a scenario value above the TRS 935 table range must be flagged visibly.
  if (method2.kcalPerDay.central !== null) {
    const perKgActual = method2.kcalPerDay.central / weightKg;
    if (perKgActual > 167) {
      guardrails.push(N(
        `Metoda D-2 (scenariusz): ~${perKgActual.toFixed(0)} kcal/kg aktualnej masy — powyżej górnego zakresu tabeli TRS 935 (~167 kcal/kg/d dla składu 73:27). Nie zaczynaj od tego poziomu; to wartość orientacyjna do stopniowego dochodzenia pod nadzorem.`,
        `Method D-2 (scenario): ~${perKgActual.toFixed(0)} kcal/kg actual weight — above the TRS 935 upper range (~167 kcal/kg/day for 73:27 composition). Do not start at this level; an orientation value for gradual titration under supervision.`,
      ));
    }
  }
  // D-1 per-kg ceiling (audit R2-6 suggestion): visible banner above the TRS 935 upper range.
  if (dBand.central !== null) {
    const perKgD1 = dBand.central / weightKg;
    if (perKgD1 > 167) {
      guardrails.push(N(
        `Metoda D-1: ~${perKgD1.toFixed(0)} kcal/kg aktualnej masy — powyżej górnego zakresu tabeli TRS 935 (~167 kcal/kg/d dla składu 73:27). Zwiększaj stopniowo, pod nadzorem.`,
        `Method D-1: ~${perKgD1.toFixed(0)} kcal/kg actual weight — above the TRS 935 upper range (~167 kcal/kg/day for 73:27 composition). Titrate gradually, under supervision.`,
      ));
    }
  }
  if (C.kcalPerDay.central === null) {
    guardrails.push(N("D pominięte: C jest poza zakresem modelu dla tych danych (patrz karta C).", "D withheld: C is out of the model's range for these inputs (see card C)."));
  }

  const D: CatchUpResult = {
    id: "D", label: "catchup_tissue_deposition",
    kcalPerDay: dBand, sourceIds: ["fao2004", "who_protein2007", "ni2009_sullivan"],
    notes: [
      N(`cel: ${targetKg !== null ? targetKg.toFixed(2).replace(".", ",") + " kg" : "n/d"} w ${input.horizonWeeks} tygodni (${gainPerDay !== null ? gainPerDay.toFixed(1).replace(".", ",") + " g/dzień" : "n/d"})`, `target: ${targetKg !== null ? targetKg.toFixed(2) + " kg" : "n/a"} over ${input.horizonWeeks} weeks (${gainPerDay !== null ? gainPerDay.toFixed(1) + " g/day" : "n/a"})`),
      N("koszt energetyczny przyrostu tkanek: 4,1 / 5,0 / 6,0 kcal/g (dolne = brutto typowe wg TRS 935, środkowe = zalecenie FAO, górne = brutto wysokotłuszczowe wg TRS 935)", "energy cost of tissue gain: 4.1 / 5.0 / 6.0 kcal/g (low = TRS 935 gross typical, central = FAO recommendation, high = TRS 935 gross high-fat)"),
      ...(targetNote ? [targetNote] : []),
    ],
    targetKg, gainPerDayGrams: gainPerDay, targetNote, method2,
    proteinGPerKgPerDay: proteinPerKg,
    proteinGPerDay: proteinPerKg !== null ? proteinPerKg * weightKg : null,
    guardrails,
  };

  // --- E: volume ---
  const maintenance = hollidaySegar(weightKg);
  const densities = [0.67, 1.0, 1.5, input.feedDensityKcalPerMl];
  const byDensity = densities.filter((d2, i) => densities.indexOf(d2) === i).map((density) => ({
    density,
    mlForC: C.kcalPerDay.central !== null ? C.kcalPerDay.central / density : null,
    mlForD: D.kcalPerDay.central !== null ? D.kcalPerDay.central / density : null,
  }));
  const volumeFlags: CalcNote[] = [];
  if (input.feedsPerDay !== null && input.mlPerFeed !== null) {
    const tolerated = input.feedsPerDay * input.mlPerFeed;
    const need = C.kcalPerDay.central !== null ? C.kcalPerDay.central / input.feedDensityKcalPerMl : null;
    if (need !== null && tolerated > 0 && need > tolerated) {
      volumeFlags.push(N(
        `Ograniczenie objętości przy ${input.feedDensityKcalPerMl} kcal/ml: potrzeba ${need.toFixed(0)} ml/d, tolerowane ${tolerated} ml/d (porcje × ml) — rozważ zagęszczenie energii pod nadzorem klinicznym.`,
        `Volume-limited at ${input.feedDensityKcalPerMl} kcal/ml: ${need.toFixed(0)} ml/day needed vs ${tolerated} ml/day tolerated (feeds x ml/feed) — consider energy densification with clinician guidance.`,
      ));
    }
    if (need !== null && need > maintenance) {
      volumeFlags.push(N(
        `Potrzebna objętość (${need.toFixed(0)} ml) przekracza płyny podtrzymujące Hollidaya–Segara (${maintenance.toFixed(0)} ml) przy tej gęstości.`,
        `Volume needed (${need.toFixed(0)} ml) exceeds Holliday-Segar maintenance fluid (${maintenance.toFixed(0)} ml) at this density.`,
      ));
    }
  }
  const E = { byDensity, maintenanceFluidMl: maintenance, volumeFlags };

  // --- F: gap analysis ---
  let F: CalcResult["F"] = null;
  if (input.actualIntakeKcalPerDay !== null && C.kcalPerDay.central !== null) {
    const pctC = (input.actualIntakeKcalPerDay / C.kcalPerDay.central) * 100;
    const pctD = D.kcalPerDay.central !== null ? (input.actualIntakeKcalPerDay / D.kcalPerDay.central) * 100 : null;
    F = {
      percentOfC: pctC,
      percentOfD: pctD,
      note: pctC >= 90
        ? N("Przyjęcie zbliżone do oszacowania podtrzymania — jeśli masa nie rośnie, zobacz sekcję „Dlaczego mimo jedzenia?”.", "Measured intake near the maintenance estimate — if weight is not rising, see the \"Why despite eating?\" section.")
        : N("Przyjęcie poniżej oszacowania podtrzymania.", "Measured intake below the maintenance estimate."),
    };
  }

  const wRef: CalcResult["whsRef"] = {
    weight: {},
    length: {},
  };
  for (const l of ["+2SD", "+1SD", "mean", "-1SD", "-2SD"] as WhsLine[]) {
    wRef.weight[l] = ctx.whs.get(sex, "weight", l, Math.min(ageMonths, 48));
    wRef.length[l] = ctx.whs.get(sex, "length", l, Math.min(ageMonths, 48));
  }
  // Approximate z-position on the digitized WHS charts (same-side half-gap; audit R2-4:
  // the girls' lines are asymmetric, so use the +1SD gap above the mean and the -1SD gap below).
  const zOf = (v: number, mean: number | null, lo: number | null, hi: number | null): number | null => {
    if (mean === null) return null;
    const gap = v >= mean
      ? (hi !== null && hi > mean ? hi - mean : (lo !== null && mean > lo ? mean - lo : null))
      : (lo !== null && mean > lo ? mean - lo : (hi !== null && hi > mean ? hi - mean : null));
    if (gap === null || gap <= 0) return null;
    return (v - mean) / gap;
  };
  const wMean = wRef.weight["mean"] ?? null;
  const wM1 = wRef.weight["-1SD"] ?? null;
  const wP1 = wRef.weight["+1SD"] ?? null;
  const lMean = wRef.length["mean"] ?? null;
  const lM1 = wRef.length["-1SD"] ?? null;
  const lP1 = wRef.length["+1SD"] ?? null;
  const whsZ = {
    weight: zOf(weightKg, wMean, wM1, wP1),
    length: input.lengthCm !== null ? zOf(input.lengthCm, lMean, lM1, lP1) : null,
  };

  return {
    weightAgeMonths: weightAge,
    whsRef: wRef,
    whsZ,
    A, B, C, heightBased, percentOfA, percentOfB, D, E, F,
  };
}
