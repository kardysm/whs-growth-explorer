/**
 * URL state (user request 2026-10-07): language in the path (/pl/, /en/ — default en),
 * calculator inputs and search state as query parameters.
 *
 * Pure helpers only (no DOM, no history) so they are unit-tested in urlstate.test.ts;
 * main.ts wires them to the UI (pushState/replaceState, form fields, product filters).
 */
import type { CalcInput } from "../calc/types.js";

export type Lang = "pl" | "en";

/** Calculator input model (mirrors the form fields; lives here so the URL helpers can use it). */
export interface Inputs {
  sex: "boys" | "girls";
  age: number;
  weight: number;
  length: number | null;
  tone: CalcInput["tone"];
  mobility: CalcInput["mobility"];
  targetRef: CalcInput["targetRef"];
  horizonWeeks: number;
  milkDensity: number;
  mealDensity: number;
  milkMl: number;
  feeds: number | null;
  milkPortionMl: number | null;
  mealPortionG: number | null;
  intake: number | null;
}

/** A products-search chip as stored in the URL (structural subset of the UI chip). */
export interface PChipState {
  kind: "tag" | "cat" | "alg" | "free";
  key?: string;
  text?: string;
}

export interface ProductsState {
  search: string;
  chips: PChipState[];
  cat: string;
  sort: string;
}

/** Valid chip keys, derived from the product data in main.ts. */
export interface ProductsVocab {
  tags: ReadonlySet<string>;
  cats: ReadonlySet<string>;
  algs: ReadonlySet<string>;
}

// --- language path ---------------------------------------------------------

/** Matches a trailing language segment: /pl, /pl/, /pl/index.html (same for en). */
const LANG_RE = /\/(pl|en)(?:\/index\.html|\/)?$/;

export function langFromPath(pathname: string): Lang | null {
  const m = pathname.match(LANG_RE);
  return m ? (m[1] as Lang) : null;
}

/** The site root path (always ends with "/"), used to build /pl/ and /en/ links. */
export function siteRoot(pathname: string): string {
  let r = pathname.replace(LANG_RE, "/"); // strip a language segment
  r = r.replace(/index\.html$/, ""); // strip a plain file entry
  if (!r.endsWith("/")) r += "/";
  return r;
}

// --- calculator params -----------------------------------------------------

/** Reads calculator parameters; absent/empty/invalid values are ignored (never invented). */
export function parseCalcParams(sp: URLSearchParams): Partial<Inputs> {
  const out: Partial<Inputs> = {};
  const pick = <T extends string>(k: string, values: readonly T[]): T | null => {
    const v = sp.get(k);
    return v !== null && (values as readonly string[]).includes(v) ? (v as T) : null;
  };
  const num = (k: string, lo: number, hi: number, integer = false): number | null => {
    const v = sp.get(k);
    if (v === null || v.trim() === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < lo || n > hi) return null;
    return integer ? Math.round(n) : n;
  };

  const sex = pick("sex", ["boys", "girls"] as const);
  if (sex) out.sex = sex;
  const age = num("age", 0, 48, true);
  if (age !== null) out.age = age;
  const weight = num("weight", 1, 25);
  if (weight !== null) out.weight = weight;
  const length = num("length", 30, 120);
  if (length !== null) out.length = length;
  const tone = pick("tone", ["hypotonic", "normal", "hypertonic"] as const);
  if (tone) out.tone = tone;
  const mobility = pick("mobility", ["bedridden", "dependent", "crawling", "ambulatory"] as const);
  if (mobility) out.mobility = mobility;
  const target = pick("target", ["whs_mean", "whs_minus1sd", "who_wfl_median"] as const);
  if (target) out.targetRef = target;
  const horizon = num("horizon", 4, 52, true);
  if (horizon !== null) out.horizonWeeks = horizon;
  const milkDensity = num("milkDensity", 0.4, 2);
  if (milkDensity !== null) out.milkDensity = milkDensity;
  const mealDensity = num("mealDensity", 0.2, 3);
  if (mealDensity !== null) out.mealDensity = mealDensity;
  const milkMl = num("milkMl", 0, 1200);
  if (milkMl !== null) out.milkMl = milkMl;
  const feeds = num("feeds", 1, 12, true);
  if (feeds !== null) out.feeds = feeds;
  const milkPortion = num("milkPortion", 10, 400);
  if (milkPortion !== null) out.milkPortionMl = milkPortion;
  const mealPortion = num("mealPortion", 5, 400);
  if (mealPortion !== null) out.mealPortionG = mealPortion;
  const intake = num("intake", 0, 3000);
  if (intake !== null) out.intake = intake;
  return out;
}

