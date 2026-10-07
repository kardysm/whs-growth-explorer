/**
 * Grid generator (run via vitest).
 * READ-ONLY by default (audit L10): compares the freshly computed grid/reference lines against the
 * committed files and fails if they differ, so `npm test` never rewrites committed data.
 * To regenerate (after model/data changes): GEN_GRID=1 npx vitest run src/grid/generate.test.ts
 * Precomputes A/B/C/(C+D) and volumes for the chart/table, per sex, age 0-48 months (step 1),
 * weight 2-20 kg (step 0.25). Also emits WHS + WHO reference lines for the growth chart.
 */
import { describe, expect, it } from "vitest";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
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
  milkPortionMl: null,
  mealPortionG: null,
  actualIntakeKcalPerDay: null,
  actualIntakeMlPerDay: null,
};

/**
 * Structural diff for the read-only comparison: numbers compare with a small relative tolerance
 * (1e-9) because Math.pow/log/exp are implementation-defined and differ in the last ulp between JS
 * engines (reproduced: node 20 vs node 26 disagree on valueForZ outputs — a byte-exact check flags
 * engine ulp noise as "stale"). Strings/keys/structure stay exact; real data changes move numbers
 * by ≫1e-9 and still fail.
 */
function findDiffs(a: unknown, b: unknown, path: string, out: string[]): void {
  if (typeof a === "number" && typeof b === "number") {
    if (a !== b && Math.abs(a - b) > 1e-9 * Math.max(Math.abs(a), Math.abs(b), 1)) {
      out.push(`${path}: ${a} != ${b}`);
    }
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      out.push(`${path}: array shape differs`);
      return;
    }
    for (let i = 0; i < a.length; i++) findDiffs(a[i], b[i], `${path}[${i}]`, out);
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) {
      out.push(`${path}: keys differ [${ka.join(",")}] vs [${kb.join(",")}]`);
      return;
    }
    for (const k of ka) findDiffs((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, out);
    return;
  }
  if (a !== b) out.push(`${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}

describe("grid generation", () => {
  it("generates grid.json and reference_lines.json (writes only with GEN_GRID=1)", () => {
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
    const gridStr = JSON.stringify({
      meta: {
        generated: "2026-10-02",
        defaults: { tone: "hypotonic", mobility: "dependent", horizonWeeks: 12, targetRef: "whs_mean", energyCostKcalPerG: 5, lengthDefault: "whs_mean" },
        ages: [0, 48], ageStep: 1, weights: [2, 20], weightStep: 0.25,
        note: "kcal/day; A/B healthy reference; C Krick-type maintenance; D catch-up (C + 5 kcal/g x 12-week gain toward WHS mean); fluid = Holliday-Segar ml/day; length when not provided = WHS mean length for age (digitized Antonius 2008)",
      },
      rows,
    });

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
    const refStr = JSON.stringify({ note: "WHS digitized lines (0-48 mo) and WHO medians/±2SD", bySex: ref });

    if (process.env.GEN_GRID === "1") {
      ensureDir(OUT_GRID);
      writeFileSync(OUT_GRID, gridStr);
      ensureDir(OUT_REF);
      writeFileSync(OUT_REF, refStr);
      console.log(`[gen-grid] wrote ${OUT_GRID} (${rows.length} rows) and ${OUT_REF}`);
    } else {
      // Read-only by default (audit L10): `npm test` must not rewrite committed data. Comparison is
      // TOLERANCE-based (numbers within 1e-9 relative) — byte equality would flag last-ulp differences
      // between JS engines as stale (see findDiffs). Real staleness still fails with the paths listed.
      const hint = "regenerate with: GEN_GRID=1 npx vitest run src/grid/generate.test.ts";
      const diffs: string[] = [];
      findDiffs(JSON.parse(readFileSync(OUT_GRID, "utf8")), JSON.parse(gridStr), "grid", diffs);
      findDiffs(JSON.parse(readFileSync(OUT_REF, "utf8")), JSON.parse(refStr), "ref", diffs);
      expect(diffs.slice(0, 20), `grid/reference data is stale or divergent — ${hint} (diffs: ${diffs.length})`).toEqual([]);
      console.log(`[gen-grid] verified ${OUT_GRID} (${rows.length} rows) and ${OUT_REF} — read-only (tolerance 1e-9)`);
    }
  }, 120_000);
});
