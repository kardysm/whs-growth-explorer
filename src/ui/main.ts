/**
 * WHS Feeding & Growth Explorer — main UI (working draft).
 * PL default, EN toggle; calculator + charts + table + sources + methods.
 */
import "../ui/styles.css";
import * as echarts from "echarts";
import Fuse from "fuse.js";
import base from "../../content/base.json";
import gridData from "../data/grid.json";
import refData from "../data/reference_lines.json";
import calJson from "../data/calhoun2025.json";
import sourcesData from "../data/sources.json";
import reasons from "../../content/reasons.json";
import flags from "../../content/flags.json";
import rules from "../../content/rules.json";
import productsContent from "../../content/products.json";
import foodsData from "../data/products_foods.json";
import { computeAll } from "../calc/methods.js";
import { loadContext } from "../calc/load.js";
import { whsAgeForLength, whsWeightZ } from "../calc/whs.js";
import type { CalcInput } from "../calc/types.js";

type Lang = "pl" | "en";

const { dataset, whs } = loadContext();
const ctx = { who: dataset.who, whs };

let lang: Lang = "pl";
let unit: "kcal" | "kJ" = "kcal";

interface Inputs {
  sex: "boys" | "girls";
  age: number;
  weight: number;
  length: number | null;
  tone: CalcInput["tone"];
  mobility: CalcInput["mobility"];
  targetRef: CalcInput["targetRef"];
  horizonWeeks: number;
  density: number;
  feeds: number | null;
  mlPerFeed: number | null;
  intake: number | null;
}
let input: Inputs = {
  sex: "boys",
  age: 18,
  weight: 8,
  length: 74,
  tone: "hypotonic",
  mobility: "dependent",
  targetRef: "whs_mean",
  horizonWeeks: 12,
  density: 1.0,
  feeds: null,
  mlPerFeed: null,
  intake: null,
};

const app = document.getElementById("app")!;

function t(path: string): string {
  const parts = path.split(".");
  let node: unknown = base;
  for (const p of parts) {
    if (node && typeof node === "object" && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p];
    } else return path;
  }
  if (node && typeof node === "object" && lang in (node as Record<string, string>)) {
    return (node as Record<string, string>)[lang]!;
  }
  return typeof node === "string" ? node : path;
}

function fmt(kcal: number | null | undefined, dec = 0): string {
  if (kcal === null || kcal === undefined || !Number.isFinite(kcal)) return "—";
  const v = unit === "kcal" ? kcal : kcal * 4.184;
  return v.toLocaleString(lang === "pl" ? "pl-PL" : "en-GB", { maximumFractionDigits: dec, minimumFractionDigits: 0 });
}

const loc = (v: number): string => fmt(v, 2);

function bandStr(b: { low: number | null; central: number | null; high: number | null }): string {
  if (b.central === null) return "—";
  return `${fmt(b.low)} – ${fmt(b.central)} – ${fmt(b.high)} ${unit === "kcal" ? "kcal" : "kJ"}/24h`;
}

// ---------- shell ----------

function renderShell(): void {
  app.innerHTML = `
  <a class="skip-link" href="#main">${t("a11y.skip")}</a>
  <header class="top">
    <h1>WHS Feeding &amp; Growth Explorer</h1>
    <nav class="main" aria-label="${t("nav.aria")}">
      ${( ["start","calc","charts","table","why","flags","rules","products","sources","method"] as const)
        .map((k) => `<a href="#${k}">${t(`nav.${k}`)}</a>`).join("")}
    </nav>
    <div class="lang-toggle" role="group" aria-label="język / language">
      <button type="button" data-lang="pl" aria-pressed="${lang === "pl"}">PL</button>
      <button type="button" data-lang="en" aria-pressed="${lang === "en"}">EN</button>
    </div>
    <button type="button" class="hdr-btn" id="search-open" aria-label="${t("search.open")}">🔍 ${t("search.open")} <span class="small">Ctrl+K</span></button>
    <button type="button" class="hdr-btn" id="theme-toggle" aria-label="${t("theme.toggle")}" title="${t("theme.toggle")}" aria-pressed="${effectiveTheme() === "dark"}">🌓</button>
  </header>
  <main id="main" tabindex="-1">
    <p class="banner" id="disclaimer">${t("disclaimer_short")}</p>
    <section id="start"><h2>${t("start.title")}</h2><div id="start-body"></div></section>
    <section id="calc"><h2>${t("calc.title")}</h2><div id="calc-body"></div></section>
    <section id="charts"><h2>${t("charts.title")}</h2><div id="charts-body"></div></section>
    <section id="table"><h2>${t("table.title")}</h2><div id="table-body"></div></section>
    <section id="why"><h2>${t("nav.why")}</h2><div id="why-body"></div></section>
    <section id="flags"><h2>${t("nav.flags")}</h2><div id="flags-body"></div></section>
    <section id="rules"><h2>${t("nav.rules")}</h2><div id="rules-body"></div></section>
    <section id="products"><h2>${t("nav.products")}</h2><div id="products-body"></div></section>
    <section id="sources"><h2>${t("sources.title")}</h2><div id="sources-body"></div></section>
    <section id="method"><h2>${t("method.title")}</h2><div id="method-body"></div></section>
  </main>
  <footer>${t("footer")}</footer>
  <div id="search-overlay" hidden role="dialog" aria-modal="true" aria-label="${t("search.open")}">
    <div class="search-panel card">
      <div class="search-row">
        <input id="search-input" type="search" placeholder="${t("search.ph")}" aria-label="${t("search.ph")}" autocomplete="off" />
        <button type="button" class="hdr-btn" id="search-close" aria-label="${t("search.close")}">✕</button>
      </div>
      <ul id="search-results" aria-label="${t("search.open")}" aria-live="polite" tabindex="0"></ul>
      <p class="small">${t("search.hint")}</p>
    </div>
  </div>`;

  app.querySelectorAll<HTMLButtonElement>(".lang-toggle button").forEach((b) => {
    b.addEventListener("click", () => {
      lang = (b.dataset.lang as Lang) ?? "pl";
      renderAll();
    });
  });

  document.getElementById("search-open")?.addEventListener("click", openSearch);
  document.querySelector(".skip-link")?.addEventListener("click", () => { window.setTimeout(() => document.getElementById("main")?.focus(), 0); });
  document.getElementById("search-close")?.addEventListener("click", closeSearch);
  const ovEl = document.getElementById("search-overlay");
  ovEl?.addEventListener("click", (e) => { if (e.target === ovEl) closeSearch(); });
  ovEl?.addEventListener("keydown", (e) => trapTab(e as KeyboardEvent));
  const si = document.getElementById("search-input") as HTMLInputElement | null;
  si?.addEventListener("input", () => runSearch(si.value));
  si?.addEventListener("keydown", (e) => searchKey(e as KeyboardEvent));
  document.getElementById("search-results")?.addEventListener("click", (e) => {
    const li = (e.target as HTMLElement).closest("li[data-a]");
    if (li) goSearch(li.getAttribute("data-a")!);
  });
  document.getElementById("theme-toggle")?.addEventListener("click", (ev) => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    (ev.currentTarget as HTMLElement).setAttribute("aria-pressed", String(next === "dark"));
    drawCharts();
  });
}

function renderStart(): void {
  const intro = (base.start.intro as Record<string, string[]>)[lang] ?? [];
  const howto = (base.start.howto as Record<string, string[]>)[lang] ?? [];
  const safety = (base.start.safety as Record<string, string[]>)[lang] ?? [];
  document.getElementById("start-body")!.innerHTML = `
    <div class="card"><ul class="tight">${intro.map((x) => `<li>${x}</li>`).join("")}</ul></div>
    <div class="grid2">
      <div class="card"><h3>${t("start.howto_title")}</h3><ol>${howto.map((x) => `<li>${x}</li>`).join("")}</ol></div>
      <div class="card"><h3>${t("start.safety_title")}</h3><ul class="tight">${safety.map((x) => `<li>${x}</li>`).join("")}</ul></div>
    </div>`;
}

// ---------- calculator ----------

