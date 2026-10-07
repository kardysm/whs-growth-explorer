/**
 * Unit tests for the URL-state helpers (user request 2026-10-07):
 * language paths, calculator parameters, products-search parameters.
 */
import { describe, expect, it } from "vitest";
import {
  calcUrlParams,
  langFromPath,
  parseCalcParams,
  parseMilkProduct,
  parseProductsParams,
  productsUrlParams,
  siteRoot,
  type Inputs,
  type ProductsState,
  type ProductsVocab,
} from "./urlstate.js";

const baseInput: Inputs = {
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

describe("langFromPath", () => {
  it("reads a trailing language segment in all served forms", () => {
    expect(langFromPath("/pl/")).toBe("pl");
    expect(langFromPath("/en/")).toBe("en");
    expect(langFromPath("/pl")).toBe("pl");
    expect(langFromPath("/en")).toBe("en");
    expect(langFromPath("/pl/index.html")).toBe("pl");
    expect(langFromPath("/whs-growth-explorer/pl/")).toBe("pl");
    expect(langFromPath("/whs-growth-explorer/en/index.html")).toBe("en");
  });

  it("returns null for paths without a language segment", () => {
    expect(langFromPath("/")).toBeNull();
    expect(langFromPath("/whs-growth-explorer/")).toBeNull();
    expect(langFromPath("/whs-growth-explorer/index.html")).toBeNull();
    expect(langFromPath("/preview-en/")).toBeNull(); // no segment boundary before "en"
    expect(langFromPath("/enigma/")).toBeNull();
    expect(langFromPath("/something/plans/")).toBeNull();
  });
});

describe("siteRoot", () => {
  it("strips the language segment and trailing file names", () => {
    expect(siteRoot("/whs-growth-explorer/pl/")).toBe("/whs-growth-explorer/");
    expect(siteRoot("/whs-growth-explorer/en/index.html")).toBe("/whs-growth-explorer/");
    expect(siteRoot("/whs-growth-explorer/index.html")).toBe("/whs-growth-explorer/");
    expect(siteRoot("/pl/")).toBe("/");
    expect(siteRoot("/en")).toBe("/");
    expect(siteRoot("/whs-growth-explorer/")).toBe("/whs-growth-explorer/");
    expect(siteRoot("/whs-growth-explorer")).toBe("/whs-growth-explorer/");
    expect(siteRoot("/")).toBe("/");
  });
});

describe("parseCalcParams", () => {
  it("reads every supported parameter", () => {
    const sp = new URLSearchParams(
      "sex=girls&age=12&weight=6.5&length=66.5&tone=normal&mobility=crawling&target=whs_minus1sd&horizon=8&milkDensity=0.8&mealDensity=1.2&milkMl=420&feeds=6&milkPortion=80&mealPortion=150&intake=590"
    );
    expect(parseCalcParams(sp)).toEqual({
      sex: "girls",
      age: 12,
      weight: 6.5,
      length: 66.5,
      tone: "normal",
      mobility: "crawling",
      targetRef: "whs_minus1sd",
      horizonWeeks: 8,
      milkDensity: 0.8,
      mealDensity: 1.2,
      milkMl: 420,
      feeds: 6,
      milkPortionMl: 80,
      mealPortionG: 150,
      intake: 590,
    });
  });

  it("ignores absent, empty and out-of-range values", () => {
    expect(parseCalcParams(new URLSearchParams(""))).toEqual({});
    expect(parseCalcParams(new URLSearchParams("age=&weight="))).toEqual({});
    expect(parseCalcParams(new URLSearchParams("age=99&weight=0.5&length=5&horizon=1"))).toEqual({});
    expect(parseCalcParams(new URLSearchParams("feeds=0&milkPortion=5&mealPortion=1000&intake=9999"))).toEqual({});
    expect(parseCalcParams(new URLSearchParams("age=abc&weight=NaN"))).toEqual({});
  });

  it("ignores unknown enum values", () => {
    expect(parseCalcParams(new URLSearchParams("sex=other&tone=xyz&mobility=flying&target=none"))).toEqual({});
  });
});

describe("calc params round-trip", () => {
  it("serialises the full state and parses it back to the same input", () => {
    const full: Inputs = { ...baseInput, sex: "girls", age: 12, weight: 6.5, length: null, feeds: 6, milkPortionMl: 80, mealPortionG: 150, intake: 590 };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(calcUrlParams(full))) if (v !== null) sp.set(k, v);
    const applied: Inputs = { ...baseInput, length: null };
    Object.assign(applied, parseCalcParams(sp));
    expect(applied).toEqual(full);
  });

  it("omits empty (null) fields", () => {
    const p = calcUrlParams(baseInput);
    expect(p.length).toBe("74");
    expect(p.feeds).toBeNull();
    expect(p.milkPortion).toBeNull();
    expect(p.mealPortion).toBeNull();
    expect(p.intake).toBeNull();
    expect(Object.values(p).filter((v) => v !== null)).toHaveLength(11);
  });
});

