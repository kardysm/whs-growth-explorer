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
import nutrientsContent from "../../content/nutrients.json";
import foodsData from "../data/products_foods.json";
import { computeAll, refeedingScreen } from "../calc/methods.js";
import { loadContext } from "../calc/load.js";
import { whoTable, weightForLengthZ } from "../calc/who.js";
import { descPl } from "./desc-pl.js";
import type { CalcInput } from "../calc/types.js";
import { calcUrlParams, langFromPath, parseCalcParams, parseMilkProduct, parseProductsParams, productsUrlParams, siteRoot } from "./urlstate.js";
import type { Inputs, Lang } from "./urlstate.js";

const { dataset, whs } = loadContext();
const ctx = { who: dataset.who, whs };

// Language lives in the URL path (/pl/ or /en/; root defaults to en) — user request 2026-10-07.
let lang: Lang = langFromPath(location.pathname) ?? "en";
let unit: "kcal" | "kJ" = "kcal";

let input: Inputs = {
  sex: "boys",
  age: 18,
  weight: 8,
  length: 74,
  tone: "hypotonic",
  mobility: "dependent",
  targetRef: "whs_mean",
  horizonWeeks: 12,
  milkDensity: 0.67,
  mealDensity: 1.0,
  milkMl: 500,
  feeds: null,
  milkPortionMl: null,
  mealPortionG: null,
  intake: null,
};

// Persistence (user request 2026-10-07, D-082): the calculator state lives ONLY in the URL —
// the opt-in localStorage store is removed. Clean up its key if a browser still has it.
try { localStorage.removeItem("whs-calc-inputs-v1"); } catch { /* ignore */ }

// --- URL state plumbing (2026-10-07) ---------------------------------------
// Merges updates into the query string; replaces history (no new entries) and
// is a no-op when nothing changed. Calc params write immediately (low-frequency
// change events); products/search are debounced below.
function setUrlParams(updates: Record<string, string | string[] | null>): void {
  const u = new URL(location.href);
  for (const [k, v] of Object.entries(updates)) {
    u.searchParams.delete(k);
    if (v === null) continue;
    if (Array.isArray(v)) for (const x of v) u.searchParams.append(k, x);
    else u.searchParams.set(k, v);
  }
  const next = u.pathname + u.search + u.hash;
  if (next !== location.pathname + location.search + location.hash) history.replaceState(null, "", next);
}
const urlDirty = new Set<"products" | "search">();
let urlTimer: number | undefined;
function scheduleUrlSync(domain: "products" | "search"): void {
  urlDirty.add(domain);
  window.clearTimeout(urlTimer);
  urlTimer = window.setTimeout(() => {
    if (urlDirty.has("products")) setUrlParams(productsUrlParams({ search: pSearch, chips: pChips, cat: pCat, sort: pSort }));
    if (urlDirty.has("search")) setUrlParams({ q: overlayQ.trim() ? overlayQ : null });
    urlDirty.clear();
  }, 300);
}
let overlayQ = "";

// --- milk products (density selector in the form; user request 2026-10-07) --
// The milk energy density is now a PRODUCT choice: the form's field is a select over these items
// (same list the balance card used to offer), and the density follows the product everywhere.
interface MilkItem { id: string; name: BiText; per100: Record<string, number | null | undefined>; }
function milkItems(): MilkItem[] {
  const items = (productsContent as unknown as { items: MilkItem[] }).items;
  return items
    .filter((x) => x.id !== "fsmp-fantomalt" && x.id !== "fsmp-protifar")
    .sort((a, b) => (Number(a.per100["kcal"]) || 0) - (Number(b.per100["kcal"]) || 0));
}
/** kcal/100 ml -> "0,67" (2 dp, trailing zeros trimmed, locale comma). */
function fmtDens(kcal100: number): string {
  const s = (kcal100 / 100).toFixed(2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return lang === "pl" ? s.replace(".", ",") : s;
}
/** Rounded energy density (kcal/ml) of a milk product, or null when unknown. */
function milkDensityOf(id: string): number | null {
  const k = Number(milkItems().find((m) => m.id === id)?.per100["kcal"]);
  return Number.isFinite(k) && k > 0 ? Math.round(k) / 100 : null;
}

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

/** Localized string ARRAY lookup (for list-shaped strings, e.g. converted enumerations). */
function tl(path: string): string[] {
  const parts = path.split(".");
  let node: unknown = base;
  for (const p of parts) {
    if (node && typeof node === "object" && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p];
    } else return [];
  }
  if (node && typeof node === "object" && lang in (node as Record<string, string[]>)) {
    return (node as Record<string, string[]>)[lang] ?? [];
  }
  return [];
}

/** Render a localized string array as <li> items for an existing <ul>. */
function li(path: string): string {
  return tl(path).map((x) => `<li>${x}</li>`).join("");
}

function fmt(kcal: number | null | undefined, dec = 0): string {
  if (kcal === null || kcal === undefined || !Number.isFinite(kcal)) return "—";
  const v = unit === "kcal" ? kcal : kcal * 4.184;
  return v.toLocaleString(lang === "pl" ? "pl-PL" : "en-GB", { maximumFractionDigits: dec, minimumFractionDigits: 0 });
}

const loc = (v: number): string => fmt(v, 2);

/** Minimal HTML-escape for user-typed strings (search chips). */
const esc = (s: string): string => s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m] as string);

// US customary -> metric in portion descriptions (user request, 2026-10-03: no "oz" shown in the UI).
// The `\.\d+` alternative handles USDA's dot-leading decimals (".5 oz"), which used to convert as "5 oz".
function metricDesc(d: string): { text: string; converted: boolean } {
  const frac = (n: string): number => (n.includes("/") ? Number(n.split("/")[0]) / Number(n.split("/")[1]) : Number(n));
  let changed = false;
  const text = d
    .replace(/(\.\d+|\d+(?:\.\d+)?|\d+\/\d+)\s*fl\s+oz\b/gi, (_: string, n: string) => { changed = true; return `${Math.round(frac(n) * 29.5735)} ml`; })
    .replace(/(\.\d+|\d+(?:\.\d+)?|\d+\/\d+)\s*oz\b/gi, (_: string, n: string) => { changed = true; return `${Math.round(frac(n) * 28.3495)} g`; });
  return { text, converted: changed };
}

function bandStr(b: { low: number | null; central: number | null; high: number | null }): string {
  if (b.central === null) return "—";
  // Degenerate band (single scenario value, e.g. D-2): show ONE number, not "x – x – x"
  // (user report 2026-10-07: the middle value often coincides with an edge — it is the CHOSEN
  // estimate, not a median; the band notes say so).
  if (b.low === b.central && b.central === b.high) return `${fmt(b.central)} ${unit === "kcal" ? "kcal" : "kJ"}/24h`;
  return `${fmt(b.low)} – ${fmt(b.central)} – ${fmt(b.high)} ${unit === "kcal" ? "kcal" : "kJ"}/24h`;
}

// ---------- shell ----------

let navEscBound = false;
/** Re-open the mobile menu after a language switch triggered from inside it (2026-10-05). */
let reopenNav = false;