function renderCalcForm(): void {
  const b = document.getElementById("calc-body")!;
  b.innerHTML = `
  <div class="grid2">
    <form class="card" id="calc-form" aria-label="calculator">
      <label for="in-sex">${t("calc.sex")}</label>
      <select id="in-sex">
        <option value="boys" ${input.sex === "boys" ? "selected" : ""}>${t("calc.boy")}</option>
        <option value="girls" ${input.sex === "girls" ? "selected" : ""}>${t("calc.girl")}</option>
      </select>
      <label for="in-age">${t("calc.age")}</label>
      <input id="in-age" type="number" min="0" max="48" step="1" value="${input.age}" />
      <label for="in-weight">${t("calc.weight")}</label>
      <input id="in-weight" type="number" min="1" max="25" step="0.1" value="${input.weight}" />
      <label for="in-length">${t("calc.length")}</label>
      <input id="in-length" type="number" min="30" max="120" step="0.5" value="${input.length ?? ""}" />
      <p class="small">${t("calc.length_hint")}</p>
      <label for="in-tone">${t("calc.tone")}</label>
      <select id="in-tone">
        <option value="hypotonic" ${input.tone === "hypotonic" ? "selected" : ""}>${t("calc.tone_hypo")}</option>
        <option value="normal" ${input.tone === "normal" ? "selected" : ""}>${t("calc.tone_norm")}</option>
        <option value="hypertonic" ${input.tone === "hypertonic" ? "selected" : ""}>${t("calc.tone_hyper")}</option>
      </select>
      <label for="in-mobility">${t("calc.mobility")}</label>
      <select id="in-mobility">
        <option value="bedridden" ${input.mobility === "bedridden" ? "selected" : ""}>${t("calc.mob_bed")}</option>
        <option value="dependent" ${input.mobility === "dependent" ? "selected" : ""}>${t("calc.mob_dep")}</option>
        <option value="crawling" ${input.mobility === "crawling" ? "selected" : ""}>${t("calc.mob_crawl")}</option>
        <option value="ambulatory" ${input.mobility === "ambulatory" ? "selected" : ""}>${t("calc.mob_amb")}</option>
      </select>
      <label for="in-target">${t("calc.target")}</label>
      <select id="in-target">
        <option value="whs_mean" ${input.targetRef === "whs_mean" ? "selected" : ""}>${t("calc.target_whs_mean")}</option>
        <option value="whs_minus1sd" ${input.targetRef === "whs_minus1sd" ? "selected" : ""}>${t("calc.target_whs_m1")}</option>
        <option value="who_wfl_median" ${input.targetRef === "who_wfl_median" ? "selected" : ""}>${t("calc.target_who_med")}</option>
      </select>
      <label for="in-horizon">${t("calc.horizon")}</label>
      <input id="in-horizon" type="number" min="4" max="52" step="1" value="${input.horizonWeeks}" />
      <label for="in-density">${t("calc.density")}</label>
      <input id="in-density" type="number" min="0.6" max="2" step="0.01" value="${input.density}" />
      <label for="in-feeds">${t("calc.feeds")}</label>
      <input id="in-feeds" type="number" min="1" max="12" step="1" value="${input.feeds ?? ""}" />
      <label for="in-mlfeed">${t("calc.ml_per_feed")}</label>
      <input id="in-mlfeed" type="number" min="10" max="400" step="5" value="${input.mlPerFeed ?? ""}" />
      <label for="in-intake">${t("calc.intake")}</label>
      <input id="in-intake" type="number" min="0" max="3000" step="10" value="${input.intake ?? ""}" />
      <button class="primary" type="button" id="btn-recalc">${t("calc.compute")}</button>
    </form>
    <div>
      <div class="card small">${t("calc.hint")}</div>
      <div id="results"></div>
    </div>
  </div>`;

  const read = (): void => {
    input = {
      sex: (document.getElementById("in-sex") as HTMLSelectElement).value as Inputs["sex"],
      age: Number((document.getElementById("in-age") as HTMLInputElement).value),
      weight: Number((document.getElementById("in-weight") as HTMLInputElement).value),
      length: (document.getElementById("in-length") as HTMLInputElement).value === "" ? null : Number((document.getElementById("in-length") as HTMLInputElement).value),
      tone: (document.getElementById("in-tone") as HTMLSelectElement).value as Inputs["tone"],
      mobility: (document.getElementById("in-mobility") as HTMLSelectElement).value as Inputs["mobility"],
      targetRef: (document.getElementById("in-target") as HTMLSelectElement).value as Inputs["targetRef"],
      horizonWeeks: Number((document.getElementById("in-horizon") as HTMLInputElement).value),
      density: Number((document.getElementById("in-density") as HTMLInputElement).value),
      feeds: (document.getElementById("in-feeds") as HTMLInputElement).value === "" ? null : Number((document.getElementById("in-feeds") as HTMLInputElement).value),
      mlPerFeed: (document.getElementById("in-mlfeed") as HTMLInputElement).value === "" ? null : Number((document.getElementById("in-mlfeed") as HTMLInputElement).value),
      intake: (document.getElementById("in-intake") as HTMLInputElement).value === "" ? null : Number((document.getElementById("in-intake") as HTMLInputElement).value),
    };
    recalc();
  };
  for (const id of ["in-sex", "in-age", "in-weight", "in-length", "in-tone", "in-mobility", "in-target", "in-horizon", "in-density", "in-feeds", "in-mlfeed", "in-intake"]) {
    document.getElementById(id)!.addEventListener("change", read);
  }
  document.getElementById("btn-recalc")!.addEventListener("click", read);
}