const vocab: ProductsVocab = {
  tags: new Set(["high-energy", "lactose-free"]),
  cats: new Set(["dairy"]),
  algs: new Set(["milk"]),
};

describe("parseMilkProduct", () => {
  const ids = new Set(["fsmp-infatrini", "formula-standard-hipp1"]);

  it("accepts a known milk id and rejects unknown or absent ones", () => {
    expect(parseMilkProduct(new URLSearchParams("milk=fsmp-infatrini"), ids)).toBe("fsmp-infatrini");
    expect(parseMilkProduct(new URLSearchParams("milk=not-a-milk"), ids)).toBeNull();
    expect(parseMilkProduct(new URLSearchParams(""), ids)).toBeNull();
  });
});

describe("parseProductsParams", () => {
  it("reads text, chips (validated), category and sort", () => {
    const sp = new URLSearchParams(
      "pq=mleko&ptag=high-energy&ptag=bogus&pcat=dairy&pcat=unknown&palg=milk&pfree=%C5%BCelazo&psel=dairy&psort=name"
    );
    const out = parseProductsParams(sp, vocab);
    expect(out.search).toBe("mleko");
    expect(out.chips).toEqual([
      { kind: "tag", key: "high-energy" },
      { kind: "cat", key: "dairy" },
      { kind: "alg", key: "milk" },
      { kind: "free", text: "żelazo" },
    ]);
    expect(out.cat).toBe("dairy");
    expect(out.sort).toBe("name");
  });

  it("returns nothing for an empty query string", () => {
    expect(parseProductsParams(new URLSearchParams(""), vocab)).toEqual({});
  });

  it("keeps free-text chips with commas and repeats", () => {
    const sp = new URLSearchParams("pfree=a%2Cb&pfree=c");
    const out = parseProductsParams(sp, vocab);
    expect(out.chips).toEqual([
      { kind: "free", text: "a,b" },
      { kind: "free", text: "c" },
    ]);
  });
});

describe("products params round-trip", () => {
  const empty: ProductsState = { search: "", chips: [], cat: "all", sort: "kcal" };

  it("omits everything for the empty state", () => {
    const p = productsUrlParams(empty);
    expect(Object.values(p).every((v) => v === null)).toBe(true);
  });

  it("serialises and parses back to the same state", () => {
    const st: ProductsState = {
      search: "mleko",
      chips: [
        { kind: "tag", key: "high-energy" },
        { kind: "cat", key: "dairy" },
        { kind: "alg", key: "milk" },
        { kind: "free", text: "żelazo, wątróbka" },
      ],
      cat: "dairy",
      sort: "protein",
    };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(productsUrlParams(st))) {
      if (v === null) continue;
      if (Array.isArray(v)) for (const x of v) sp.append(k, x);
      else sp.set(k, v);
    }
    const out = parseProductsParams(sp, vocab);
    expect(out).toEqual(st);
  });

  it("omits default category and sort", () => {
    const p = productsUrlParams({ ...empty, search: "abc" });
    expect(p.pq).toBe("abc");
    expect(p.psel).toBeNull();
    expect(p.psort).toBeNull();
  });
});