function renderShell(): void {
  app.innerHTML = `
  <div id="top" aria-hidden="true"></div>
  <a class="skip-link" href="#main">${t("a11y.skip")}</a>
  <header class="top">
    <h1><a href="#top">WHS Feeding &amp; Growth Explorer</a></h1>
    <button type="button" class="hdr-btn nav-toggle" id="nav-toggle-btn" aria-expanded="false" aria-controls="main-nav" aria-label="${t("nav.menu")}">☰ <span class="small">${t("nav.menu")}</span></button>
    <nav class="main" id="main-nav" aria-label="${t("nav.aria")}">
      ${( ["calc","results","charts","table","why","flags","rules","products","sources","method"] as const)
        .map((k) => `<a href="#${k}">${t(`nav.${k}`)}</a>`).join("")}
      <div class="menu-tools">
        <div class="lang-toggle" role="group" aria-label="język / language">
          <button type="button" data-lang="pl" aria-pressed="${lang === "pl"}">PL</button>
          <button type="button" data-lang="en" aria-pressed="${lang === "en"}">EN</button>
        </div>
        <button type="button" class="hdr-btn theme-toggle" aria-label="${t("theme.toggle")}" data-tip="${t("theme.toggle")}" aria-pressed="${effectiveTheme() === "dark"}">🌓 ${t("theme.toggle")}</button>
      </div>
    </nav>
    <div class="lang-toggle hdr-only" role="group" aria-label="język / language">
      <button type="button" data-lang="pl" aria-pressed="${lang === "pl"}">PL</button>
      <button type="button" data-lang="en" aria-pressed="${lang === "en"}">EN</button>
    </div>
    <button type="button" class="hdr-btn" id="search-open" aria-label="${t("search.open")}">🔍 ${t("search.open")} <span class="small">Ctrl+K</span></button>
    <button type="button" class="hdr-btn theme-toggle hdr-only" id="theme-toggle" aria-label="${t("theme.toggle")}" data-tip="${t("theme.toggle")}" aria-pressed="${effectiveTheme() === "dark"}">🌓</button>
  </header>
  <main id="main" tabindex="-1">
    <p class="banner" id="disclaimer">${t("disclaimer_short")}</p>
    <section id="start"><h2>${t("start.title")}</h2><div id="start-body"></div></section>
    <section id="calc"><h2>${t("calc.title")}</h2><div id="calc-body"></div></section>
    <section id="results"><h2>${t("calc.results_title")}</h2><div id="results-body"></div></section>
    <section id="charts"><h2>${t("charts.title")}</h2><div id="charts-body"></div></section>
    <section id="table"><h2>${t("table.title")}</h2><div id="table-body"></div></section>
    <section id="why"><h2>${t("nav.why")}</h2><div id="why-body"></div></section>
    <section id="flags"><h2>${t("nav.flags")}</h2><div id="flags-body"></div></section>
    <section id="rules"><h2>${t("nav.rules")}</h2><div id="rules-body"></div></section>
    <section id="products"><h2>${t("nav.products")}</h2><div id="products-body"></div></section>
    <section id="sources"><h2>${t("sources.title")}</h2><div id="sources-body"></div></section>
    <section id="method"><h2>${t("method.title")}</h2><div id="method-body"></div></section>
  </main>
  <footer><p>${t("footer")}</p>
    <p class="small" id="footer-links">${t("footer_source_label")}: <a href="https://github.com/kardysm/whs-growth-explorer" target="_blank" rel="noopener">github.com/kardysm/whs-growth-explorer</a> · ${t("footer_contact_label")}: <a href="mailto:whs@kardys.dev">whs@kardys.dev</a></p>
    <p class="small" id="build-stamp">${t("meta.stamp").replace("{v}", __BUILD_VERSION__).replace("{date}", __BUILD_DATE__).replace("{commit}", __BUILD_COMMIT__)}</p>
  </footer>
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
      const next = (b.dataset.lang as Lang) ?? "en";
      if (next !== lang) {
        lang = next;
        // Language = URL path (user request 2026-10-07): push a history entry so Back returns to the other language.
        history.pushState(null, "", `${siteRoot(location.pathname)}${lang}/${location.search}${location.hash}`);
      }
      // keep the mobile menu open when the switch happens from inside it (user request 2026-10-05)
      reopenNav = !!document.getElementById("main-nav")?.classList.contains("open");
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
  si?.addEventListener("input", () => { overlayQ = si.value; runSearch(si.value); scheduleUrlSync("search"); });
  si?.addEventListener("keydown", (e) => searchKey(e as KeyboardEvent));
  document.getElementById("search-results")?.addEventListener("click", (e) => {
    const li = (e.target as HTMLElement).closest("li[data-a]");
    if (li) goSearch(li.getAttribute("data-a")!);
  });
  document.querySelectorAll<HTMLElement>(".theme-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = effectiveTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      document.querySelectorAll(".theme-toggle").forEach((b) => b.setAttribute("aria-pressed", String(next === "dark")));
      drawCharts();
    });
  });
  // mobile hamburger menu (kanban card, 2026-10-03)
  const navToggleBtn = document.getElementById("nav-toggle-btn");
  const navEl = document.getElementById("main-nav");
  if (navToggleBtn && navEl) {
    const closeNav = (): void => {
      navEl.classList.remove("open");
      navToggleBtn.setAttribute("aria-expanded", "false");
      updateScrollPad();
    };
    navToggleBtn.addEventListener("click", () => {
      const open = navEl.classList.toggle("open");
      navToggleBtn.setAttribute("aria-expanded", String(open));
      updateScrollPad();
    });
    navEl.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("a")) closeNav();
    });
    // language switch from inside the menu keeps it open (user request 2026-10-05)
    if (reopenNav) {
      navEl.classList.add("open");
      navToggleBtn.setAttribute("aria-expanded", "true");
      reopenNav = false;
      updateScrollPad();
    }
    if (!navEscBound) {
      navEscBound = true;
      document.addEventListener("keydown", (e) => {
        const n = document.getElementById("main-nav");
        const b = document.getElementById("nav-toggle-btn");
        if (e.key === "Escape" && n?.classList.contains("open")) {
          n.classList.remove("open");
          b?.setAttribute("aria-expanded", "false");
          (b as HTMLElement | null)?.focus();
          updateScrollPad();
        }
      });
    }
  }
}

function renderStart(): void {
  const intro = (base.start.intro as Record<string, string[]>)[lang] ?? [];
  const howto = (base.start.howto as Record<string, string[]>)[lang] ?? [];
  const safety = (base.start.safety as Record<string, string[]>)[lang] ?? [];
  document.getElementById("start-body")!.innerHTML = `
    <div class="cards-grid">
      <div class="card"><ul class="tight">${intro.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      <div class="card"><h3>${t("start.howto_title")}</h3><ol>${howto.map((x) => `<li>${x}</li>`).join("")}</ol></div>
      <div class="card"><h3>${t("start.safety_title")}</h3><ul class="tight">${safety.map((x) => `<li>${x}</li>`).join("")}</ul></div>
    </div>`;
}

// ---------- calculator ----------

/** Reads every calculator form field into `input`, persists when opted in, and recalcs.
 *  Module-level so the form bindings and the milk card share it. */
function readInputs(): void {
  // The milk density follows the selected product (user request 2026-10-07).
  const milkSel = document.getElementById("in-milkd") as HTMLSelectElement | null;
  if (milkSel) milkProductId = milkSel.value;
  const milkDens = milkDensityOf(milkProductId);
  input = {
    sex: (document.getElementById("in-sex") as HTMLSelectElement).value as Inputs["sex"],
    age: Number((document.getElementById("in-age") as HTMLInputElement).value),
    weight: Number((document.getElementById("in-weight") as HTMLInputElement).value),
    length: (document.getElementById("in-length") as HTMLInputElement).value === "" ? null : Number((document.getElementById("in-length") as HTMLInputElement).value),
    tone: (document.getElementById("in-tone") as HTMLSelectElement).value as Inputs["tone"],
    mobility: (document.getElementById("in-mobility") as HTMLSelectElement).value as Inputs["mobility"],
    targetRef: (document.getElementById("in-target") as HTMLSelectElement).value as Inputs["targetRef"],
    horizonWeeks: Number((document.getElementById("in-horizon") as HTMLInputElement).value),
    milkDensity: milkDens ?? input.milkDensity,
    mealDensity: Number((document.getElementById("in-meald") as HTMLInputElement).value),
    milkMl: Number((document.getElementById("in-milkml") as HTMLInputElement).value),
    feeds: (document.getElementById("in-feeds") as HTMLInputElement).value === "" ? null : Number((document.getElementById("in-feeds") as HTMLInputElement).value),
    milkPortionMl: (document.getElementById("in-milkportion") as HTMLInputElement).value === "" ? null : Number((document.getElementById("in-milkportion") as HTMLInputElement).value),
    mealPortionG: (document.getElementById("in-mealportion") as HTMLInputElement).value === "" ? null : Number((document.getElementById("in-mealportion") as HTMLInputElement).value),
    intake: (document.getElementById("in-intake") as HTMLInputElement).value === "" ? null : Number((document.getElementById("in-intake") as HTMLInputElement).value),
  };
  // Mirror the state into the URL (shareable/reloadable links) — user request 2026-10-07.
  setUrlParams({ ...calcUrlParams(input), milk: milkProductId });
  recalc();
}

function renderCalcForm(): void {
  const b = document.getElementById("calc-body")!;
  // Milk density selector options (user request 2026-10-07: the field is a product list now).
  const milks = milkItems();
  if (!milks.some((m) => m.id === milkProductId)) milkProductId = milks[0]?.id ?? "";
  const milkOpts = milks
    .map((m) => {
      const k = Number(m.per100["kcal"]);
      const d = Number.isFinite(k) && k > 0 ? ` — ${fmtDens(k)} kcal/ml` : "";
      return `<option value="${m.id}"${m.id === milkProductId ? " selected" : ""}>${B(m.name)}${d}</option>`;
    })
    .join("");
  b.innerHTML = `
  <div class="cards-grid">
    <form class="card" id="calc-form" aria-label="calculator">
      <p class="small">${t("calc.hint")}</p>
      <p class="small">${t("calc.pointer")}</p>
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
      <p class="small hint">${t("calc.tone_hint")}</p>
      <label for="in-mobility">${t("calc.mobility")}</label>
      <select id="in-mobility">
        <option value="bedridden" ${input.mobility === "bedridden" ? "selected" : ""}>${t("calc.mob_bed")}</option>
        <option value="dependent" ${input.mobility === "dependent" ? "selected" : ""}>${t("calc.mob_dep")}</option>
        <option value="crawling" ${input.mobility === "crawling" ? "selected" : ""}>${t("calc.mob_crawl")}</option>
        <option value="ambulatory" ${input.mobility === "ambulatory" ? "selected" : ""}>${t("calc.mob_amb")}</option>
      </select>
      <details class="hint-toggle"><summary class="small">${t("calc.mob_hint_title")}</summary><ul class="tight small hint">${li("calc.mob_hint_items")}</ul><p class="small hint">${t("calc.mob_hint_note")}</p></details>
      <label for="in-target">${t("calc.target")}</label>
      <select id="in-target">
        <option value="whs_mean" ${input.targetRef === "whs_mean" ? "selected" : ""}>${t("calc.target_whs_mean")}</option>
        <option value="whs_minus1sd" ${input.targetRef === "whs_minus1sd" ? "selected" : ""}>${t("calc.target_whs_m1")}</option>
        <option value="who_wfl_median" ${input.targetRef === "who_wfl_median" ? "selected" : ""}>${t("calc.target_who_med")}</option>
      </select>
      <label for="in-horizon">${t("calc.horizon")}</label>
      <input id="in-horizon" type="number" min="4" max="52" step="1" value="${input.horizonWeeks}" />
      <label for="in-milkd">${t("calc.milk_density")}</label>
      <select id="in-milkd">${milkOpts}</select>
      <p class="small hint">${t("calc.milk_density_hint")}</p>
      <label for="in-milkml">${t("calc.milk_ml")}</label>
      <input id="in-milkml" type="number" min="0" max="1200" step="10" value="${input.milkMl}" />
      <label for="in-meald">${t("calc.meal_density")}</label>
      <input id="in-meald" type="number" min="0.2" max="3" step="0.05" value="${input.mealDensity}" />
      <p class="small hint">${t("calc.meal_density_hint")}</p>
      <label for="in-feeds">${t("calc.feeds")}</label>
      <input id="in-feeds" type="number" min="1" max="12" step="1" value="${input.feeds ?? ""}" />
      <label for="in-milkportion">${t("calc.milk_portion")}</label>
      <input id="in-milkportion" type="number" min="10" max="400" step="5" value="${input.milkPortionMl ?? ""}" />
      <label for="in-mealportion">${t("calc.meal_portion")}</label>
      <input id="in-mealportion" type="number" min="5" max="400" step="5" value="${input.mealPortionG ?? ""}" />
      <p class="small hint">${t("calc.portions_hint")}</p>
      <label for="in-intake">${t("calc.intake")}</label>
      <input id="in-intake" type="number" min="0" max="3000" step="10" value="${input.intake ?? ""}" />
      <p class="small">${t("calc.url_hint")}</p>
      <button class="primary" type="button" id="btn-recalc">${t("calc.compute")}</button>
    </form>
  </div>`;
  document.getElementById("results-body")!.innerHTML = `
    <div id="refeed-slot"></div>
    <div class="card small" id="grades-card"><p>${t("calc.grades_hint")}</p><ul class="tight small">${li("calc.grades_hint_items")}</ul><p class="small">${t("calc.grades_hint_note")}</p></div>
    <div class="cards-flow">
      <div id="results-cards"></div>
      <div id="milk-card"></div>
    </div>`;

  for (const id of ["in-sex", "in-age", "in-weight", "in-length", "in-tone", "in-mobility", "in-target", "in-horizon", "in-milkd", "in-milkml", "in-meald", "in-feeds", "in-milkportion", "in-mealportion", "in-intake"]) {
    document.getElementById(id)!.addEventListener("change", readInputs);
  }
  document.getElementById("btn-recalc")!.addEventListener("click", readInputs);
  updateMilkCard();
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
    milkDensityKcalPerMl: input.milkDensity,
    mealDensityKcalPerG: input.mealDensity,
    milkMlPerDay: input.milkMl,
    feedsPerDay: input.feeds,
    milkPortionMl: input.milkPortionMl,
    mealPortionG: input.mealPortionG,
    actualIntakeKcalPerDay: input.intake,
    actualIntakeMlPerDay: null,
  };
  const r = computeAll(calcInput, ctx);
  lastR = r;
  const res = document.getElementById("results-cards")!;
  res.setAttribute("aria-live", "polite");

  // Refeeding-risk screen (audit H2, 2026-10-07): WHO weight-for-length <= -3 SD OR WHS z <= -2 SD
  // (without a length: WHS weight-for-age <= -2 SD). The old WHS-only "< -3 SD" screen almost never
  // fired (12-mo boy of 66.5 cm: only below 3.25 kg; the WHO wfl -3 SD cut-off there is 6.0 kg).
  let refeeding = "";
  {
    const screen = refeedingScreen(calcInput, ctx);
    if (screen.flag) refeeding = `<p class="banner crit">${t("calc.refeeding_banner")}</p>`;
  }

  const card = (title: string, b: { low: number | null; central: number | null; high: number | null }, notes: BiText[] = [], ids: string[] = [], opts: { alerts?: BiText[]; grade?: string; extrap?: boolean; sub?: string; tip?: string; band?: string } = {}) => `
    <div class="card"><h3${opts.tip ? ` data-tip="${opts.tip}"` : ""}>${title} ${opts.grade ? `<span class="badge grade${opts.grade}" data-tip="${t(`calc.grade_${opts.grade.toLowerCase()}`)}">${opts.grade}<span class="sr-only"> (${t(`calc.grade_${opts.grade.toLowerCase()}`)})</span></span>` : ""}</h3>
      ${opts.sub ? `<p class="small sub">${opts.sub}</p>` : ""}
      <p><strong>${bandStr(b)}</strong></p>
      ${opts.band ? `<p class="small band-note">${opts.band}</p>` : ""}
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
  const refSlot = document.getElementById("refeed-slot");
  if (refSlot) {
    refSlot.innerHTML = refeeding;
    const hasBanner = refeeding !== "";
    if (hasBanner && !refeedShown) refSlot.querySelector(".banner")?.classList.add("anim-pop");
    refeedShown = hasBanner;
  }
  res.innerHTML = `
    ${card(t("calc.method_a_t"), r.A.kcalPerDay, r.A.notes, r.A.sourceIds, { grade: "A", sub: t("calc.method_a_sub"), tip: t("calc.method_a_tip"), band: t("calc.band_a") })}
    ${card(t("calc.method_b_t"), r.B.kcalPerDay, r.B.notes, r.B.sourceIds, { grade: "A", sub: t("calc.method_b_sub").replace("{wa}", wa !== null ? (lang === "pl" ? wa.toFixed(1).replace(".", ",") : wa.toFixed(1)) : "—"), tip: t("calc.method_b_tip"), band: t("calc.band_b") })}
    ${card(t("calc.method_c_t"), r.C.kcalPerDay, [
      ...(r.C.notes ?? []),
      { pl: `Ten sam wiek (A): ${r.percentOfA !== null ? r.percentOfA.toFixed(0) : "—"}% · Ta sama masa (B): ${r.percentOfB !== null ? r.percentOfB.toFixed(0) : "—"}%`, en: `Same age (A): ${r.percentOfA !== null ? r.percentOfA.toFixed(0) : "—"}% · Same weight (B): ${r.percentOfB !== null ? r.percentOfB.toFixed(0) : "—"}%` },
      ...(r.whsZ.weight !== null ? [{ pl: `Pozycja masy na siatce WHS: ≈ ${r.whsZ.weight.toFixed(1).replace(".", ",")} SD (0 = średnia WHS dla wieku; siatka zdigitalizowana 0–48 mies.)`, en: `Weight position on the WHS chart: ≈ ${r.whsZ.weight.toFixed(1)} SD (0 = WHS mean for age; digitized chart 0-48 mo)` }] : []),
      ...(input.length !== null && Number.isFinite(input.length)
        ? (() => {
          const wz = weightForLengthZ(whoTable(ctx.who, `wfl_${input.sex}`), input.length, input.weight);
          return wz === null ? [] : [{ pl: `WHO waga-do-długości: z = ${wz.toFixed(1).replace(".", ",")} (kontekst przesiewowy — dzieci z WHS są konstytucyjnie mniejsze niż w siatkach WHO; patrz też banner ryzyka powyżej)`, en: `WHO weight-for-length: z = ${wz.toFixed(1)} (screening context — WHS children are constitutionally smaller than WHO charts; see also the risk banner above)` }];
        })()
        : []),
    ], r.C.sourceIds, { grade: "D", extrap: true, alerts: r.C.alerts, sub: t("calc.method_c_sub"), tip: t("calc.method_c_tip"), band: t("calc.band_c") })}
    ${card(t("calc.method_d_t"), r.D.kcalPerDay, r.D.notes, r.D.sourceIds, { grade: "D", extrap: true, sub: t("calc.method_d_sub"), tip: t("calc.method_d_tip"), band: t("calc.band_d"), alerts: [...(r.D.guardrails ?? []).filter((g) => !(g.pl.includes("D-2") || g.en.includes("D-2"))), ...cCarry] })}
    <div class="card"><h3 data-tip="${t("calc.method_d2_tip")}">${t("calc.method_d2_t")} <span class="badge gradeD" data-tip="${t("calc.grade_d")}">D<span class="sr-only"> (${t("calc.grade_d")})</span></span></h3>
      <p class="small sub">${t("calc.method_d2_sub")}</p>
      <p class="small">${t("calc.extrapolation_note")}</p>
      ${r.D.method2.notes && r.D.method2.notes.length ? `<p class="small">${B(r.D.method2.notes[0])}</p>` : ""}
      ${(r.D.guardrails ?? []).filter((g) => g.pl.includes("D-2") || g.en.includes("D-2")).map((g) => `<p class="banner warn">${B(g)}</p>`).join("")}
      <p><strong>${bandStr(r.D.method2.kcalPerDay)}</strong></p>
      <details><summary class="small">${t("calc.how")}</summary><ul class="tight small">${(r.D.method2.notes ?? []).map((n) => `<li>${B(n)}</li>`).join("")}</ul></details>
      ${r.D.method2.kcalPerDay.central !== null && r.D.proteinGPerDay !== null ? `<p class="small">${t("calc.protein_label")}: ${(lang === "pl" ? r.D.proteinGPerDay.toFixed(1).replace(".", ",") : r.D.proteinGPerDay.toFixed(1))} g/24h (${(lang === "pl" ? r.D.proteinGPerKgPerDay!.toFixed(2).replace(".", ",") : r.D.proteinGPerKgPerDay!.toFixed(2))} g/kg/24h)</p>` : ""}
    </div>
    <div class="card"><h3>${t("calc.method_e_t")}</h3>
      <p class="small sub">${t("calc.method_e_sub")}</p>
      <p class="small band-note">${t("calc.band_e")}</p>
      ${cCarry.length ? `<p class="banner warn">${B(cCarry[0])}</p>` : ""}
      ${input.age < 12 ? `<p class="banner warn">${t("calc.infant_density_caution")}</p>` : (input.milkDensity > 1.0 ? `<p class="banner warn">${t("calc.density_caution")}</p>` : "")}
      <p class="small">${t("calc.split_densities").replace("{ml}", String(input.milkMl)).replace("{md}", loc(input.milkDensity)).replace("{gd}", loc(input.mealDensity))}</p>
      <table><thead><tr><th>${t("calc.split_col_row")}</th><th>${t("calc.split_col_need")}</th><th>${t("calc.split_col_milk").replace("{ml}", String(input.milkMl)).replace("{md}", loc(input.milkDensity))}</th><th>${t("calc.split_col_meals").replace("{gd}", loc(input.mealDensity))}</th></tr></thead>
      <tbody>${(() => {
        const row = (label: string, s: { milkKcal: number | null; restKcal: number | null; mealsG: number | null; milkPct: number | null }): string => {
          if (s.milkKcal === null || s.restKcal === null) return `<tr><th scope="row">${label}</th><td>—</td><td>—</td><td>—</td></tr>`;
          const meals = s.restKcal > 0.5 && s.mealsG !== null ? `${fmt(s.mealsG, 0)} g → ${fmt(s.restKcal)} kcal` : t("calc.split_none");
          return `<tr><th scope="row">${label}</th><td>${fmt(s.milkKcal + s.restKcal)} kcal</td><td>${fmt(s.milkKcal)} kcal (${s.milkPct !== null ? Math.round(s.milkPct) : "—"}%)</td><td>${meals}</td></tr>`;
        };
        return row(t("calc.split_row_c"), r.E.split.forC) + row(t("calc.split_row_d"), r.E.split.forD);
      })()}</tbody></table>
      <p class="small">${t("calc.sweep_caption")}</p>
      <table><thead><tr><th>${t("calc.density_col")}</th><th>${t("calc.sweep_col_c")}</th><th>${t("calc.sweep_col_d")}</th></tr></thead>
      <tbody>${r.E.byDensity.map((d) => `<tr><td>${loc(d.density)} kcal/ml</td><td>${d.mlForC !== null ? d.mlForC.toFixed(0) : "—"}</td><td>${d.mlForD !== null ? d.mlForD.toFixed(0) : "—"}</td></tr>`).join("")}</tbody></table>
      <p class="small">${t("calc.fluid_label")}: ${r.E.maintenanceFluidMl.toFixed(0)} ml/24h</p>
      ${(() => { const d67 = r.E.byDensity.find((d) => d.density === 0.67); return d67 && d67.mlForC !== null && d67.mlForC > r.E.maintenanceFluidMl ? `<p class="small">${t("calc.volume_density_note")}</p>` : ""; })()}
      ${r.E.volumeFlags.map((f) => `<p class="banner warn">${B(f)}</p>`).join("")}
    </div>
    ${r.F ? `<div class="card"><h3>${t("calc.method_f_t")}</h3>
      <p class="small sub">${t("calc.method_f_sub")}</p>
      <p>${t("calc.f_pct_c").replace("{p}", r.F.percentOfC!.toFixed(0))}${r.F.percentOfD !== null ? ` · ${t("calc.f_pct_d").replace("{p}", r.F.percentOfD.toFixed(0))}` : ""}</p>
      <p class="small">${B(r.F.note)}</p></div>` : ""}
    <p class="small">${t("calc.note_estimate")}</p>`;

  // Round-2 audit R2-3: propagate calculator changes to charts + table (with fresh captions).
  if (ch1) {
    renderChartsShell();
    drawCharts();
    renderTable();
  }
  renderNutrients();
  updateMilkCard();

  // Motion (user request 2026-10-07): first render = staggered entrance; later recalcs = a quick soft
  // refresh, debounced (350 ms) so continuous typing does not flicker.
  const rbody = document.getElementById("results-body");
  if (rbody) {
    if (!resultsEntered) {
      resultsEntered = true;
      rbody.classList.add("anim-enter");
      window.setTimeout(() => rbody.classList.remove("anim-enter"), 1100);
    } else {
      const now = performance.now();
      if (now - lastRefreshAnim > 350) {
        lastRefreshAnim = now;
        rbody.classList.remove("anim-refresh");
        void rbody.offsetWidth; // restart the animation
        rbody.classList.add("anim-refresh");
        window.setTimeout(() => rbody.classList.remove("anim-refresh"), 320);
      }
    }
  }
}

// ---------- charts ----------

let ch1: echarts.ECharts | null = null;
let ch2: echarts.ECharts | null = null;
let ch3: echarts.ECharts | null = null;

function renderChartsShell(): void {
  document.getElementById("charts-body")!.innerHTML = `
    <div class="chart-grid">
    <div class="card"><h3>${t("charts.chart1_title").replace("{age}", String(input.age))}</h3>
      <ul class="tight small">${li("charts.chart1_hint_items")}</ul><p class="small">${t("charts.chart1_hint")}</p><div id="chart1" class="chart"></div>
      <div id="fallback1"></div></div>
    <div class="card"><h3>${t("charts.chart2_title")}</h3>
      <ul class="tight small">${li("charts.chart2_hint_items")}</ul><p class="small">${t("charts.chart2_hint")}</p><div id="chart2" class="chart"></div>
      <p class="small">${t("charts.chart2_note")}</p><div id="fallback2"></div></div>
    <div class="card"><h3>${t("charts.chart3_title")}</h3>
      <ul class="tight small">${tl("charts.chart3_hint_items").map((x) => `<li>${x.replace("{milkd}", loc(input.milkDensity)).replace("{ml}", String(input.milkMl)).replace("{meald}", loc(input.mealDensity))}</li>`).join("")}</ul><p class="small">${t("charts.chart3_hint").replace("{milkd}", loc(input.milkDensity)).replace("{ml}", String(input.milkMl)).replace("{meald}", loc(input.mealDensity))}</p><div id="chart3" class="chart"></div>
      <div id="fallback3"></div></div>
    </div>`;
}

function drawCharts(): void {
  ch1?.dispose(); ch2?.dispose(); ch3?.dispose();

  const ws: number[] = [];
  for (let w = 2; w <= 20.001; w += 0.5) ws.push(Math.round(w * 100) / 100);
  const mk = (w: number) =>
    computeAll({
      sex: input.sex, ageMonths: input.age, weightKg: w, lengthCm: input.length,
      tone: input.tone, mobility: input.mobility, targetRef: input.targetRef,
      customTargetKg: null, horizonWeeks: input.horizonWeeks,
      milkDensityKcalPerMl: input.milkDensity, mealDensityKcalPerG: input.mealDensity, milkMlPerDay: input.milkMl,
      feedsPerDay: null, milkPortionMl: null, mealPortionG: null, actualIntakeKcalPerDay: null, actualIntakeMlPerDay: null,
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
  // Theme-aware palette (D-033: recolored to the 2026-10-05 palette; B stays the yellow line).
  const PAL = dark
    ? { a: "#9db1f5", b: "#f0c674", c: "#c99bf0", d: "#7fd0e8", who: "#7fb6ec", whs2: "#c9a3d9", cal: "#6fd0c0", child: "#f3eefc", fluid: "#b9aed2" }
    : { a: "#4e6ac2", b: "#b0790f", c: "#7d2fa6", d: "#12768f", who: "#2456a8", whs2: "#a05fb4", cal: "#0e7f74", child: "#2c0735", fluid: "#6b5f8a" };
  // Method labels: descriptive name + letter (user request 2026-10-05: no bare A–D as chart labels).
  const nmA = `${t("charts.m_a")} (A)`;
  const nmB = `${t("charts.m_b")} (B)`;
  const nmC = `${t("charts.m_c")} (C)`;
  const nmD = `${t("charts.m_d")} (D)`;
  ch1 = echarts.init(document.getElementById("chart1")!);
  ch1.setOption({
    tooltip: {
      trigger: "axis",
      formatter: (ps: { marker?: string; seriesName?: string; value?: unknown }[]) => {
        const first = ps[0]?.value as [number, number] | undefined;
        const head = `${lang === "pl" ? "masa" : "weight"} ${first ? num0(first[0]) : "—"} kg`;
        const rows = ps.map((p) => { const v = p.value as [number, number]; return `${p.marker ?? ""} ${p.seriesName ?? ""}: ${num0(v[1])} ${unit === "kcal" ? "kcal" : "kJ"}`; });
        const c = ps.find((p) => p.seriesName === nmC);
        let extra = "";
        if (c && Array.isArray(c.value)) {
          const cv = (c.value as [number, number])[1];
          const kcalV = unit === "kcal" ? cv : cv / 4.184;
          const milkAll = kcalV / input.milkDensity;
          const mealsTop = Math.max(0, kcalV - input.milkMl * input.milkDensity) / input.mealDensity;
          extra = `<br/>${t("calc.tip_c_split").replace("{ml}", num0(milkAll)).replace("{g}", num0(mealsTop))}`;
        }
        return head + rows.map((r) => `<br/>${r}`).join("") + extra;
      },
    },
    aria: { enabled: true, label: { description: t("a11y.chart1_desc") } },
    darkMode: false,
    textStyle: { color: fgVar },
    legend: { bottom: 0, type: "scroll", selectedMode: true, textStyle: { color: fgVar } },
    grid: { left: 60, right: 30, top: 30, bottom: 60 },
    xAxis: { type: "value", name: "kg", min: 2, max: 20, axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    yAxis: { type: "value", name: unit === "kcal" ? "kcal/24h" : "kJ/24h", axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    series: [
      line(nmA, Y(rs.map((r) => r.A.kcalPerDay.central)), { color: PAL.a }),
      line(nmB, Y(rs.map((r) => r.B.kcalPerDay.central)), { color: PAL.b }),
      line(nmC, Y(rs.map((r) => r.C.kcalPerDay.central)), { color: PAL.c }),
      line(`${t("charts.m_c")} − (C−)`, Y(rs.map((r) => r.C.kcalPerDay.low)), { color: PAL.c, lineStyle: { type: "dashed", width: 1 } }),
      line(`${t("charts.m_c")} + (C+)`, Y(rs.map((r) => r.C.kcalPerDay.high)), { color: PAL.c, lineStyle: { type: "dashed", width: 1 } }),
      line(nmD, Y(rs.map((r) => r.D.kcalPerDay.central)), { color: PAL.d }),
      line(`${t("charts.m_d")} − (D−)`, Y(rs.map((r) => r.D.kcalPerDay.low)), { color: PAL.d, lineStyle: { type: "dashed", width: 1 } }),
      line(`${t("charts.m_d")} + (D+)`, Y(rs.map((r) => r.D.kcalPerDay.high)), { color: PAL.d, lineStyle: { type: "dashed", width: 1 } }),
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
    legend: { bottom: 0, type: "scroll", selectedMode: true, textStyle: { color: fgVar } },
    grid: { left: 60, right: 30, top: 30, bottom: 60 },
    xAxis: { type: "value", name: lang === "pl" ? "wiek (mies.)" : "age (mo)", min: 0, max: 48, axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    yAxis: { type: "value", name: "kg", min: 0, max: 20, axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    series: [
      { name: lang === "pl" ? "WHS: średnia" : "WHS: mean", type: "line", showSymbol: false, data: pairs("w_mean"), color: PAL.c },
      { name: "WHS: +1 SD", type: "line", showSymbol: false, data: pairs("w_+1SD"), color: PAL.c, lineStyle: { type: "dashed", width: 1 } },
      { name: "WHS: −1 SD", type: "line", showSymbol: false, data: pairs("w_-1SD"), color: PAL.c, lineStyle: { type: "dashed", width: 1 } },
      { name: "WHS: +2 SD", type: "line", showSymbol: false, data: pairs("w_+2SD"), color: PAL.whs2, lineStyle: { type: "dotted", width: 1 } },
      { name: "WHS: −2 SD", type: "line", showSymbol: false, data: pairs("w_-2SD"), color: PAL.whs2, lineStyle: { type: "dotted", width: 1 } },
      { name: lang === "pl" ? "WHO: mediana" : "WHO: median", type: "line", showSymbol: false, data: pairs("who_w_med"), color: PAL.who, lineStyle: { type: "dashed" } },
      { name: "WHO: −2 SD", type: "line", showSymbol: false, data: pairs("who_w_m2"), color: PAL.who, lineStyle: { type: "dotted" } },
      { name: lang === "pl" ? "Calhoun 2025: p25 (model)" : "Calhoun 2025: p25 (model)", type: "line", showSymbol: false, data: cal2025("p25"), color: PAL.cal, lineStyle: { type: "dashed", width: 1 } },
      { name: lang === "pl" ? "Calhoun 2025: p50 (model)" : "Calhoun 2025: p50 (model)", type: "line", showSymbol: false, data: cal2025("p50"), color: PAL.cal },
      { name: lang === "pl" ? "Calhoun 2025: p75 (model)" : "Calhoun 2025: p75 (model)", type: "line", showSymbol: false, data: cal2025("p75"), color: PAL.cal, lineStyle: { type: "dashed", width: 1 } },
      {
        name: lang === "pl" ? "Twoje dziecko" : "Your child", type: "scatter", symbolSize: 12,
        data: input.age <= 48 ? [[input.age, input.weight]] : [], color: PAL.child,
        itemStyle: { borderColor: dark ? "#26062f" : "#ffffff", borderWidth: 1 },
      },
    ],
  });

  // Chart 3 (2026-10-05): milk / meals split — milk all-in-one volume at the milk density,
  // meals top-up grams at the meals density (after the fixed milk volume), vs maintenance fluid.
  const milkD = input.milkDensity;
  const mealD = input.mealDensity;
  const milkKcalFix = input.milkMl * milkD;
  const milkAllC = rs.map((r) => (r.C.kcalPerDay.central !== null ? r.C.kcalPerDay.central / milkD : null));
  const mealsC = rs.map((r) => (r.C.kcalPerDay.central !== null ? Math.max(0, r.C.kcalPerDay.central - milkKcalFix) / mealD : null));
  const mealsD = rs.map((r) => (r.D.kcalPerDay.central !== null ? Math.max(0, r.D.kcalPerDay.central - milkKcalFix) / mealD : null));
  const c3Names = [
    t("charts.c3_milk").replace("{d}", pDen(milkD)),
    t("charts.c3_meals_c").replace("{g}", pDen(mealD)),
    t("charts.c3_meals_d").replace("{g}", pDen(mealD)),
    lang === "pl" ? "płyny podtrzymujące" : "maintenance fluid",
  ];
  const wSel = input.weight;
  const showSel = Number.isFinite(wSel) && wSel >= 2 && wSel <= 20;
  ch3 = echarts.init(document.getElementById("chart3")!);
  ch3.setOption({
    tooltip: { trigger: "axis", valueFormatter: (v: unknown) => (typeof v === "number" ? `${num0(v)}` : "—") },
    aria: { enabled: true, label: { description: t("a11y.chart3_desc").replace("{milkd}", loc(input.milkDensity)).replace("{ml}", String(input.milkMl)).replace("{meald}", loc(input.mealDensity)) } },
    darkMode: false,
    textStyle: { color: fgVar },
    legend: { bottom: 0, type: "scroll", selectedMode: true, textStyle: { color: fgVar }, data: c3Names },
    grid: { left: 60, right: 30, top: 30, bottom: 60 },
    xAxis: { type: "value", name: "kg", min: 2, max: 20, axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    yAxis: { type: "value", name: "ml lub g /24h", axisLabel: { color: fgVar }, nameTextStyle: { color: fgVar }, axisLine: { lineStyle: { color: fgVar } } },
    series: [
      { name: c3Names[0], type: "line", showSymbol: false, data: ws.map((w, i) => [w, milkAllC[i]]), color: PAL.a },
      { name: c3Names[1], type: "line", showSymbol: false, data: ws.map((w, i) => [w, mealsC[i]]), color: PAL.c },
      { name: c3Names[2], type: "line", showSymbol: false, data: ws.map((w, i) => [w, mealsD[i]]), color: PAL.d, lineStyle: { type: "dashed", width: 1 } },
      { name: c3Names[3], type: "line", showSymbol: false, data: ws.map((w) => [w, w <= 10 ? w * 100 : w <= 20 ? 1000 + (w - 10) * 50 : 1500 + (w - 20) * 20]), color: PAL.fluid },
      // Vertical marker at the currently selected weight (user request 2026-10-05). Own unnamed
      // series so hiding legend entries never removes the line; excluded from the legend via data.
      {
        name: "", type: "line", data: [], silent: true, legendHoverLink: false,
        markLine: {
          symbol: "none", silent: false,
          lineStyle: { color: PAL.child, type: "dashed", width: 2 },
          label: { position: "insideEndTop", color: fgVar, formatter: `${lang === "pl" ? "wybrana masa" : "selected weight"}: ${loc(wSel)} kg` },
          data: showSel ? [{ xAxis: wSel }] : [],
        },
      },
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

  put("fallback1", `${open}<table><thead><tr><th>${t("a11y.weight")}</th><th>${t("table.col_a")}</th><th>${t("table.col_b")}</th><th>${t("table.col_c")}</th><th>${t("table.col_d")}</th></tr></thead><tbody>
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
  put("fallback2", `${open}<table><thead><tr><th>${t("a11y.age")}</th><th>${t("a11y.whs_mean")}</th><th>${t("a11y.who_med")}</th><th>${lang === "pl" ? "Calhoun 2025: p25 (model)" : "Calhoun 2025: p25 (model)"}</th><th>${lang === "pl" ? "Calhoun 2025: p50 (model)" : "Calhoun 2025: p50 (model)"}</th><th>${lang === "pl" ? "Calhoun 2025: p75 (model)" : "Calhoun 2025: p75 (model)"}</th></tr></thead><tbody>
    ${[0, 6, 12, 18, 24, 30, 36, 42, 48].map((m) => `<tr><td>${m}</td><td>${n2(findRef(m, "w_mean"))}</td><td>${n2(findRef(m, "who_w_med"))}</td><td>${n2(calAt("p25", m))}</td><td>${n2(calAt("p50", m))}</td><td>${n2(calAt("p75", m))}</td></tr>`).join("")}</tbody></table>${close}`);

  put("fallback3", `${open}<table><thead><tr><th>${t("a11y.weight")}</th><th>${t("table.col_milk")}</th><th>${t("table.col_meals")}</th><th>${lang === "pl" ? "płyny podtrzymujące" : "maintenance fluid"}</th></tr></thead><tbody>
    ${[2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((w) => {
      const r = rs[(w - 2) / 0.5]!;
      const c = r.C.kcalPerDay.central;
      const fluid = w <= 10 ? w * 100 : 1000 + (w - 10) * 50;
      const milkAll = c !== null ? c / input.milkDensity : null;
      const meals = c !== null ? Math.max(0, c - input.milkMl * input.milkDensity) / input.mealDensity : null;
      return `<tr><td>${w}</td><td>${milkAll !== null ? milkAll.toFixed(0) : "—"}</td><td>${meals !== null ? meals.toFixed(0) : "—"}</td><td>${fluid}</td></tr>`;
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
      customTargetKg: null, horizonWeeks: input.horizonWeeks,
      milkDensityKcalPerMl: input.milkDensity, mealDensityKcalPerG: input.mealDensity, milkMlPerDay: input.milkMl,
      feedsPerDay: null, milkPortionMl: null, mealPortionG: null, actualIntakeKcalPerDay: null, actualIntakeMlPerDay: null,
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
    customTargetKg: null, horizonWeeks: input.horizonWeeks,
    milkDensityKcalPerMl: input.milkDensity, mealDensityKcalPerG: input.mealDensity, milkMlPerDay: input.milkMl,
    feedsPerDay: null, milkPortionMl: null, mealPortionG: null, actualIntakeKcalPerDay: null, actualIntakeMlPerDay: null,
  }, ctx);
  const cNote = probe.C.alerts && probe.C.alerts.length && probe.C.kcalPerDay.central !== null ? `<p class="banner warn small">${B(probe.C.alerts[0])}</p>` : "";
  const tf = (v: unknown, dec = 0) => (v === null || v === undefined ? "—" : fmt(Number(v), dec));
  const nearest = rows.reduce((best, r) => (Math.abs(Number(r.w) - input.weight) < Math.abs(Number(best.w) - input.weight) ? r : best), rows[0]!);

  document.getElementById("table-body")!.innerHTML = `
    ${cNote}
    <ul class="tight small">${li("table.hint_items")}</ul>
    <p class="small"><button class="primary" type="button" id="csv-btn">${t("table.export")}</button></p>
    <div style="max-height:420px;overflow:auto" class="card" id="table-wrap">
    <table><thead><tr>
      ${(["w", "A", "B", "C", "D", "fluid"] as const).map((k) =>
        `<th scope="col" aria-sort="${sortKey === k ? (sortDir === 1 ? "ascending" : "descending") : "none"}"><button type="button" class="th-sort tip-below" data-key="${k}" data-tip="${t("a11y.sort_hint")}">${t(k === "w" ? "table.col_weight" : k === "fluid" ? "table.col_fluid" : `table.col_${k.toLowerCase()}`)}<span class="sr-only"> — ${t("a11y.sort_hint")}</span>${sortKey === k ? (sortDir === 1 ? " ▲" : " ▼") : ""}</button></th>`).join("")}
      <th scope="col">${t("table.col_milk")}</th><th scope="col">${t("table.col_meals")}</th>
    </tr></thead><tbody>
    ${rows.map((r) => {
      const cNum = r.C !== null && Number.isFinite(Number(r.C)) ? Number(r.C) : null;
      const milkAll = cNum !== null ? cNum / input.milkDensity : null;
      const meals = cNum !== null ? Math.max(0, cNum - input.milkMl * input.milkDensity) / input.mealDensity : null;
      const hl = r === nearest ? ' class="hl"' : "";
      return `<tr${hl} data-w="${r.w}" tabindex="0"><td>${lang === "pl" ? Number(r.w).toFixed(2).replace(".", ",") : Number(r.w).toFixed(2)}</td><td>${tf(r.A)}</td><td>${tf(r.B)}</td><td>${tf(r.C)}</td><td>${tf(r.D)}</td><td>${tf(r.fluid)}</td><td>${milkAll !== null ? milkAll.toFixed(0) : "—"}</td><td>${meals !== null ? meals.toFixed(0) : "—"}</td></tr>`;
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
    const header = "weight_kg,same_age_kcal,same_weight_kcal,maintenance_kcal,catchup_kcal,fluid_ml,milk_ml_all_maintenance,meals_g_topup_maintenance";
    const lines = rows.map((r) => {
      const cNum = r.C !== null && Number.isFinite(Number(r.C)) ? Number(r.C) : null;
      const milkAll = cNum !== null ? (cNum / input.milkDensity).toFixed(0) : "";
      const meals = cNum !== null ? (Math.max(0, cNum - input.milkMl * input.milkDensity) / input.mealDensity).toFixed(0) : "";
      return [r.w, r.A, r.B, r.C, r.D, r.fluid, milkAll, meals].join(",");
    });
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
    <p class="small">${t("sources.legend")}</p><ul class="tight small">${li("sources.legend_items")}</ul>
    <div class="card"><ol>
    ${src.map((s) => {
      const g = String((s as Record<string, unknown>).evidence_class ?? "D");
      const links: string[] = [];
      if (s.doi) links.push(`<a href="https://doi.org/${s.doi}" rel="noopener">doi:${s.doi}</a>`);
      if (s.pmid) links.push(`<a href="https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/" rel="noopener">PMID ${s.pmid}</a>`);
      if (s.url && !s.doi) links.push(`<a href="${s.url}" rel="noopener">link</a>`);
      return `<li>${gradeBadge(g)} ${s.citation ?? s.title} ${links.join(" · ")}
        <span class="small">[${s.verified ? t("sources.verified") : "UNVERIFIED"} · ${t("sources.accessed")}: ${s.accessed}]</span>
        ${s.notes ? `<div class="small" lang="en" data-tip="nota źródłowa (j. angielski)">${s.notes}</div>` : ""}</li>`;
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
  return `<span class="badge grade${known}" data-tip="${t(`calc.grade_${known.toLowerCase()}`)}">${g}<span class="sr-only"> (${t(`calc.grade_${known.toLowerCase()}`)})</span></span>`;
}

function renderWhy(): void {
  const R = reasons as unknown as { intro: BiText; consultLabels: Record<string, BiText>; groups: { id: string; title: BiText; items: ItemT[] }[] };
  const html = [`<p class="card small">${B(R.intro)}</p>`, `<div class="cards-grid">`];
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
  html.push("</div>");
  document.getElementById("why-body")!.innerHTML = html.join("");
}

function renderFlags(): void {
  const F = flags as unknown as { intro: BiText; levels: Record<string, BiText>; items: ItemT[] };
  const cls: Record<string, string> = { now: "crit", week: "warn", visit: "" };
  const html = [`<p class="card small">${B(F.intro)}</p>`, `<div class="cards-grid">`];
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
  html.push("</div>");
  document.getElementById("flags-body")!.innerHTML = html.join("");
}

function renderRules(): void {
  const RR = rules as unknown as { intro: BiText; blocks: { id: string; title: BiText; items: ItemT[] }[] };
  const html = [`<div class="card nut-card"><h3>${t("nutrients.title")}</h3><div id="nutrients"></div></div>`, `<p class="card small">${B(RR.intro)}</p>`, `<div class="cards-grid">`];
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
  html.push("</div>");
  document.getElementById("rules-body")!.innerHTML = html.join("");
  renderNutrients();
}

// ---------- nutrients: macro & micronutrient requirements (user request 2026-10-03) ----------

let nutrientView: "age" | "child" = "child";
let lastR: ReturnType<typeof computeAll> | null = null;
// Motion state (user request 2026-10-07)
let resultsEntered = false;
let lastRefreshAnim = 0;
let refeedShown = false;

interface NutCell { lo?: number; hi?: number; num?: number; ai?: boolean; approx?: BiText; }
interface NutRow { id: string; label: BiText; kind: "perkg" | "percent" | "daily"; unit?: string; src: string[]; b1?: NutCell; b2?: NutCell; b3?: NutCell; }
interface NutData { intro: BiText; bands: { id: string; label: BiText }[]; rows: NutRow[]; }

function nutrientBandForAge(age: number): "b1" | "b2" | "b3" | null {
  if (age < 6) return null;
  if (age < 12) return "b1";
  if (age < 36) return "b2";
  return "b3";
}

function renderNutrients(): void {
  const host = document.getElementById("nutrients");
  if (!host) return;
  const N = nutrientsContent as unknown as NutData;
  const band = nutrientBandForAge(input.age);
  const w = input.weight;
  const cKcal = lastR?.C.kcalPerDay.central ?? null;
  const nf = (v: number, dec = 2): string => {
    const s = v.toFixed(dec).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    return lang === "pl" ? s.replace(".", ",") : s;
  };
  const cellOf = (r: NutRow, id: string): NutCell | undefined => (r as unknown as Record<string, NutCell | undefined>)[id];
  const pct = (c: NutCell | undefined): string => (c && c.lo !== undefined && c.hi !== undefined ? `${nf(c.lo, 0)}–${nf(c.hi, 0)}% E` : "—");
  const perkg = (c: NutCell | undefined): string => (c && c.lo !== undefined && c.hi !== undefined ? `${nf(c.lo)}${c.lo !== c.hi ? "–" + nf(c.hi) : ""} g/kg` : "—");
  const daily = (c: NutCell | undefined, unit: string): string => (c && c.num !== undefined ? `${nf(c.num, c.num < 10 ? 1 : 0)} ${unit}${c.ai ? " (AI)" : ""}` : "—");

  const toggle = `
    <div class="nut-toggle" role="group" aria-label="${t("nutrients.title")}">
      <button type="button" data-nview="age" aria-pressed="${nutrientView === "age"}">${t("nutrients.view_age")}</button>
      <button type="button" data-nview="child" aria-pressed="${nutrientView === "child"}">${t("nutrients.view_child").replace("{w}", nf(w, 1))}</button>
    </div>`;

  let table = "";
  const notes: string[] = [];
  if (nutrientView === "age") {
    const head = N.bands.map((b) => `<th scope="col" class="${b.id === band ? "nut-hl" : ""}">${B(b.label)}</th>`).join("");
    const rows = N.rows
      .map((r) => {
        const cells = N.bands
          .map((b) => {
            const c = cellOf(r, b.id);
            const txt = r.kind === "perkg" ? perkg(c) : r.kind === "percent" ? pct(c) : daily(c, r.unit ?? "");
            const extra = r.kind === "perkg" && c?.approx ? ` <span class="small">(${B(c.approx)})</span>` : "";
            return `<td class="${b.id === band ? "nut-hl" : ""}">${txt}${extra}</td>`;
          })
          .join("");
        return `<tr><th scope="row">${B(r.label)}</th>${cells}</tr>`;
      })
      .join("");
    table = `<table class="nut"><thead><tr><th scope="col">${t("nutrients.col_nutrient")}</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    notes.push(t("nutrients.ai_note"));
    if (band === "b3" && input.age < 48) notes.push(t("nutrients.note34"));
  } else {
    const rows = N.rows
      .map((r) => {
        const c = band ? cellOf(r, band) : undefined;
        let val = "—";
        let how = "";
        if (c && band && r.kind === "perkg" && c.lo !== undefined && c.hi !== undefined) {
          val = `≈ ${nf(c.lo * w, 1)}${c.lo !== c.hi ? "–" + nf(c.hi * w, 1) : ""} g/d`;
          how = `${nf(c.lo)}${c.lo !== c.hi ? "–" + nf(c.hi) : ""} g/kg × ${nf(w, 1)} kg`;
        } else if (c && band && r.kind === "percent" && c.lo !== undefined && c.hi !== undefined && cKcal !== null) {
          val = `≈ ${nf((c.lo / 100) * cKcal / 9, 0)}–${nf((c.hi / 100) * cKcal / 9, 0)} g/d`;
          how = lang === "pl" ? `${nf(c.lo, 0)}–${nf(c.hi, 0)}% energii × C (utrzymanie) = ${nf(cKcal, 0)} kcal ÷ 9` : `${nf(c.lo, 0)}–${nf(c.hi, 0)}% energy × C (maintenance) = ${nf(cKcal, 0)} kcal ÷ 9`;
        } else if (c && band && r.kind === "percent" && c.lo !== undefined && c.hi !== undefined) {
          val = `${nf(c.lo, 0)}–${nf(c.hi, 0)}% E`;
          how = lang === "pl" ? "C (utrzymanie) niedostępne — patrz karta C" : "C (maintenance) unavailable — see card C";
        } else if (c && band && r.kind === "daily" && c.num !== undefined) {
          val = `${nf(c.num, c.num < 10 ? 1 : 0)} ${r.unit}${c.ai ? " (AI)" : ""}`;
          how = lang === "pl" ? `dawka dobowa dla wieku (niezależna od masy); ≈ ${nf(c.num / w, 2)} ${r.unit}/kg` : `daily amount for age (weight-independent); ≈ ${nf(c.num / w, 2)} ${r.unit}/kg`;
        }
        return `<tr><th scope="row">${B(r.label)}</th><td>${val}</td><td class="small">${how}</td></tr>`;
      })
      .join("");
    table = `<table class="nut"><thead><tr><th scope="col">${t("nutrients.col_nutrient")}</th><th scope="col">${t("nutrients.view_child").replace("{w}", nf(w, 1))}</th><th scope="col">${t("nutrients.col_how")}</th></tr></thead><tbody>${rows}</tbody></table>`;
    notes.push(t("nutrients.child_note"));
  }
  if (band === null) notes.push(t("nutrients.note06"));

  const srcs = Array.from(new Set(N.rows.flatMap((r) => r.src)));
  host.innerHTML = `
    <p class="small">${B(N.intro)}</p>
    ${toggle}
    ${table}
    ${notes.map((n) => `<p class="small">${n}</p>`).join("")}
    <p class="small">${t("calc.sources_label")}: ${srcLinks(srcs)}</p>`;

  host.querySelectorAll<HTMLButtonElement>("[data-nview]").forEach((b) => {
    b.addEventListener("click", () => {
      nutrientView = b.dataset.nview === "age" ? "age" : "child";
      renderNutrients();
    });
  });
}

// ---------- milk-only balance (user request 2026-10-03; ml+density shared with the form 2026-10-05) ----------

let milkProductId = "fsmp-infatrini";

function nutRowById(id: string): NutRow | undefined {
  return (nutrientsContent as unknown as NutData).rows.find((r) => r.id === id);
}
function nutCellFor(id: string, band: string): NutCell | undefined {
  const r = nutRowById(id);
  return r ? (r as unknown as Record<string, NutCell | undefined>)[band] : undefined;
}

function updateMilkCard(): void {
  const host = document.getElementById("milk-card");
  if (!host) return;
  const milks = milkItems();
  if (!milks.some((m) => m.id === milkProductId)) milkProductId = milks[0]?.id ?? "";
  const sel = milks.find((m) => m.id === milkProductId);
  const band = nutrientBandForAge(input.age);
  const w = input.weight;
  const ml = input.milkMl;
  const fmtN = (v: number, dec = 1): string => {
    const s = v.toFixed(dec).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    return lang === "pl" ? s.replace(".", ",") : s;
  };
  const per = (k: string): number | null => {
    const v = sel?.per100?.[k];
    return typeof v === "number" ? v : null;
  };
  const from = (k: string): number | null => (per(k) !== null ? (per(k)! * ml) / 100 : null);
  const milkKcal = from("kcal");
  const milkProt = from("protein");
  const cKcal = lastR?.C.kcalPerDay.central ?? null;
  const dKcal = lastR?.D.kcalPerDay.central ?? null;
  const protC = band ? nutCellFor("protein", band) : undefined;
  const protNeed: [number, number] | null = protC && protC.lo !== undefined && protC.hi !== undefined ? [protC.lo * w, protC.hi * w] : null;
  const microNeed = (id: string): number | null => {
    const c = band ? nutCellFor(id, band) : undefined;
    return c?.num !== undefined ? c.num : null;
  };
  const gap = (need: number | null, got: number | null): number | null => (need === null ? null : Math.max(0, need - (got ?? 0)));
  const num = (v: number | null, unit: string, dec = 1): string => (v === null ? t("milk.na") : `${fmtN(v, dec)} ${unit}`);
  const range = (lo: number | null, hi: number | null, unit: string): string => {
    if (lo === null || hi === null) return t("milk.na");
    return lo === hi ? `${fmtN(lo, 1)} ${unit}` : `${fmtN(lo, 1)}–${fmtN(hi, 1)} ${unit}`;
  };

  const rows: string[] = [];
  {
    const got = milkKcal;
    const need = cKcal;
    const pct = got !== null && need !== null && need > 0 ? Math.round((got / need) * 100) : null;
    const g = gap(need, got);
    rows.push(`<tr><th scope="row">${t("milk.row_energy_c")}</th><td>${num(got, "kcal", 0)}</td><td>${num(need, "kcal", 0)}</td><td>${g === null ? t("milk.na") : `${fmtN(g, 0)} kcal${pct !== null ? ` <span class="small">(${t("milk.pct_covered").replace("{p}", String(pct))})</span>` : ""}`}</td></tr>`);
  }
  if (dKcal !== null && cKcal !== null && dKcal > cKcal + 1) {
    const got = milkKcal;
    const g = gap(dKcal, got);
    rows.push(`<tr><th scope="row">${t("milk.row_energy_d")}</th><td>${num(got, "kcal", 0)}</td><td>${num(dKcal, "kcal", 0)}</td><td>${g === null ? t("milk.na") : `${fmtN(g, 0)} kcal`}</td></tr>`);
  }
  rows.push(`<tr><th scope="row">${t("milk.row_protein")}</th><td>${num(milkProt, "g")}</td><td>${protNeed ? range(protNeed[0], protNeed[1], "g") : t("milk.na")}</td><td>${protNeed ? range(gap(protNeed[0], milkProt), gap(protNeed[1], milkProt), "g") : t("milk.na")}</td></tr>`);
  const micros: [string, string, string, number][] = [
    ["calcium", "calcium_mg", "mg", 0],
    ["iron", "iron_mg", "mg", 1],
    ["zinc", "zinc_mg", "mg", 1],
    ["vitd", "vitd_ug", "µg", 1],
  ];
  for (const [nid, pk, unit, dec] of micros) {
    const got = from(pk);
    const need = microNeed(nid);
    const g = gap(need, got);
    const lbl = nutRowById(nid);
    rows.push(`<tr><th scope="row">${lbl ? B(lbl.label) : nid}</th><td>${num(got, unit, dec)}</td><td>${num(need, unit, dec)}</td><td>${g === null ? t("milk.na") : num(g, unit, dec)}</td></tr>`);
  }

  const dens = per("kcal") !== null ? fmtN(per("kcal")! / 100, 2) : "—";
  host.innerHTML = `
    <div class="card"><h3>${t("milk.title")}</h3>
      <p class="small sub">${t("milk.sub")}</p>
      <p class="small">${t("milk.product_label")}: <b>${sel ? B(sel.name) : "—"}</b> — ${dens} kcal/ml</p>
      <p class="small">${t("milk.volume_note").replace("{ml}", String(ml)).replace("{d}", dens)}</p>
      <table><thead><tr><th>${t("milk.col_component")}</th><th>${t("milk.col_from_milk").replace("{ml}", String(ml))}</th><th>${t("milk.col_need")}</th><th>${t("milk.col_gap")}</th></tr></thead><tbody>${rows.join("")}</tbody></table>
      ${band === null ? `<p class="small">${t("nutrients.note06")}</p>` : ""}
      <p class="small">${t("milk.note")}</p>
      <p class="small">${t("calc.sources_label")}: ${srcLinks(["pzh2024"])} · ${lang === "pl" ? "skład produktu: dane producenta" : "product composition: manufacturer data"}</p>
    </div>`;
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
  /** EU-14 allergen codes found in the declared composition (user request 2026-10-05). */
  allergens?: string[];
  /** Provenance of the allergen flags, e.g. "doz.pl — etykieta: …". */
  allergen_source?: string;
  source: { label: BiText | string; url: string };
}

// Allergen display (EU-14 subset present in this dataset; user request 2026-10-05):
// icons + labels for the chip row; allergen-carrying tags are hidden from the generic tag row.
const ALG_ICONS: Record<string, string> = { milk: "🥛", egg: "🥚", fish: "🐟", gluten: "🌾", soy: "🌱", nuts: "🌰", peanuts: "🥜", sesame: "🫘" };
const ALG_KEYS: Record<string, string> = { milk: "allergen_milk", egg: "allergen_egg", fish: "allergen_fish", gluten: "allergen_gluten", soy: "allergen_soy", nuts: "allergen_nuts", peanuts: "allergen_peanuts", sesame: "allergen_sesame" };
const ALG_TAGS = new Set(["dairy", "egg", "fish", "soy", "gluten", "nuts", "sesame"]);
const algLabel = (a: string): string => (ALG_KEYS[a] ? t(`products.${ALG_KEYS[a]}`) : a);

/** Dry-basis staples (audit M6): per-100 g density signals refer to the DRY product — no "high-energy". */
const DRY_STAPLES = new Set(["food-oats", "food-semolina", "food-millet"]);

/** Food-list search state: live text + committed badge chips (user batch card 7, 2026-10-07). */
let pSearch = "";
interface PChip { kind: "tag" | "cat" | "alg" | "free"; key?: string; text?: string; }
let pChips: PChip[] = [];
let pCat = "all";
let pSort = "kcal";

function buildProducts(): PItem[] {
  const fsmp = (productsContent as unknown as { items: PItem[] }).items.map((x) => ({ ...x, kind: "fsmp" }));
  interface FoodRow {
    id: string; category: string; name: BiText; tags?: string[]; warning?: BiText; per100g: Record<string, number | null>;
    portions: { desc: string; g: number }[]; fdc_id: string; fdc_desc: string; allergens?: string[];
    source_override?: { label: BiText; url: string };
  }
  const foods = (foodsData as unknown as { items: FoodRow[] }).items.map((x) => {
    const n = x.per100g;
    const tags: string[] = [...(x.tags ?? [])];
    // Derived tags are per-100 g density signals — meaningless for seasonings (a pinch, not 100 g)
    // and would mislabel cinnamon (247 kcal/100 g) as "energy-dense" (user batch card 3, 2026-10-07).
    // Dry-basis staples (audit M6, 2026-10-07): per-100 g values refer to the DRY product, so the
    // density tag would mislead for porridge-like servings — suppressed (the name discloses the basis).
    if (x.category !== "seasonings") {
      if (x.category === "fats" || ((n.kcal ?? 0) >= 200 && !DRY_STAPLES.has(x.id))) tags.push("high-energy");
      if ((n.protein ?? 0) >= 10) tags.push("high-protein");
      if ((n.iron_mg ?? 0) >= 2) tags.push("Fe");
      if ((n.zinc_mg ?? 0) >= 1.5) tags.push("Zn");
      if ((n.calcium_mg ?? 0) >= 100) tags.push("Ca");
      if ((n.vitd_ug ?? 0) >= 1) tags.push("vitD");
      if ((n.fibre ?? 0) >= 4) tags.push("fibre");
      if (["food-salmon", "food-mackerel", "food-sardines", "food-flax"].includes(x.id)) tags.push("omega3");
      if (x.category === "dairy") tags.push("dairy");
    }
    return {
      id: x.id, kind: "food", category: x.category, name: x.name, basis: "g" as const,
      per100: n,
      warning: x.warning,
      allergens: x.allergens,
      measures: (x.portions ?? []).map((p) => {
        const en = metricDesc(p.desc);
        const pl = metricDesc(descPl(p.desc)); // translate first, then metric-convert (PL mode only)
        const suffix = (conv: boolean, l2: "pl" | "en"): string => (conv ? "" : ` (${l2 === "pl" ? String(p.g).replace(".", ",") : p.g} g)`);
        return {
          label: {
            pl: `≈ ${pl.text.replace(/(\d)\.(\d)/g, "$1,$2")}${suffix(pl.converted, "pl")}`,
            en: `≈ ${en.text}${suffix(en.converted, "en")}`,
          },
          kcal: n.kcal !== null && n.kcal !== undefined ? Math.round((n.kcal * p.g) / 100) : null,
        };
      }),
      tags: Array.from(new Set(tags)),
      source: x.source_override
        ? x.source_override
        : { label: { pl: "USDA FDC — karta produktu (opis oryginalny w j. angielskim)", en: `${x.fdc_desc} — USDA FDC` }, url: `https://fdc.nal.usda.gov/food-details/${x.fdc_id}/nutrients` },
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

  // Suggestion vocabulary for the search field: product tags (allergen-carrying tag codes are represented
  // by the allergen entries instead), categories and allergens — labels in the CURRENT language.
  interface Vocab { kind: "tag" | "cat" | "alg"; key: string; label: string; }
  const vocab: Vocab[] = [
    ...Array.from(new Set(all.flatMap((x) => x.tags))).filter((tg) => !ALG_TAGS.has(tg)).map((k) => ({ kind: "tag" as const, key: k, label: tagLabel(k) })),
    ...cats.map((k) => ({ kind: "cat" as const, key: k, label: catLabel(k) })),
    ...Array.from(new Set(all.flatMap((x) => x.allergens ?? []))).map((k) => ({ kind: "alg" as const, key: k, label: algLabel(k) })),
  ];

  document.getElementById("products-body")!.innerHTML = `
    <p class="small">${t("products.foods_note")}</p>
    <p class="small">${t("products.seasonings_note")} ${t("calc.sources_label")} ${srcLinks(["fewtrell2017", "bfr_coumarin"])}</p>
    <p class="small">${t("products.allergen_legend")}</p>
    <ul class="tight small alg-legend">${Object.keys(ALG_ICONS).map((a) => `<li><span aria-hidden="true">${ALG_ICONS[a]}</span> ${algLabel(a)}</li>`).join("")}</ul>
    <p class="small">${t("products.allergen_legend_note")}</p>
    <div class="card p-controls" style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:end">
      <div class="p-searchbox" style="flex:0 1 340px;min-width:220px">
        <label for="p-search" id="p-search-label">${t("products.search")}</label>
        <div class="p-search">
          <span id="p-chips" class="p-chips"></span>
          <input id="p-search" type="search" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="p-suggest" aria-labelledby="p-search-label" autocomplete="off" value="${esc(pSearch)}" />
        </div>
        <ul id="p-suggest" role="listbox" aria-label="${t("products.search")}" hidden></ul>
      </div>
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
    <p class="small" id="p-search-hint">${t("products.search_chip_hint")}</p>
    <div id="p-list"></div>`;

  const strip = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase();
  const pn = (v: number | null | undefined): string => (v === null || v === undefined ? "—" : v.toLocaleString(lang === "pl" ? "pl-PL" : "en-GB", { maximumFractionDigits: 2 }));
  const plural = (n: number): string => (n === 1 ? t("products.count1") : n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? t("products.count2") : t("products.count"));

  const search = document.getElementById("p-search") as HTMLInputElement;
  const cat = document.getElementById("p-cat") as HTMLSelectElement;
  const sort = document.getElementById("p-sort") as HTMLSelectElement;
  const sug = document.getElementById("p-suggest") as HTMLUListElement;
  const chipsEl = document.getElementById("p-chips")!;

  const hay = (x: PItem): string => `${x.name.pl} ${x.name.en} ${x.tags.join(" ")} ${x.tags.map(tagLabel).join(" ")} ${(x.allergens ?? []).map(algLabel).join(" ")} ${catLabel(x.category)} ${x.form ? x.form.pl + " " + x.form.en : ""}`;
  const chipMatch = (x: PItem, c: PChip): boolean =>
    c.kind === "tag" ? x.tags.includes(c.key!) :
    c.kind === "cat" ? x.category === c.key :
    c.kind === "alg" ? (x.allergens ?? []).includes(c.key!) :
    strip(hay(x)).includes(strip(c.text ?? ""));
  const chipLabel = (c: PChip): string => (c.kind === "tag" ? tagLabel(c.key!) : c.kind === "alg" ? algLabel(c.key!) : c.kind === "cat" ? catLabel(c.key!) : c.text ?? "");

  let sugItems: Vocab[] = [];
  let sugActive = -1;

  function renderChips(): void {
    chipsEl.innerHTML = pChips.map((c, i) => {
      const cls = c.kind === "alg" ? "badge alg p-chip" : c.kind === "free" ? "badge p-free p-chip" : c.kind === "tag" ? `badge tg tag-${c.key} p-chip` : "badge tg p-cat p-chip";
      const inner = c.kind === "alg" ? `<span aria-hidden="true">${ALG_ICONS[c.key!]}</span> ${algLabel(c.key!)}` : esc(chipLabel(c));
      return `<span class="${cls}">${inner}<button type="button" class="chip-x" data-i="${i}" aria-label="${esc(t("products.chip_remove").replace("{x}", chipLabel(c)))}">✕</button></span>`;
    }).join("");
  }

  function renderSuggest(): void {
    const nq = strip(search.value.trim());
    sugItems = vocab.filter((v) => !nq || strip(v.label).includes(nq) || v.key.toLowerCase().includes(nq));
    if (nq) sugItems.sort((a, b) => (strip(a.label).startsWith(nq) ? 0 : 1) - (strip(b.label).startsWith(nq) ? 0 : 1));
    if (sugActive >= sugItems.length) sugActive = sugItems.length - 1;
    if (sugActive < 0 && sugItems.length) sugActive = 0;
    sug.innerHTML = sugItems.map((v, i) => {
      const sel = pChips.some((c) => c.kind === v.kind && c.key === v.key);
      const badge = v.kind === "alg"
        ? `<span class="badge alg"><span aria-hidden="true">${ALG_ICONS[v.key]}</span> ${v.label}</span>`
        : `<span class="badge tg ${v.kind === "tag" ? `tag-${v.key}` : "p-cat"}">${v.label}</span>`;
      const kindT = t(v.kind === "tag" ? "products.badge_tag" : v.kind === "cat" ? "products.badge_cat" : "products.badge_alg");
      return `<li id="p-sug-${i}" role="option" aria-selected="${i === sugActive}" class="${i === sugActive ? "active" : ""}" data-i="${i}">${badge}<span class="hint">${kindT}${sel ? " ✓" : ""}</span></li>`;
    }).join("");
    const wasHidden = sug.hidden;
    sug.hidden = sugItems.length === 0;
    if (!sug.hidden && wasHidden) {
      // Motion (user request 2026-10-07): fade/slide the dropdown in on each open.
      sug.classList.remove("sug-open");
      void sug.offsetWidth;
      sug.classList.add("sug-open");
    }
    search.setAttribute("aria-expanded", String(!sug.hidden));
    if (!sug.hidden) search.setAttribute("aria-activedescendant", `p-sug-${sugActive}`);
    else search.removeAttribute("aria-activedescendant");
  }

  function removeChip(i: number): void {
    pChips.splice(i, 1);
    renderChips(); renderSuggest(); paint();
  }

  /** Select a suggestion: add as chip, or remove it again when it is already active (toggle). */
  function selectVocab(v: Vocab): void {
    const idx = pChips.findIndex((c) => c.kind === v.kind && c.key === v.key);
    if (idx >= 0) { removeChip(idx); return; }
    pChips.push({ kind: v.kind, key: v.key });
    search.value = ""; pSearch = "";
    renderChips(); renderSuggest(); paint();
    search.focus();
  }

  /** Commit the typed text: exact label/key match → that badge; single suggestion → that badge; else free chip. */
  function commitText(): void {
    const raw = search.value.trim();
    if (!raw) return;
    const nq = strip(raw);
    let pick = vocab.find((v) => strip(v.label) === nq || v.key.toLowerCase() === nq);
    if (!pick && sugItems.length === 1) pick = sugItems[0];
    if (pick) {
      if (!pChips.some((c) => c.kind === pick!.kind && c.key === pick!.key)) pChips.push({ kind: pick.kind, key: pick.key });
    } else {
      pChips.push({ kind: "free", text: raw });
    }
    search.value = ""; pSearch = "";
    renderChips(); renderSuggest(); paint();
  }

  chipsEl.addEventListener("mousedown", (e) => e.preventDefault());
  chipsEl.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button.chip-x");
    if (b) removeChip(Number((b as HTMLElement).dataset.i));
  });
  sug.addEventListener("mousedown", (e) => e.preventDefault());
  sug.addEventListener("click", (e) => {
    const li = (e.target as HTMLElement).closest("li[data-i]");
    if (!li) return;
    const v = sugItems[Number(li.getAttribute("data-i"))];
    if (v) selectVocab(v);
  });
  search.addEventListener("input", () => { pSearch = search.value; renderSuggest(); paint(); });
  search.addEventListener("focus", () => { sugActive = 0; renderSuggest(); });
  search.addEventListener("blur", () => {
    if (search.value.trim()) commitText();
    sug.hidden = true;
    search.setAttribute("aria-expanded", "false");
    search.removeAttribute("aria-activedescendant");
  });
  search.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (sugItems.length) { sugActive = (sugActive + 1) % sugItems.length; renderSuggest(); } }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (sugItems.length) { sugActive = (sugActive - 1 + sugItems.length) % sugItems.length; renderSuggest(); } }
    else if (e.key === "Enter") { e.preventDefault(); if (!sug.hidden && sugItems[sugActive]) selectVocab(sugItems[sugActive]!); else commitText(); }
    else if (e.key === ",") { e.preventDefault(); commitText(); }
    else if (e.key === "Backspace" && search.value === "" && pChips.length) { e.preventDefault(); removeChip(pChips.length - 1); }
    else if (e.key === "Escape") { sug.hidden = true; search.setAttribute("aria-expanded", "false"); }
  });
  cat.addEventListener("change", () => { pCat = cat.value; paint(); });
  sort.addEventListener("change", () => { pSort = sort.value; paint(); });
  renderChips();

  function paint(): void {
    let list = all.filter((x) => (pCat === "all" ? true : x.category === pCat));
    for (const c of pChips) list = list.filter((x) => chipMatch(x, c));
    const q = strip(pSearch.trim());
    if (q) list = list.filter((x) => strip(hay(x)).includes(q));
    list.sort((a, b) => {
      if (pSort === "name") return a.name[lang].localeCompare(b.name[lang]);
      const key = pSort === "kcal" ? "kcal" : "protein";
      return (b.per100[key] ?? -1) - (a.per100[key] ?? -1);
    });
    document.getElementById("p-count")!.textContent = `${list.length} ${plural(list.length)}`;
    document.getElementById("p-list")!.innerHTML = `<div class="cards-grid">` + list.map((x) => {
      const n = x.per100;
      const basis = x.basis === "g" ? "100 g" : "100 ml";
      const meas = (x.measures ?? []).length
        ? `<p class="small">${t("products.household")}: ${(x.measures ?? []).slice(0, 3).map((m) => `${B(m.label)}${m.kcal !== null && m.kcal !== undefined ? " = " + pn(m.kcal) + " kcal" : ""}${m.note ? " (" + B(m.note) + ")" : ""}`).join(" · ")}</p>`
        : "";
      return `<div class="card" id="prod-${x.id}">
        <p><b>${x.name[lang]}</b></p>
        ${x.form ? `<p class="small">${B(x.form)}</p>` : ""}
        ${(() => {
          const algs = x.allergens;
          if (!algs || !algs.length) return "";
          const tip = x.allergen_source ? t("products.allergen_tip").replace("{src}", x.allergen_source.replace(/"/g, "&quot;")) : t("products.allergen_tip_ident");
          return `<p class="small allergens">${t("products.allergen_label")} ${algs.map((a) => `<span class="badge alg" data-tip="${tip}"><span aria-hidden="true">${ALG_ICONS[a] ?? "⚠️"}</span> ${algLabel(a)}</span>`).join(" ")}</p>`;
        })()}
        ${x.warning ? `<p class="banner crit small">${B(x.warning)}</p>` : ""}
        <p class="small">${basis}: <b>${pn(n.kcal)} kcal</b> · ${lang === "pl" ? "B" : "P"} ${pn(n.protein)} g · ${lang === "pl" ? "T" : "F"} ${pn(n.fat)} g · ${lang === "pl" ? "W" : "C"} ${pn(n.carbs)} g${n.fibre ? ` · ${tagLabel("fibre")} ${pn(n.fibre)} g` : ""}${n.iron_mg ? ` · Fe ${pn(n.iron_mg)} mg` : ""}${n.zinc_mg ? ` · Zn ${pn(n.zinc_mg)} mg` : ""}${n.calcium_mg ? ` · Ca ${pn(n.calcium_mg)} mg` : ""}${n.vitd_ug ? ` · D ${pn(n.vitd_ug)} µg` : ""}</p>
        ${(() => { const rest = x.tags.filter((tg) => !ALG_TAGS.has(tg)); return rest.length ? `<p>${rest.map((tg) => `<span class="badge tg tag-${tg}">${tagLabel(tg)}</span>`).join(" ")}</p>` : ""; })()}
        ${meas}
        <p class="small">${t("products.source")}: <a href="${x.source.url}" rel="noopener">${typeof x.source.label === "string" ? x.source.label : B(x.source.label as BiText)}</a></p>
      </div>`;
    }).join("") + `</div>`;
    scheduleUrlSync("products");
  }
  paint();
}

function renderMethod(): void {
  document.getElementById("method-body")!.innerHTML = `
    <div class="card">
      ${(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"] as const).map((k) => `<p>${t(`method.${k}`)}</p>`).join("")}
      <p class="small">research/data/whs_growth/provenance.md · research/data/whs_growth/provenance_2025.md · research/qa/crosscheck-report.md</p>
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
  (["start", "calc", "results", "charts", "table", "why", "flags", "rules", "products", "sources", "method"] as const).forEach((id) => {
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
  overlayQ = "";
  setUrlParams({ q: null });
}

function closeSearch(): void {
  const ov = document.getElementById("search-overlay") as HTMLElement | null;
  if (ov) ov.hidden = true;
  overlayQ = "";
  urlDirty.delete("search");
  setUrlParams({ q: null });
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

// ---------- scroll reveal (user request 2026-10-07) ----------
let revealObserver: IntersectionObserver | null = null;
function setupReveals(): void {
  if (!("IntersectionObserver" in window)) return;
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add("sec-in");
          revealObserver!.unobserve(en.target);
        }
      }
    }, { threshold: 0.01, rootMargin: "0px 0px -6% 0px" });
  }
  for (const s of document.querySelectorAll("main section")) {
    if (!s.classList.contains("sec-in")) revealObserver.observe(s);
  }
}

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
  setupReveals();
  if (!resizeBound) {
    resizeBound = true;
    window.addEventListener("resize", () => { ch1?.resize(); ch2?.resize(); ch3?.resize(); updateScrollPad(); }, { passive: true });
  }
}

const __st = storedTheme();
if (__st) document.documentElement.dataset.theme = __st;

// URL state (user request 2026-10-07): calculator inputs and the products search come from
// the query string — they win over stored/default values; ?q= opens the search overlay.
const __sp = new URLSearchParams(location.search);
Object.assign(input, parseCalcParams(__sp));
{
  // Milk product (user request 2026-10-07): a valid ?milk= id wins; otherwise match by the density
  // (links from before the select existed); the density itself always follows the selected product.
  const __ids = new Set(milkItems().map((m) => m.id));
  const __mp = parseMilkProduct(__sp, __ids);
  if (__mp) milkProductId = __mp;
  else {
    const __byDens = milkItems().find((m) => {
      const k = Number(m.per100["kcal"]);
      return Number.isFinite(k) && k > 0 && Math.round(k) / 100 === input.milkDensity;
    });
    if (__byDens) milkProductId = __byDens.id;
  }
  const __md = milkDensityOf(milkProductId);
  if (__md !== null) input.milkDensity = __md;
}
{
  const __all = buildProducts();
  const __vocab = {
    tags: new Set(__all.flatMap((x) => x.tags)),
    cats: new Set(__all.map((x) => x.category)),
    algs: new Set(__all.flatMap((x) => x.allergens ?? [])),
  };
  const __ps = parseProductsParams(__sp, __vocab);
  if (__ps.search !== undefined) pSearch = __ps.search;
  if (__ps.chips !== undefined) pChips = __ps.chips;
  if (__ps.cat !== undefined) pCat = __ps.cat;
  if (__ps.sort !== undefined) pSort = __ps.sort;
}
renderAll();
const __q = __sp.get("q");
if (__q && __q.trim()) {
  openSearch();
  const __si = document.getElementById("search-input") as HTMLInputElement | null;
  if (__si) __si.value = __q;
  overlayQ = __q;
  runSearch(__q);
  setUrlParams({ q: __q });
}

// Back/forward across language switches (pushState entries from the toggle).
window.addEventListener("popstate", () => {
  const l = langFromPath(location.pathname) ?? "en";
  if (l !== lang) { lang = l; renderAll(); }
});