function recalc(): void {
  const calcInput: CalcInput = {
    sex: input.sex,
    ageMonths: input.age,
    weightKg: input.weight,
    lengthCm: input.length,
    tone: input.tone,
    mobility: input.mobility,
    targetRef: input.targetRef,
    customTargetKg: null,
    horizonWeeks: input.horizonWeeks,
    feedDensityKcalPerMl: input.density,
    feedsPerDay: input.feeds,
    mlPerFeed: input.mlPerFeed,
    actualIntakeKcalPerDay: input.intake,
    actualIntakeMlPerDay: null,
  };
  const r = computeAll(calcInput, ctx);
  const res = document.getElementById("results")!;
  res.setAttribute("aria-live", "polite");

  // Refeeding-risk screen — WHS-chart-relative (user direction, DECISIONS D-023): compares the child
  // against the digitized WHS charts, not WHO (WHS children are constitutionally smaller; the WHO
  // threshold over-flagged them). ≈ < −3 SD via the chart's same-side SD model.
  let refeeding = "";
  {
    let z: number | null = null;
    if (input.length !== null && Number.isFinite(input.length)) {
      const aStar = whsAgeForLength(ctx.whs, input.sex, input.length);
      if (aStar !== null) z = whsWeightZ(ctx.whs, input.sex, aStar, input.weight);
    }
    if (z === null) z = whsWeightZ(ctx.whs, input.sex, input.age, input.weight);
    if (z !== null && z <= -3) refeeding = `<p class="banner crit">${t("calc.refeeding_banner")}</p>`;
  }

  const card = (title: string, b: { low: number | null; central: number | null; high: number | null }, notes: BiText[] = [], ids: string[] = [], opts: { alerts?: BiText[]; grade?: string; extrap?: boolean } = {}) => `
    <div class="card"><h3>${title} ${opts.grade ? `<span class="badge grade${opts.grade}">${opts.grade}</span>` : ""}</h3>
      <p><strong>${bandStr(b)}</strong></p>
      ${opts.extrap ? `<p class="small">${t("calc.extrapolation_note")}</p>` : ""}
      ${(opts.alerts ?? []).map((a) => `<p class="banner warn">${B(a)}</p>`).join("")}
      ${notes.length ? (b.central === null
        ? `<ul class="tight small">${notes.map((n) => `<li>${B(n)}</li>`).join("")}</ul>`
        : `<details><summary class="small">${t("calc.how")}</summary><ul class="tight small">${notes.map((n) => `<li>${B(n)}</li>`).join("")}</ul></details>`) : ""}
      ${ids.length ? `<p class="small">${t("calc.sources_label")}: ${ids.map((x) => `<a href="#sources">${x}</a>`).join(", ")}</p>` : ""}
    </div>`;

  const wa = r.weightAgeMonths;
  // Round-4 audit R4-3: carry-over caution for flagged (not suppressed) C values.
  const cCarry = (r.C.alerts ?? []).filter(() => r.C.kcalPerDay.central !== null);
  res.innerHTML = `
    ${refeeding}
    ${card(t("calc.method_a_t"), r.A.kcalPerDay, r.A.notes, r.A.sourceIds, { grade: "A" })}
    ${card(t("calc.method_b_t").replace("{wa}", wa !== null ? (lang === "pl" ? wa.toFixed(1).replace(".", ",") : wa.toFixed(1)) : "—"), r.B.kcalPerDay, r.B.notes, r.B.sourceIds, { grade: "A" })}
    ${card(t("calc.method_c_t"), r.C.kcalPerDay, [
      ...(r.C.notes ?? []),
      { pl: `% A: ${r.percentOfA !== null ? r.percentOfA.toFixed(0) : "—"}%, % B: ${r.percentOfB !== null ? r.percentOfB.toFixed(0) : "—"}%`, en: `% A: ${r.percentOfA !== null ? r.percentOfA.toFixed(0) : "—"}%, % B: ${r.percentOfB !== null ? r.percentOfB.toFixed(0) : "—"}%` },
      ...((r.heightBased.kcalPerDay !== null && !(r.C.alerts && r.C.alerts.length)) ? [{ pl: `kcal/cm: ${lang === "pl" ? String(r.heightBased.kcalPerCmPerDay).replace(".", ",") : r.heightBased.kcalPerCmPerDay} → ${fmt(r.heightBased.kcalPerDay)} ${unit}/24h`, en: `kcal/cm: ${r.heightBased.kcalPerCmPerDay} -> ${fmt(r.heightBased.kcalPerDay)} ${unit}/24h` }] : []),
      r.heightBased.note,
      ...(r.whsZ.weight !== null ? [{ pl: `Pozycja masy na siatce WHS: ≈ ${r.whsZ.weight.toFixed(1).replace(".", ",")} SD (0 = średnia WHS dla wieku; siatka zdigitalizowana 0–48 mies.)`, en: `Weight position on the WHS chart: ≈ ${r.whsZ.weight.toFixed(1)} SD (0 = WHS mean for age; digitized chart 0-48 mo)` }] : []),
    ], r.C.sourceIds, { grade: "D", extrap: true, alerts: r.C.alerts })}
    ${card(t("calc.method_d_t"), r.D.kcalPerDay, r.D.notes, r.D.sourceIds, { grade: "D", extrap: true, alerts: [...(r.D.guardrails ?? []).filter((g) => !(g.pl.includes("D-2") || g.en.includes("D-2"))), ...cCarry] })}
    <div class="card"><h3>${t("calc.method_d2_t")} <span class="badge gradeD">D</span></h3>
      <p class="small">${t("calc.extrapolation_note")}</p>
      ${r.D.method2.notes && r.D.method2.notes.length ? `<p class="small">${B(r.D.method2.notes[0])}</p>` : ""}
      ${(r.D.guardrails ?? []).filter((g) => g.pl.includes("D-2") || g.en.includes("D-2")).map((g) => `<p class="banner warn">${B(g)}</p>`).join("")}
      <p><strong>${bandStr(r.D.method2.kcalPerDay)}</strong></p>
      <details><summary class="small">${t("calc.how")}</summary><ul class="tight small">${(r.D.method2.notes ?? []).map((n) => `<li>${B(n)}</li>`).join("")}</ul></details>
      ${r.D.method2.kcalPerDay.central !== null && r.D.proteinGPerDay !== null ? `<p class="small">${t("calc.protein_label")}: ${(lang === "pl" ? r.D.proteinGPerDay.toFixed(1).replace(".", ",") : r.D.proteinGPerDay.toFixed(1))} g/24h (${(lang === "pl" ? r.D.proteinGPerKgPerDay!.toFixed(2).replace(".", ",") : r.D.proteinGPerKgPerDay!.toFixed(2))} g/kg/24h)</p>` : ""}
    </div>
    <div class="card"><h3>${t("calc.method_e_t")}</h3>
      ${cCarry.length ? `<p class="banner warn">${B(cCarry[0])}</p>` : ""}
      ${input.age < 12 ? `<p class="banner warn">${t("calc.infant_density_caution")}</p>` : (input.density > 1.0 ? `<p class="banner warn">${t("calc.density_caution")}</p>` : "")}
      <table><thead><tr><th>${t("calc.density_col")}</th><th>C (ml/24h)</th><th>D (ml/24h)</th></tr></thead>
      <tbody>${r.E.byDensity.map((d) => `<tr><td>${loc(d.density)} kcal/ml</td><td>${d.mlForC !== null ? d.mlForC.toFixed(0) : "—"}</td><td>${d.mlForD !== null ? d.mlForD.toFixed(0) : "—"}</td></tr>`).join("")}</tbody></table>
      <p class="small">${t("calc.fluid_label")}: ${r.E.maintenanceFluidMl.toFixed(0)} ml/24h</p>
      ${(() => { const d67 = r.E.byDensity.find((d) => d.density === 0.67); return d67 && d67.mlForC !== null && d67.mlForC > r.E.maintenanceFluidMl ? `<p class="small">${t("calc.volume_density_note")}</p>` : ""; })()}
      ${r.E.volumeFlags.map((f) => `<p class="banner warn">${B(f)}</p>`).join("")}
    </div>
    ${r.F ? `<div class="card"><h3>${t("calc.method_f_t")}</h3>
      <p>${r.F.percentOfC!.toFixed(0)}% C${r.F.percentOfD !== null ? ` · ${r.F.percentOfD.toFixed(0)}% D` : ""}</p>
      <p class="small">${B(r.F.note)}</p></div>` : ""}
    <p class="small">${t("calc.note_estimate")}</p>`;

  // Round-2 audit R2-3: propagate calculator changes to charts + table (with fresh captions).
  if (ch1) {
    renderChartsShell();
    drawCharts();
    renderTable();
  }
}

// ---------- charts ----------

let ch1: echarts.ECharts | null = null;
let ch2: echarts.ECharts | null = null;
let ch3: echarts.ECharts | null = null;

function renderChartsShell(): void {
  document.getElementById("charts-body")!.innerHTML = `
    <div class="card"><h3>${t("charts.chart1_title").replace("{age}", String(input.age))}</h3>
      <p class="small">${t("charts.chart1_hint")}</p><div id="chart1" class="chart"></div>
      <div id="fallback1"></div></div>
    <div class="card"><h3>${t("charts.chart2_title")}</h3>
      <p class="small">${t("charts.chart2_hint")}</p><div id="chart2" class="chart"></div>
      <p class="small">${t("charts.chart2_note")}</p><div id="fallback2"></div></div>
    <div class="card"><h3>${t("charts.chart3_title")}</h3>
      <p class="small">${t("charts.chart3_hint").replace("{density}", lang === "pl" ? String(input.density).replace(".", ",") : String(input.density))}</p><div id="chart3" class="chart"></div>
      <div id="fallback3"></div></div>`;
}

