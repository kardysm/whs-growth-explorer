/**
 * Grid generator (run via vitest): precomputes A/B/C/(C+D) and volumes for the
 * chart/table, per sex, age 0-48 months (step 1), weight 2-20 kg (step 0.25).
 * Also emits WHS + WHO reference lines for the growth chart.
 *
 * Run: npx vitest run src/grid/generate.test.ts
 */
import { describe, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadContext } from "../calc/load.js";
import { computeAll } from "../calc/methods.js";
import { whoTable, valueForZ, lmsAt } from "../calc/who.js";
import type { CalcInput, Sex } from "../calc/types.js";

const OUT_GRID = "src/data/grid.json";
const OUT_REF = "src/data/reference_lines.json";

function ensureDir(p: string) {
  mkdirSync(dirname(p), { recursive: true });
}

const baseInput: Omit<CalcInput, "sex" | "ageMonths" | "weightKg" | "lengthCm"> = {
  tone: "hypotonic",
  mobility: "dependent",
  targetRef: "whs_mean",
  customTargetKg: null,
  horizonWeeks: 12,
  milkDensityKcalPerMl: 0.67,
  mealDensityKcalPerG: 1.0,
  milkMlPerDay: 500,
  feedsPerDay: null,
  mlPerFeed: null,
  actualIntakeKcalPerDay: null,
  actualIntakeMlPerDay: null,
};

describe("grid generation", () => {
  it("writes grid.json and reference_lines.json", () => {
    const { dataset, whs } = loadContext();
    const ctx = { who: dataset.who, whs };

    const rows: unknown[] = [];
    for (const sex of ["boys", "girls"] as Sex[]) {
      for (let age = 0; age <= 48; age++) {
        for (let w = 2; w <= 20.0001; w += 0.25) {
          const input: CalcInput = {
            ...baseInput, sex, ageMonths: age, weightKg: Math.round(w * 100) / 100, lengthCm: null,
          };
          const r = computeAll(input, ctx);
          rows.push({
            sex, age, w: input.weightKg,
            A: r.A.kcalPerDay.central, Alo: r.A.kcalPerDay.low, Ahi: r.A.kcalPerDay.high,
            B: r.B.kcalPerDay.central,
            C: r.C.kcalPerDay.central, Clo: r.C.kcalPerDay.low, Chi: r.C.kcalPerDay.high,
            D: r.D.kcalPerDay.central, Dlo: r.D.kcalPerDay.low, Dhi: r.D.kcalPerDay.high,
            fluid: r.E.maintenanceFluidMl,
          });
        }
      }
    }
    ensureDir(OUT_GRID);
    writeFileSync(OUT_GRID, JSON.stringify({
      meta: {
        generated: "2026-10-02",
        defaults: { tone: "hypotonic", mobility: "dependent", horizonWeeks: 12, targetRef: "whs_mean", energyCostKcalPerG: 5, lengthDefault: "whs_mean" },
        ages: [0, 48], ageStep: 1, weights: [2, 20], weightStep: 0.25,
        note: "kcal/day; A/B healthy reference; C Krick-type maintenance; D catch-up (C + 5 kcal/g x 12-week gain toward WHS mean); fluid = Holliday-Segar ml/day; length when not provided = WHS mean length for age (digitized Antonius 2008)",
      },
      rows,
    }));
    console.log("grid rows:", rows.length);

    // reference lines (per month 0..48)
    const ref: Record<string, unknown[]> = {};
    for (const sex of ["boys", "girls"] as Sex[]) {
      const lines: unknown[] = [];
      const wfa = whoTable(ctx.who, `wfa_${sex}`);
      const lhfa = whoTable(ctx.who, `lhfa_${sex}`);
      for (let m = 0; m <= 48; m++) {
        const entry: Record<string, number | null> = { m };
        for (const line of ["+2SD", "+1SD", "mean", "-1SD", "-2SD"] as const) {
          entry[`w_${line}`] = whs.get(sex, "weight", line, m);
          entry[`l_${line}`] = whs.get(sex, "length", line, m);
        }
        const lw = lmsAt(wfa, m);
        const ll = lmsAt(lhfa, m);
        entry["who_w_med"] = lw?.M ?? null;
        entry["who_w_m2"] = lw ? valueForZ(lw.L, lw.M, lw.S, -2) : null;
        entry["who_w_p2"] = lw ? valueForZ(lw.L, lw.M, lw.S, 2) : null;
        entry["who_l_med"] = ll?.M ?? null;
        entry["who_l_m2"] = ll ? valueForZ(ll.L, ll.M, ll.S, -2) : null;
        lines.push(entry);
      }
      ref[sex] = lines;
    }
    ensureDir(OUT_REF);
    writeFileSync(OUT_REF, JSON.stringify({ note: "WHS digitized lines (0-48 mo) and WHO medians/±2SD", bySex: ref }));
    console.log("reference lines written");
  }, 120_000);
});