/** Serialises the full calculator state; null (empty) fields are omitted. */
export function calcUrlParams(input: Inputs): Record<string, string | null> {
  return {
    sex: input.sex,
    age: String(input.age),
    weight: String(input.weight),
    length: input.length === null ? null : String(input.length),
    tone: input.tone,
    mobility: input.mobility,
    target: input.targetRef,
    horizon: String(input.horizonWeeks),
    milkDensity: String(input.milkDensity),
    mealDensity: String(input.mealDensity),
    milkMl: String(input.milkMl),
    feeds: input.feeds === null ? null : String(input.feeds),
    milkPortion: input.milkPortionMl === null ? null : String(input.milkPortionMl),
    mealPortion: input.mealPortionG === null ? null : String(input.mealPortionG),
    intake: input.intake === null ? null : String(input.intake),
  };
}

// --- products search params ------------------------------------------------

/** Reads the milk-product id (validated against the milk list; user request 2026-10-07). */
export function parseMilkProduct(sp: URLSearchParams, validIds: ReadonlySet<string>): string | null {
  const v = sp.get("milk");
  return v !== null && validIds.has(v) ? v : null;
}

/** Reads products-search parameters; unknown chip keys are dropped. */
export function parseProductsParams(sp: URLSearchParams, vocab: ProductsVocab): Partial<ProductsState> {
  const out: Partial<ProductsState> = {};
  const q = sp.get("pq");
  if (q !== null) out.search = q;

  const chips: PChipState[] = [];
  for (const k of sp.getAll("ptag")) if (vocab.tags.has(k)) chips.push({ kind: "tag", key: k });
  for (const k of sp.getAll("pcat")) if (vocab.cats.has(k)) chips.push({ kind: "cat", key: k });
  for (const k of sp.getAll("palg")) if (vocab.algs.has(k)) chips.push({ kind: "alg", key: k });
  for (const t of sp.getAll("pfree")) {
    const s = t.trim();
    if (s) chips.push({ kind: "free", text: s });
  }
  if (sp.has("ptag") || sp.has("pcat") || sp.has("palg") || sp.has("pfree")) out.chips = chips;

  const sel = sp.get("psel");
  if (sel !== null) out.cat = sel;
  const sort = sp.get("psort");
  if (sort !== null) out.sort = sort;
  return out;
}

/** Serialises the products search; empty values and defaults are omitted. */
export function productsUrlParams(st: ProductsState): Record<string, string | string[] | null> {
  const of = (kind: PChipState["kind"]): string[] => st.chips.filter((c) => c.kind === kind).map((c) => c.key ?? "");
  const tags = of("tag");
  const cats = of("cat");
  const algs = of("alg");
  const free = st.chips.filter((c) => c.kind === "free").map((c) => c.text ?? "").filter((t) => t !== "");
  return {
    pq: st.search.trim() ? st.search : null,
    ptag: tags.length ? tags : null,
    pcat: cats.length ? cats : null,
    palg: algs.length ? algs : null,
    pfree: free.length ? free : null,
    psel: st.cat !== "all" ? st.cat : null,
    psort: st.sort !== "kcal" ? st.sort : null,
  };
}