function drawCharts(): void {
  ch1?.dispose(); ch2?.dispose(); ch3?.dispose();

  const ws: number[] = [];
  for (let w = 2; w <= 20.001; w += 0.5) ws.push(Math.round(w * 100) / 100);
  const mk = (w: number) =>
    computeAll({
      sex: input.sex, ageMonths: input.age, weightKg: w, lengthCm: input.length,
      tone: input.tone, mobility: input.mobility, targetRef: input.targetRef,
      customTargetKg: null, horizonWeeks: input.horizonWeeks, feedDensityKcalPerMl: input.density,
      feedsPerDay: null, mlPerFeed: null, actualIntakeKcalPerDay: null, actualIntakeMlPerDay: null,
    }, ctx);
  const rs = ws.map(mk);
  const conv = (v: number | null): number | null => (v === null ? null : (unit === "kcal" ? v : v * 4.184));
  const Y = (arr: (number | null)[]) => arr.map((v, i) => [ws[i]!, conv(v)] as [number, number | null]);

  const line = (name: string, data: [number, number | null][], opts: Record<string, unknown> = {}) => ({
    name, type: "line" as const, data, showSymbol: false, ...opts,
  });

  const fgVar = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#1a1a1a";
  const dark = effectiveTheme() === "dark";
  const num0 = (v: unknown): string => (typeof v === "number" ? v.toLocaleString(lang === "pl" ? "pl-PL" : "en-GB", { maximumFractionDigits: 0 }) : "—");
  const pDen = (x: number): string => String(x).replace(".", lang === "pl" ? "," : ".");
  // Theme-aware palette (audit F1: dark mode series were near-invisible on the dark card).
  const PAL = dark
    ? { a: "#8ab4e0", b: "#f0c674", c: "#e58aa8", d: "#8fc5da", who: "#8fc5da", whs2: "#c98ba0", cal: "#7fd0b4", child: "#f5f5f5", fluid: "#bbbbbb" }
    : { a: "#4e79a7", b: "#c8871b", c: "#7a1f3d", d: "#1f5d7a", who: "#1f5d7a", whs2: "#b06a80", cal: "#1a7a6a", child: "#000000", fluid: "#555555" };
  ch1 = echarts.init(document.getElementById("chart1")!);
  ch1.setOption({
    tooltip: {
      trigger: "axis",
      formatter: (ps: { marker?: string; seriesName?: string; value?: unknown }[]) => {
        const first = ps[0]?.value as [number, number] | undefined;
        const head = `${lang === "pl" ? "masa" : "weight"} ${first ? num0(first[0]) : "—"} kg`;
        const rows = ps.map((p) => { const v = p.value as [number, number]; return `${p.marker ?? ""} ${p.seriesName ?? ""}: ${num0(v[1])} ${unit === "kcal" ? "kcal" : "kJ"}`; });
        const c = ps.find((p) => p.seriesName === "C");
        let extra = "";
        if (c && Array.isArray(c.value)) {
          const cv = (c.value as [number, number])[1];
          const kcalV = unit === "kcal" ? cv : cv / 4.184;
          extra = `<br/>${t("calc.ml_at_density").replace("{d}", pDen(input.density))}: ${num0(kcalV / input.density)} ml`;
        }
        return head + rows.map((r) => `<br/>${r}`).join("") + extra;
      },
    },
    aria: { enabled: true, label: { description: t("a11y.chart1_desc") } },
    darkMode: false,
    textStyle: { color: fgVar },
    legend: { bottom: 0, type: "scroll", textStyle: { color: fgVar } },
    grid: { left: 60, right: 30, top: 30, bottom: 60 },
    xAxis: { type: "value", name: "kg", min: 2, max: 20, axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    yAxis: { type: "value", name: unit === "kcal" ? "kcal/24h" : "kJ/24h", axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    series: [
      line("A", Y(rs.map((r) => r.A.kcalPerDay.central)), { color: PAL.a }),
      line("B", Y(rs.map((r) => r.B.kcalPerDay.central)), { color: PAL.b }),
      line("C", Y(rs.map((r) => r.C.kcalPerDay.central)), { color: PAL.c }),
      line("C−", Y(rs.map((r) => r.C.kcalPerDay.low)), { color: PAL.c, lineStyle: { type: "dashed", width: 1 } }),
      line("C+", Y(rs.map((r) => r.C.kcalPerDay.high)), { color: PAL.c, lineStyle: { type: "dashed", width: 1 } }),
      line("D", Y(rs.map((r) => r.D.kcalPerDay.central)), { color: PAL.d }),
      line("D−", Y(rs.map((r) => r.D.kcalPerDay.low)), { color: PAL.d, lineStyle: { type: "dashed", width: 1 } }),
      line("D+", Y(rs.map((r) => r.D.kcalPerDay.high)), { color: PAL.d, lineStyle: { type: "dashed", width: 1 } }),
    ],
  });
  ch1.on("click", (p: { value?: unknown }) => {
    const v = p.value;
    if (Array.isArray(v) && typeof v[0] === "number") {
      input.weight = v[0];
      const el = document.getElementById("in-weight") as HTMLInputElement | null;
      if (el) el.value = String(v[0]);
      recalc(); drawCharts(); renderTable();
    }
  });
  // chart 1 <-> table hover linking (audit D1)
  ch1.on("mouseover", (p: { value?: unknown }) => {
    const v = p.value;
    if (!Array.isArray(v) || typeof v[0] !== "number") return;
    document.querySelectorAll("#table-body tbody tr.hover").forEach((tr) => tr.classList.remove("hover"));
    const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>("#table-body tbody tr"));
    let best: HTMLTableRowElement | null = null;
    let bd = 0.26;
    for (const tr of rows) { const d = Math.abs(Number(tr.dataset.w) - v[0]); if (d < bd) { bd = d; best = tr; } }
    if (best) best.classList.add("hover");
  });
  ch1.on("globalout", () => { document.querySelectorAll("#table-body tbody tr.hover").forEach((tr) => tr.classList.remove("hover")); });

  const pairs = (key: string) =>
    (refData.bySex as Record<string, Record<string, number | null>[]>)[input.sex]!.map(
      (e) => [e.m as number, e[key] ?? null] as [number, number | null],
    );
  const cal = calJson as unknown as {
    weight: { left: Record<string, [number, number][]>; right: Record<string, [number, number][]> };
  };
  const cal2025 = (pct: string): [number, number][] => {
    const out: [number, number][] = cal.weight.left[pct]!.map(([m, v]) => [m, v]);
    for (const [y, v] of cal.weight.right[pct]!) if (y >= 2.5 && y <= 4.0 + 1e-9) out.push([Math.round(y * 12), v]);
    return out;
  };
  ch2 = echarts.init(document.getElementById("chart2")!);
  ch2.setOption({
    tooltip: { trigger: "axis", valueFormatter: (v: unknown) => (typeof v === "number" ? `${loc(v)} kg` : "—") },
    aria: { enabled: true, label: { description: t("a11y.chart2_desc") } },
    darkMode: false,
    textStyle: { color: fgVar },
    legend: { bottom: 0, type: "scroll", textStyle: { color: fgVar } },
    grid: { left: 60, right: 30, top: 30, bottom: 60 },
    xAxis: { type: "value", name: lang === "pl" ? "wiek (mies.)" : "age (mo)", min: 0, max: 48, axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    yAxis: { type: "value", name: "kg", min: 0, max: 20, axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    series: [
      { name: lang === "pl" ? "WHS średnia" : "WHS mean", type: "line", showSymbol: false, data: pairs("w_mean"), color: PAL.c },
      { name: "+1 SD", type: "line", showSymbol: false, data: pairs("w_+1SD"), color: PAL.c, lineStyle: { type: "dashed", width: 1 } },
      { name: "−1 SD", type: "line", showSymbol: false, data: pairs("w_-1SD"), color: PAL.c, lineStyle: { type: "dashed", width: 1 } },
      { name: "+2 SD", type: "line", showSymbol: false, data: pairs("w_+2SD"), color: PAL.whs2, lineStyle: { type: "dotted", width: 1 } },
      { name: "−2 SD", type: "line", showSymbol: false, data: pairs("w_-2SD"), color: PAL.whs2, lineStyle: { type: "dotted", width: 1 } },
      { name: lang === "pl" ? "WHO mediana" : "WHO median", type: "line", showSymbol: false, data: pairs("who_w_med"), color: PAL.who, lineStyle: { type: "dashed" } },
      { name: "WHO −2 SD", type: "line", showSymbol: false, data: pairs("who_w_m2"), color: PAL.who, lineStyle: { type: "dotted" } },
      { name: "2025 p25", type: "line", showSymbol: false, data: cal2025("p25"), color: PAL.cal, lineStyle: { type: "dashed", width: 1 } },
      { name: "2025 p50", type: "line", showSymbol: false, data: cal2025("p50"), color: PAL.cal },
      { name: "2025 p75", type: "line", showSymbol: false, data: cal2025("p75"), color: PAL.cal, lineStyle: { type: "dashed", width: 1 } },
      {
        name: lang === "pl" ? "Twoje dziecko" : "Your child", type: "scatter", symbolSize: 12,
        data: input.age <= 48 ? [[input.age, input.weight]] : [], color: PAL.child,
        itemStyle: { borderColor: dark ? "#1f2124" : "#ffffff", borderWidth: 1 },
      },
    ],
  });

  const nc = rs.map((r) => (r.C.kcalPerDay.central !== null ? r.C.kcalPerDay.central / input.density : null));
  ch3 = echarts.init(document.getElementById("chart3")!);
  ch3.setOption({
    tooltip: { trigger: "axis", valueFormatter: (v: unknown) => (typeof v === "number" ? `${num0(v)} ml` : "—") },
    aria: { enabled: true, label: { description: t("a11y.chart3_desc") } },
    darkMode: false,
    textStyle: { color: fgVar },
    legend: { bottom: 0, type: "scroll", textStyle: { color: fgVar } },
    grid: { left: 60, right: 30, top: 30, bottom: 60 },
    xAxis: { type: "value", name: "kg", min: 2, max: 20, axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    yAxis: { type: "value", name: "ml/24h", axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    series: [
      { name: `ml @ ${pDen(input.density)}`, type: "line", showSymbol: false, data: ws.map((w, i) => [w, nc[i]]), color: PAL.a },
      { name: `ml @${pDen(0.67)}`, type: "line", showSymbol: false, data: ws.map((w, i) => [w, rs[i]!.C.kcalPerDay.central !== null ? rs[i]!.C.kcalPerDay.central! / 0.67 : null]), color: PAL.d, lineStyle: { type: "dashed", width: 1 } },
      { name: `ml @${pDen(1.0)}`, type: "line", showSymbol: false, data: ws.map((w, i) => [w, rs[i]!.C.kcalPerDay.central !== null ? rs[i]!.C.kcalPerDay.central! / 1.0 : null]), color: PAL.c, lineStyle: { type: "dashed", width: 1 } },
      { name: `ml @${pDen(1.5)}`, type: "line", showSymbol: false, data: ws.map((w, i) => [w, rs[i]!.C.kcalPerDay.central !== null ? rs[i]!.C.kcalPerDay.central! / 1.5 : null]), color: PAL.b, lineStyle: { type: "dashed", width: 1 } },
      { name: lang === "pl" ? "płyny podtrzymujące" : "maintenance fluid", type: "line", showSymbol: false, data: ws.map((w) => [w, w <= 10 ? w * 100 : w <= 20 ? 1000 + (w - 10) * 50 : 1500 + (w - 20) * 20]), color: PAL.fluid },
    ],
  });
  renderChartFallbacks(ws, rs);
}

// ---------- chart data-table fallbacks (a11y) ----------

function renderChartFallbacks(ws: number[], rs: ReturnType<typeof computeAll>[]): void {
  const num = (v: number | null, dec = 0): string => (v === null ? "—" : fmt(unit === "kcal" ? v : v * 4.184, dec));
  const n2 = (v: number | null): string => (v === null ? "—" : (lang === "pl" ? v.toFixed(2).replace(".", ",") : v.toFixed(2)));
  const put = (id: string, html: string): void => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  const open = `<details><summary class="small">${t("a11y.fallback")}</summary><div style="max-height:280px;overflow:auto">`;
  const close = `</div></details>`;

  put("fallback1", `${open}<table><thead><tr><th>${t("a11y.weight")}</th><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead><tbody>
    ${ws.filter((_, i) => i % 4 === 0).map((w, j) => {
      const r = rs[j * 4]!;
      return `<tr><td>${w}</td><td>${num(r.A.kcalPerDay.central)}</td><td>${num(r.B.kcalPerDay.central)}</td><td>${num(r.C.kcalPerDay.central)}</td><td>${num(r.D.kcalPerDay.central)}</td></tr>`;
    }).join("")}</tbody></table>${close}`);

  const refRows = (refData.bySex as Record<string, Record<string, number | null>[]>)[input.sex]!;
  const findRef = (m: number, key: string): number | null => {
    const hit = refRows.find((e) => e.m === m);
    return hit && typeof hit[key] === "number" ? (hit[key] as number) : null;
  };
  const calW = (calJson as unknown as { weight: { left: Record<string, [number, number][]>; right: Record<string, [number, number][]> } }).weight;
  const calAt = (pct: string, m: number): number | null => {
    const src = m <= 24 ? calW.left[pct] : calW.right[pct];
    const age = m <= 24 ? m : m / 12;
    const hit = src?.find(([a]) => Math.abs(a - age) < 1e-6);
    return hit ? hit[1] : null;
  };
  put("fallback2", `${open}<table><thead><tr><th>${t("a11y.age")}</th><th>${t("a11y.whs_mean")}</th><th>${t("a11y.who_med")}</th><th>2025 p25</th><th>2025 p50</th><th>2025 p75</th></tr></thead><tbody>
    ${[0, 6, 12, 18, 24, 30, 36, 42, 48].map((m) => `<tr><td>${m}</td><td>${n2(findRef(m, "w_mean"))}</td><td>${n2(findRef(m, "who_w_med"))}</td><td>${n2(calAt("p25", m))}</td><td>${n2(calAt("p50", m))}</td><td>${n2(calAt("p75", m))}</td></tr>`).join("")}</tbody></table>${close}`);

  put("fallback3", `${open}<table><thead><tr><th>${t("a11y.weight")}</th><th>ml @ ${input.density}</th><th>ml @1.0</th><th>${lang === "pl" ? "płyny podtrzymujące" : "maintenance fluid"}</th></tr></thead><tbody>
    ${[2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((w) => {
      const r = rs[(w - 2) / 0.5]!;
      const c = r.C.kcalPerDay.central;
      const fluid = w <= 10 ? w * 100 : 1000 + (w - 10) * 50;
      return `<tr><td>${w}</td><td>${c !== null ? (c / input.density).toFixed(0) : "—"}</td><td>${c !== null ? (c / 1.0).toFixed(0) : "—"}</td><td>${fluid}</td></tr>`;
    }).join("")}</tbody></table>${close}`);
}

// ---------- table ----------

let sortKey = "w";
let sortDir: 1 | -1 = 1;

function renderTable(): void {
  // Round-3 audit R3-1: rows are computed live for the current age/sex AND entered length,
  // so the table always agrees with the calculator cards (WHS-mean length when none entered).
  const rows: Record<string, number | string | null>[] = [];
  for (let w = 2; w <= 20.0001; w += 0.25) {
    const ww = Math.round(w * 100) / 100;
    const r = computeAll({
      sex: input.sex, ageMonths: input.age, weightKg: ww, lengthCm: input.length,
      tone: input.tone, mobility: input.mobility, targetRef: input.targetRef,
      customTargetKg: null, horizonWeeks: input.horizonWeeks, feedDensityKcalPerMl: input.density,
      feedsPerDay: null, mlPerFeed: null, actualIntakeKcalPerDay: null, actualIntakeMlPerDay: null,
    }, ctx);
    rows.push({
      w: ww,
      A: r.A.kcalPerDay.central, B: r.B.kcalPerDay.central, C: r.C.kcalPerDay.central,
      D: r.D.kcalPerDay.central, fluid: r.E.maintenanceFluidMl,
    });
  }
  rows.sort((a, b) => (Number(a[sortKey]) - Number(b[sortKey])) * sortDir);
  const probe = computeAll({
    sex: input.sex, ageMonths: input.age, weightKg: input.weight, lengthCm: input.length,
    tone: input.tone, mobility: input.mobility, targetRef: input.targetRef,
    customTargetKg: null, horizonWeeks: input.horizonWeeks, feedDensityKcalPerMl: input.density,
    feedsPerDay: null, mlPerFeed: null, actualIntakeKcalPerDay: null, actualIntakeMlPerDay: null,
  }, ctx);
  const cNote = probe.C.alerts && probe.C.alerts.length && probe.C.kcalPerDay.central !== null ? `<p class="banner warn small">${B(probe.C.alerts[0])}</p>` : "";
  const tf = (v: unknown, dec = 0) => (v === null || v === undefined ? "—" : fmt(Number(v), dec));
  const nearest = rows.reduce((best, r) => (Math.abs(Number(r.w) - input.weight) < Math.abs(Number(best.w) - input.weight) ? r : best), rows[0]!);

  document.getElementById("table-body")!.innerHTML = `
    ${cNote}
    <p class="small">${t("table.hint")} <button class="primary" type="button" id="csv-btn">${t("table.export")}</button></p>
    <div style="max-height:420px;overflow:auto" class="card" id="table-wrap">
    <table><thead><tr>
      ${(["w", "A", "B", "C", "D", "fluid"] as const).map((k) =>
        `<th scope="col" aria-sort="${sortKey === k ? (sortDir === 1 ? "ascending" : "descending") : "none"}"><button type="button" class="th-sort" data-key="${k}" title="${t("a11y.sort_hint")}">${t(k === "w" ? "table.col_weight" : k === "fluid" ? "table.col_fluid" : `table.col_${k.toLowerCase()}`)}${sortKey === k ? (sortDir === 1 ? " ▲" : " ▼") : ""}</button></th>`).join("")}
      <th scope="col">ml @${input.density}</th>
    </tr></thead><tbody>
    ${rows.map((r) => {
      const ml = r.C !== null && Number.isFinite(Number(r.C)) ? Number(r.C) / input.density : null;
      const hl = r === nearest ? ' class="hl"' : "";
      return `<tr${hl} data-w="${r.w}" tabindex="0"><td>${lang === "pl" ? Number(r.w).toFixed(2).replace(".", ",") : Number(r.w).toFixed(2)}</td><td>${tf(r.A)}</td><td>${tf(r.B)}</td><td>${tf(r.C)}</td><td>${tf(r.D)}</td><td>${tf(r.fluid)}</td><td>${ml !== null ? ml.toFixed(0) : "—"}</td></tr>`;
    }).join("")}
    </tbody></table></div>`;

  document.getElementById("table-body")!.querySelectorAll<HTMLButtonElement>(".th-sort").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.key!;
      if (sortKey === k) sortDir = (sortDir * -1) as 1 | -1;
      else { sortKey = k; sortDir = 1; }
      renderTable();
    });
  });
  document.querySelectorAll<HTMLTableRowElement>("#table-body tbody tr").forEach((tr) => {
    tr.addEventListener("click", () => {
      input.weight = Number(tr.dataset.w);
      const el = document.getElementById("in-weight") as HTMLInputElement | null;
      if (el) el.value = String(input.weight);
      recalc(); drawCharts(); renderTable();
    });
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tr.click(); }
    });
    tr.addEventListener("mouseenter", () => {
      const w = Number(tr.dataset.w);
      const i = Math.min(36, Math.max(0, Math.round((w - 2) / 0.5)));
      ch1?.dispatchAction({ type: "highlight", seriesIndex: 0, dataIndex: i });
    });
    tr.addEventListener("mouseleave", () => {
      ch1?.dispatchAction({ type: "downplay", seriesIndex: 0 });
    });
  });

  document.getElementById("csv-btn")!.addEventListener("click", () => {
    const header = "weight_kg,A_kcal,B_kcal,C_kcal,D_kcal,fluid_ml,ml_at_density";
    const lines = rows.map((r) => [r.w, r.A, r.B, r.C, r.D, r.fluid, (r.C !== null && Number.isFinite(Number(r.C)) ? (Number(r.C) / input.density).toFixed(0) : "")].join(","));
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `whs-explorer-${input.sex}-${input.age}mo.csv`;
    a.click();
  });
}

// ---------- sources & methods ----------

function renderSources(): void {
  const src = (sourcesData as { sources: Record<string, unknown>[] }).sources;
  document.getElementById("sources-body")!.innerHTML = `
    <p class="small">${t("sources.intro")}</p>
    <p class="small">${t("sources.legend")}</p>
    <div class="card"><ol>
    ${src.map((s) => {
      const g = String((s as Record<string, unknown>).evidence_class ?? "D");
      const links: string[] = [];
      if (s.doi) links.push(`<a href="https://doi.org/${s.doi}" rel="noopener">doi:${s.doi}</a>`);
      if (s.pmid) links.push(`<a href="https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/" rel="noopener">PMID ${s.pmid}</a>`);
      if (s.url && !s.doi) links.push(`<a href="${s.url}" rel="noopener">link</a>`);
      return `<li><span class="badge grade${g}">${g}</span> ${s.citation ?? s.title} ${links.join(" · ")}
        <span class="small">[${s.verified ? t("sources.verified") : "UNVERIFIED"} · ${t("sources.accessed")}: ${s.accessed}]</span>
        ${s.notes ? `<div class="small" lang="en" title="nota źródłowa (j. angielski)">${s.notes}</div>` : ""}</li>`;
    }).join("")}
    </ol></div>`;
}

// ---------- content sections (why / flags / rules) ----------

interface BiText { pl: string; en: string; }
interface ItemT { text: BiText; check?: BiText; consult?: string[]; grade: string; sources: string[]; wspecific?: boolean; level?: string; }
const B = (x: BiText | undefined): string => (x ? x[lang] : "");

function srcLinks(ids: string[]): string {
  return ids.map((s) => `<a href="#sources">${s}</a>`).join(", ");
}
function gradeBadge(g: string): string {
  const letter = (g || "D").trim()[0]?.toUpperCase() ?? "D";
  const known = ["A", "B", "C", "D"].includes(letter) ? letter : "D";
  return `<span class="badge grade${known}">${g}</span>`;
}

function renderWhy(): void {
  const R = reasons as unknown as { intro: BiText; consultLabels: Record<string, BiText>; groups: { id: string; title: BiText; items: ItemT[] }[] };
  const html = [`<p class="card small">${B(R.intro)}</p>`];
  for (const g of R.groups) {
    const items = g.items
      .map(
        (it, ii) => `
      <div id="why-${g.id}-i${ii}" style="margin:.7rem 0;padding-top:.5rem;border-top:1px solid var(--line)">
        <p>${B(it.text)} ${it.wspecific ? `<span class="badge">WHS</span>` : ""} ${gradeBadge(it.grade)}</p>
        ${it.check ? `<p class="small">${lang === "pl" ? "Jak sprawdzić" : "How to check"}: ${B(it.check)}</p>` : ""}
        ${it.consult ? `<p class="small">${lang === "pl" ? "Kogo zobaczyć" : "Who to see"}: ${it.consult.map((c) => (R.consultLabels[c] ? B(R.consultLabels[c]) : c)).join(", ")}</p>` : ""}
        <p class="small">${lang === "pl" ? "Źródła" : "Sources"}: ${srcLinks(it.sources)}</p>
      </div>`,
      )
      .join("");
    html.push(`<div class="card"><h3>${B(g.title)}</h3>${items}</div>`);
  }
  document.getElementById("why-body")!.innerHTML = html.join("");
}

function renderFlags(): void {
  const F = flags as unknown as { intro: BiText; levels: Record<string, BiText>; items: ItemT[] };
  const cls: Record<string, string> = { now: "crit", week: "warn", visit: "" };
  const html = [`<p class="card small">${B(F.intro)}</p>`];
  for (const lvl of ["now", "week", "visit"]) {
    const items = F.items
      .filter((i) => i.level === lvl)
      .map(
        (it, ii) => `
      <div id="flag-${lvl}-i${ii}" style="margin:.6rem 0;padding-top:.5rem;border-top:1px solid var(--line)">
        <p>${B(it.text)} ${it.wspecific ? `<span class="badge">WHS</span>` : ""} ${gradeBadge(it.grade)}</p>
        <p class="small">${lang === "pl" ? "Źródła" : "Sources"}: ${srcLinks(it.sources)}</p>
      </div>`,
      )
      .join("");
    html.push(`<div class="card ${cls[lvl]}"><h3>${B(F.levels[lvl])}</h3>${items}</div>`);
  }
  document.getElementById("flags-body")!.innerHTML = html.join("");
}

function renderRules(): void {
  const RR = rules as unknown as { intro: BiText; blocks: { id: string; title: BiText; items: ItemT[] }[] };
  const html = [`<p class="card small">${B(RR.intro)}</p>`];
  for (const bl of RR.blocks) {
    const items = bl.items
      .map(
        (it, ii) => `
      <div id="rule-${bl.id}-i${ii}" style="margin:.6rem 0;padding-top:.5rem;border-top:1px solid var(--line)">
        <p>${B(it.text)} ${gradeBadge(it.grade)}</p>
        <p class="small">${lang === "pl" ? "Źródła" : "Sources"}: ${srcLinks(it.sources)}</p>
      </div>`,
      )
      .join("");
    html.push(`<div class="card"><h3>${B(bl.title)}</h3>${items}</div>`);
  }
  document.getElementById("rules-body")!.innerHTML = html.join("");
}

// ---------- products (§8) ----------

interface PItem {
  id: string; kind: string; category: string;
  name: BiText;
  form?: BiText;
  warning?: BiText;
  basis: "g" | "ml";
  per100: Record<string, number | null>;
  measures: { label: BiText; kcal: number | null; note?: BiText }[];
  tags: string[];
  source: { label: BiText | string; url: string };
}

let pSearch = "";
let pCat = "all";
let pSort = "kcal";

function buildProducts(): PItem[] {
  const fsmp = (productsContent as unknown as { items: PItem[] }).items.map((x) => ({ ...x, kind: "fsmp" }));
  interface FoodRow {
    id: string; category: string; name: BiText; tags?: string[]; warning?: BiText; per100g: Record<string, number | null>;
    portions: { desc: string; g: number }[]; fdc_id: string; fdc_desc: string;
  }
  const foods = (foodsData as unknown as { items: FoodRow[] }).items.map((x) => {
    const n = x.per100g;
    const tags: string[] = [...(x.tags ?? [])];
    if (x.category === "fats" || (n.kcal ?? 0) >= 200) tags.push("high-energy");
    if ((n.protein ?? 0) >= 10) tags.push("high-protein");
    if ((n.iron_mg ?? 0) >= 2) tags.push("Fe");
    if ((n.zinc_mg ?? 0) >= 1.5) tags.push("Zn");
    if ((n.calcium_mg ?? 0) >= 100) tags.push("Ca");
    if ((n.vitd_ug ?? 0) >= 1) tags.push("vitD");
    if ((n.fibre ?? 0) >= 4) tags.push("fibre");
    if (["food-salmon", "food-mackerel", "food-sardines", "food-flax"].includes(x.id)) tags.push("omega3");
    if (x.category === "dairy") tags.push("dairy");
    return {
      id: x.id, kind: "food", category: x.category, name: x.name, basis: "g" as const,
      per100: n,
      warning: x.warning,
      measures: (x.portions ?? []).map((p) => ({
        label: { pl: `≈ <span lang="en">${p.desc}</span> (${String(p.g).replace(".", ",")} g)`, en: `≈ ${p.desc} (${p.g} g)` },
        kcal: n.kcal !== null && n.kcal !== undefined ? Math.round((n.kcal * p.g) / 100) : null,
      })),
      tags: Array.from(new Set(tags)),
      source: { label: { pl: "USDA FDC — karta produktu (opis oryginalny w j. angielskim)", en: `${x.fdc_desc} — USDA FDC` }, url: `https://fdc.nal.usda.gov/food-details/${x.fdc_id}/nutrients` },
    };
  });
  return [...fsmp, ...foods];
}

function renderProducts(): void {
  const all = buildProducts();
  const cats = Array.from(new Set(all.map((x) => x.category)));
  const catsNode = (base as { products: { cats: Record<string, Record<string, string>> } }).products.cats;
  const tagNode = (base as { products: { taglabels: Record<string, Record<string, string>> } }).products.taglabels;
  const catLabel = (c: string): string => catsNode[lang]?.[c] ?? c;
  const tagLabel = (tag: string): string => tagNode[lang]?.[tag] ?? tag;

  document.getElementById("products-body")!.innerHTML = `
    <p class="small">${t("products.foods_note")}</p>
    <div class="card" style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:end">
      <div style="flex:1 1 220px"><label for="p-search">${t("products.search")}</label><input id="p-search" type="search" value="${pSearch.replace(/"/g, "&quot;")}"></div>
      <div><label for="p-cat">${t("products.category")}</label>
        <select id="p-cat"><option value="all">${t("products.all")}</option>${cats.map((c) => `<option value="${c}"${pCat === c ? " selected" : ""}>${catLabel(c)}</option>`).join("")}</select></div>
      <div><label for="p-sort">${t("products.sort")}</label>
        <select id="p-sort">
          <option value="kcal"${pSort === "kcal" ? " selected" : ""}>${t("products.sort_kcal")}</option>
          <option value="protein"${pSort === "protein" ? " selected" : ""}>${t("products.sort_protein")}</option>
          <option value="name"${pSort === "name" ? " selected" : ""}>${t("products.sort_name")}</option>
        </select></div>
      <div class="small" id="p-count"></div>
    </div>
    <div id="p-list"></div>`;

  const search = document.getElementById("p-search") as HTMLInputElement;
  const cat = document.getElementById("p-cat") as HTMLSelectElement;
  const sort = document.getElementById("p-sort") as HTMLSelectElement;
  search.addEventListener("input", () => { pSearch = search.value; paint(); });
  cat.addEventListener("change", () => { pCat = cat.value; paint(); });
  sort.addEventListener("change", () => { pSort = sort.value; paint(); });

  const strip = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase();
  const pn = (v: number | null | undefined): string => (v === null || v === undefined ? "—" : v.toLocaleString(lang === "pl" ? "pl-PL" : "en-GB", { maximumFractionDigits: 2 }));
  const plural = (n: number): string => (n === 1 ? t("products.count1") : n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? t("products.count2") : t("products.count"));

  function paint(): void {
    let list = all.filter((x) => (pCat === "all" ? true : x.category === pCat));
    const q = strip(pSearch.trim());
    if (q) list = list.filter((x) => strip(`${x.name.pl} ${x.name.en} ${x.tags.join(" ")} ${x.tags.map(tagLabel).join(" ")} ${catLabel(x.category)} ${x.form ? x.form.pl + " " + x.form.en : ""}`).includes(q));
    list.sort((a, b) => {
      if (pSort === "name") return a.name[lang].localeCompare(b.name[lang]);
      const key = pSort === "kcal" ? "kcal" : "protein";
      return (b.per100[key] ?? -1) - (a.per100[key] ?? -1);
    });
    document.getElementById("p-count")!.textContent = `${list.length} ${plural(list.length)}`;
    document.getElementById("p-list")!.innerHTML = `<div class="grid2">` + list.map((x) => {
      const n = x.per100;
      const basis = x.basis === "g" ? "100 g" : "100 ml";
      const meas = x.measures.length
        ? `<p class="small">${t("products.household")}: ${x.measures.slice(0, 3).map((m) => `${B(m.label)}${m.kcal !== null && m.kcal !== undefined ? " = " + pn(m.kcal) + " kcal" : ""}${m.note ? " (" + B(m.note) + ")" : ""}`).join(" · ")}</p>`
        : "";
      return `<div class="card" id="prod-${x.id}">
        <p><b>${x.name[lang]}</b></p>
        ${x.form ? `<p class="small">${B(x.form)}</p>` : ""}
        ${x.warning ? `<p class="banner crit small">${B(x.warning)}</p>` : ""}
        <p class="small">${basis}: <b>${pn(n.kcal)} kcal</b> · ${lang === "pl" ? "B" : "P"} ${pn(n.protein)} g · ${lang === "pl" ? "T" : "F"} ${pn(n.fat)} g · ${lang === "pl" ? "W" : "C"} ${pn(n.carbs)} g${n.fibre ? ` · ${tagLabel("fibre")} ${pn(n.fibre)} g` : ""}${n.iron_mg ? ` · Fe ${pn(n.iron_mg)} mg` : ""}${n.zinc_mg ? ` · Zn ${pn(n.zinc_mg)} mg` : ""}${n.calcium_mg ? ` · Ca ${pn(n.calcium_mg)} mg` : ""}${n.vitd_ug ? ` · D ${pn(n.vitd_ug)} µg` : ""}</p>
        <p>${x.tags.map((tg) => `<span class="badge">${tagLabel(tg)}</span>`).join(" ")}</p>
        ${meas}
        <p class="small">${t("products.source")}: <a href="${x.source.url}" rel="noopener">${typeof x.source.label === "string" ? x.source.label : B(x.source.label as BiText)}</a></p>
      </div>`;
    }).join("") + `</div>`;
  }
  paint();
}

function renderMethod(): void {
  document.getElementById("method-body")!.innerHTML = `
    <div class="card">
      ${(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"] as const).map((k) => `<p>${t(`method.${k}`)}</p>`).join("")}
      <p class="small">research/data/whs_growth/provenance.md · research/data/whs_growth/provenance_2025.md · research/qa/crosscheck-report.md · DECISIONS.md</p>
    </div>`;
}

// ---------- theme ----------

type Theme = "dark" | "light";
const mqDark = window.matchMedia("(prefers-color-scheme: dark)");

function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem("whs-theme");
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

function effectiveTheme(): Theme {
  const st = storedTheme();
  if (st) return st;
  const attr = document.documentElement.dataset.theme;
  return attr === "dark" || attr === "light" ? attr : (mqDark.matches ? "dark" : "light");
}

function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("whs-theme", t);
  } catch { /* storage unavailable */ }
}

function updateScrollPad(): void {
  const h = document.querySelector("header.top");
  if (h) document.documentElement.style.setProperty("--hdrh", `${(h as HTMLElement).offsetHeight}px`);
}

// ---------- global search (Ctrl+K) ----------

interface SItem { anchor: string; section: string; title: string; text: string; }
let fuse: Fuse<SItem> | null = null;
let searchHits: SItem[] = [];
let searchSel = 0;
let searchReturnFocus: HTMLElement | null = null;

function buildSearchIndex(): SItem[] {
  const items: SItem[] = [];
  const R = reasons as unknown as { intro: BiText; groups: { id: string; title: BiText; items: ItemT[] }[] };
  const F = flags as unknown as { intro: BiText; levels: Record<string, BiText>; items: (ItemT & { level: string })[] };
  const RR = rules as unknown as { intro: BiText; blocks: { id: string; title: BiText; items: ItemT[] }[] };
  // section-level entries (audit C1: queries like "sygnały" must hit the section)
  const introFor: Record<string, string> = { why: B(R.intro), flags: B(F.intro), rules: B(RR.intro) };
  (["start", "calc", "charts", "table", "why", "flags", "rules", "products", "sources", "method"] as const).forEach((id) => {
    items.push({ anchor: id, section: t(`nav.${id}`), title: t(`nav.${id}`), text: introFor[id] ?? "" });
  });
  R.groups.forEach((g) => {
    g.items.forEach((it, ii) => {
      items.push({
        anchor: `why-${g.id}-i${ii}`, section: t("nav.why"), title: B(g.title),
        text: `${B(it.text)} ${it.check ? B(it.check) : ""}`,
      });
    });
  });
  const lvlIdx: Record<string, number> = {};
  F.items.forEach((it) => {
    const k = lvlIdx[it.level] ?? 0;
    lvlIdx[it.level] = k + 1;
    items.push({ anchor: `flag-${it.level}-i${k}`, section: t("nav.flags"), title: B(F.levels[it.level]), text: B(it.text) });
  });
  RR.blocks.forEach((bl) => {
    bl.items.forEach((it, ii) => {
      items.push({ anchor: `rule-${bl.id}-i${ii}`, section: t("nav.rules"), title: B(bl.title), text: B(it.text) });
    });
  });
  // products: localized tag/category labels + form + warning (audit C2)
  const tagNode = (base as { products: { taglabels: Record<string, Record<string, string>> } }).products.taglabels;
  const catsNode = (base as { products: { cats: Record<string, Record<string, string>> } }).products.cats;
  buildProducts().forEach((x) => {
    const tagTxt = x.tags.map((tg) => tagNode[lang]?.[tg] ?? tg).join(" ");
    items.push({
      anchor: `prod-${x.id}`, section: t("nav.products"), title: x.name[lang],
      text: `${x.name.pl} ${x.name.en} ${x.tags.join(" ")} ${tagTxt} ${catsNode[lang]?.[x.category] ?? x.category} ${x.form ? B(x.form) : ""} ${x.warning ? B(x.warning) : ""} ${x.per100.kcal ?? ""} kcal / ${x.basis === "g" ? "100 g" : "100 ml"}`,
    });
  });
  return items;
}

function ensureFuse(): Fuse<SItem> {
  if (!fuse) {
    fuse = new Fuse(buildSearchIndex(), {
      keys: [{ name: "title", weight: 0.6 }, { name: "text", weight: 0.4 }],
      threshold: 0.38, ignoreLocation: true, ignoreDiacritics: true, minMatchCharLength: 2,
    });
  }
  return fuse;
}

function openSearch(): void {
  const ov = document.getElementById("search-overlay") as HTMLElement | null;
  if (!ov || !ov.hidden) return;
  ensureFuse();
  searchReturnFocus = (document.activeElement as HTMLElement | null) ?? null;
  ov.hidden = false;
  const inp = document.getElementById("search-input") as HTMLInputElement | null;
  if (inp) { inp.value = ""; runSearch(""); inp.focus(); }
}

function closeSearch(): void {
  const ov = document.getElementById("search-overlay") as HTMLElement | null;
  if (ov) ov.hidden = true;
  const rf = searchReturnFocus;
  searchReturnFocus = null;
  if (rf && document.contains(rf) && typeof rf.focus === "function") rf.focus();
}

function goSearch(anchor: string): void {
  closeSearch();
  const el = document.getElementById(anchor);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("hl-flash");
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    (el as HTMLElement).focus({ preventScroll: true });
    window.setTimeout(() => el.classList.remove("hl-flash"), 1800);
  }
}

function trapTab(e: KeyboardEvent): void {
  if (e.key !== "Tab") return;
  const panel = document.querySelector("#search-overlay .search-panel");
  if (!panel) return;
  const focusables = Array.from(panel.querySelectorAll<HTMLElement>("input, button")).filter((x) => !x.hasAttribute("disabled"));
  if (!focusables.length) return;
  const first = focusables[0]!;
  const last = focusables[focusables.length - 1]!;
  const active = document.activeElement as HTMLElement | null;
  if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}

function paintSearchActive(): void {
  document.querySelectorAll("#search-results li[data-a]").forEach((li, i) => {
    li.classList.toggle("active", i === searchSel);
    if (i === searchSel) li.scrollIntoView({ block: "nearest" });
  });
  const inp = document.getElementById("search-input");
  if (inp && searchHits.length) inp.setAttribute("aria-activedescendant", `search-r${searchSel}`);
}

function runSearch(q: string): void {
  const list = document.getElementById("search-results");
  const inp = document.getElementById("search-input") as HTMLInputElement | null;
  if (!list) return;
  searchSel = 0;
  const query = q.trim();
  if (query.length < 2) {
    searchHits = [];
    list.innerHTML = `<li class="small">${t("search.empty")}</li>`;
    inp?.removeAttribute("aria-activedescendant");
    return;
  }
  searchHits = ensureFuse().search(query, { limit: 12 }).map((r) => r.item);
  if (!searchHits.length) {
    list.innerHTML = `<li class="small">${t("search.none")}</li>`;
    inp?.removeAttribute("aria-activedescendant");
    return;
  }
  list.innerHTML = searchHits
    .map((h, i) => `<li id="search-r${i}" data-a="${h.anchor}"${i === 0 ? ' class="active"' : ""}><b>${h.title}</b><div class="small">${h.section} · ${h.text.replace(/<[^>]+>/g, "").slice(0, 100)}</div></li>`)
    .join("");
  inp?.setAttribute("aria-activedescendant", "search-r0");
}

function searchKey(e: KeyboardEvent): void {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (searchHits.length) { searchSel = (searchSel + 1) % searchHits.length; paintSearchActive(); }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (searchHits.length) { searchSel = (searchSel - 1 + searchHits.length) % searchHits.length; paintSearchActive(); }
  } else if (e.key === "Enter") {
    e.preventDefault();
    const hit = searchHits[searchSel];
    if (hit) goSearch(hit.anchor);
  } else if (e.key === "Escape") {
    closeSearch();
  }
}

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
    const ov = document.getElementById("search-overlay") as HTMLElement | null;
    if (ov && !ov.hidden) return; // already open — do not reset (audit C3)
    e.preventDefault();
    openSearch();
  } else if (e.key === "Escape") {
    const ov = document.getElementById("search-overlay");
    if (ov && !(ov as HTMLElement).hidden) closeSearch();
  }
});

// ---------- boot ----------

let resizeBound = false;

function renderAll(): void {
  document.documentElement.lang = lang;
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute("content", t("meta_desc"));
  fuse = null;
  renderShell();
  renderStart();
  renderCalcForm();
  renderChartsShell();
  renderTable();
  renderWhy();
  renderFlags();
  renderRules();
  renderProducts();
  renderSources();
  renderMethod();
  recalc();
  drawCharts();
  updateScrollPad();
  if (!resizeBound) {
    resizeBound = true;
    window.addEventListener("resize", () => { ch1?.resize(); ch2?.resize(); ch3?.resize(); updateScrollPad(); }, { passive: true });
  }
}

const __st = storedTheme();
if (__st) document.documentElement.dataset.theme = __st;
renderAll();
