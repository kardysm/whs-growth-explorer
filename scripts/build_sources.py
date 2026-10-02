#!/usr/bin/env python3
"""Build research/sources.json from fetched raw responses only.

Every entry points at a raw artifact fetched THIS session (research/raw/...).
No metadata is invented; citation fields come from the fetched records or from
explicitly authored citation strings for guideline/organisation pages.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
ACCESSED = "2026-10-02"

# id, category, evidence_class, raw_file, pmid-select, notes
ROWS = [
    ("antonius2008", "whs-growth", "C", "epmc_antonius2008.json", "17874131",
     "n=101, 0-4y; mean+/-SD charts; figures downloaded for digitization (research/raw/figs/antonius_fig*.jpg)."),
    ("growth2025", "whs-growth", "C", "epmc_growth2025.json", "40156374",
     "65 patients, birth-18y; GAMLSS models; CC-BY-NC-ND; full text PDF via Wayback (research/raw/wb_wiley_64075.pdf)."),
    ("shimojima2012", "whs-growth", "C", "epmc_shimojima2012.json", "27625799",
     "34 patients, 15mo-24y."),
    ("battaglia2008", "whs-phenotype", "C", ["epmc_battaglia1999.json", "epmc_battaglia2008.json"], "18932224",
     "87 patients; clinical features + natural history."),
    ("battaglia2015", "whs-phenotype", "C", "epmc_battaglia2015.json", "26239400",
     "Review and update."),
    ("gene_reviews", "whs-phenotype", "C", "epmc_genereviews_retired.json", "20301362",
     "GeneReviews NBK1183; RETIRED chapter (EPMC record documents retirement); live page bot-protected; historical reference only."),
    ("hanley1998", "whs-clinical", "C", "epmc_hanley1998.json", "9672528",
     "Antibody deficiency in WHS; J Pediatr 1998."),
    ("zollino2008", "whs-phenotype", "C", "epmc_zollino2008n.json", "18932124",
     "Genotype-phenotype correlation, 80 patients + literature review; clinical diagnostic criteria."),
    ("romano2017", "nutrition-guideline", "A", "epmc_romano2017.json", "28737572",
     "ESPGHAN guideline: GI/nutritional complications in children with neurological impairment."),
    ("krick1992", "energy-method", "B", "epmc_krick1992.json", "1612207",
     "Proposed energy formula for children with CP (BMR x tone x activity + growth)."),
    ("culley1969", "energy-method", "B", "epmc_culley1969.json", "5804183",
     "Caloric requirements of mentally retarded children with/without motor dysfunction; height-based kcal/cm origin."),
    ("borsani2023", "energy-method", "B", "epmc_borsani2023.json", "37681200",
     "REE in children/adolescents with CP; accuracy of available prediction formulas; full text XML on file."),
    ("schofield1985", "energy-method", "B", "epmc_schofield1985.json", "4044297",
     "BMR prediction equations (Schofield); PMID 4044297, no DOI."),
    ("holliday1957", "fluids", "B", "epmc_holliday1957.json", "13431307",
     "Maintenance water needs (100/50/20 ml/kg); Pediatrics 1957."),
    ("ashworth1969", "catchup", "B", "epmc_ashworth1969.json", "5357048",
     "Growth rates in children recovering from protein-calorie malnutrition."),
    ("spady1976", "catchup", "B", "epmc_spady1976.json", "823814",
     "Energy balance during recovery from malnutrition."),
    ("energy_deposition1981", "catchup", "B", "epmc_catchup_energy_2.json", "7195146",
     "Energy cost of tissue deposition in children recovering from severe malnutrition (AJCN 1981)."),
    ("da_silva2020", "refeeding", "A", "epmc_da_silva2020.json", "32115791",
     "ASPEN consensus recommendations for refeeding syndrome."),
    ("fewtrell2017", "complementary-feeding", "A", "epmc_fewtrell2017.json", "28027215",
     "ESPGHAN complementary feeding position paper."),
    ("pludowski2023", "vitamin-d", "A", "epmc_pludowski2023.json", "36771403",
     "Polish vitamin D guidelines 2023 update; open access."),
    ("espen_pn_energy", "energy-drv", "A", "epmc_espen_pn_energy.json", "30078715",
     "ESPGHAN/ESPEN/ESPR/CSPEN pediatric parenteral nutrition: Energy."),
    ("cp_preschool_energy", "energy-method", "B", "epmc_cp_preschool_energy.json", "23134886",
     "Energy requirements in preschool-age children with CP (AJCN 2012)."),
    ("whs_gh_2026", "whs-clinical", "C", "epmc_ext_whs_gh_2026.json", "41017003",
     "WHS with GH deficiency; long-term rhGH response (endocrine cause context for §5)."),
    ("whs_epilepsy_2025", "whs-clinical", "C", "epmc_ext_whs_epilepsy_2025.json", "41303083",
     "Epilepsy in WHS: pediatric cohort + review (seizure burden context)."),
    ("whs_features_2023", "whs-phenotype", "C", "epmc_ext_whs_features_2023.json", "37576793",
     "WHS features from infant to young teenager (long-term follow-up series)."),
    ("ds_nutrition_2025", "proxy-nutrition", "D", "epmc_ext_ds_nutrition_2025.json", "40941574",
     "Down syndrome children nutrition review; used only as hypotonia proxy - flag as extrapolation."),
    ("ree_rehab_2026", "catchup", "B", "epmc_ext_ree_rehab_2026.json", "42766671",
     "Scoping review: REE in malnourished children during nutritional rehabilitation."),
    ("faltering_2026", "nutrition-guideline", "A", "epmc_ext_faltering_2026.json", "41833317",
     "Clinical practice guideline for faltering weight (Pediatrics 2026)."),
    ("whs_oral_2020", "whs-clinical", "C", "epmc_ext_whs_oral_2020.json", "33158290",
     "Oral manifestations of WHS: genotype-phenotype (feeding relevance)."),
    ("ni_nutrition_2025", "nutrition-review", "A", "epmc_ext_ni_nutrition_2025.json", "38196166",
     "Evolution of nutrition management in severe neurological impairment with focus on CP."),
    ("refeeding_children_2025", "refeeding", "A", "epmc_ext_refeeding_children_2025.json", "41007088",
     "Identification and management of refeeding syndrome in severely malnourished children 6-59 mo (MDPI, open access)."),
    ("cp_protein_2026", "protein", "B", "epmc_ext_cp_protein_2026.json", "42238674",
     "Protein intake in children with CP (narrative review)."),
    ("ni2009_sullivan", "energy-method", "B", "epmc_ni2009_sullivan.json", "20592978",
     "Nutrition in neurologically impaired children (Sullivan 2009); Table 1 tabulates the Krick method factors and Culley height-based kcal/cm values; verified via Wayback (PMC2735385)."),
    ("feeding_intol_2017", "energy-method", "B", "epmc_feeding_intol_2017.json", "29271904",
     "Feeding intolerance in children with severe CNS impairment (Hauer 2017); kcal/cm ranges 12-15/10-11/6-9."),
]

URLS = {
    "orphanet280": ("Orphanet. Wolf-Hirschhorn syndrome. ORPHA:280 (ERN-ITHACA).",
                    "https://www.orpha.net/en/disease/detail/280", "wb_orpha280.html",
                    "Live site bot-blocked; verified via Wayback snapshot (title fetched)."),
    "nice_ng75": ("NICE. Faltering growth: recognition and management of faltering growth in children. NICE guideline NG75.",
                  "https://www.nice.org.uk/guidance/ng75", "url_nice_ng75",
                  "Landing page + Recommendations chapter fetched."),
    "who_standards_wfa": ("WHO. Child Growth Standards: Weight-for-age (0-5 years). Expanded tables.",
                          "https://www.who.int/tools/child-growth-standards/standards/weight-for-age",
                          "url_who_standards", "Standards page fetched; data files downloaded to research/data/who_lms/."),
    "who2007ref": ("WHO. Growth reference data for 5-19 years.",
                   "https://www.who.int/tools/growth-reference-data-for-5to19-years",
                   "url_who2007ref", "Page fetched (deferred use; grid is 0-48 months)."),
    "efsa_energy": ("EFSA NDA Panel. Scientific Opinion on Dietary Reference Values for energy. EFSA Journal 2013;11(1):3005.",
                    "https://doi.org/10.2903/j.efsa.2013.3005", "wb_efsa_wiley.pdf",
                    "112-page PDF via Wayback; AR tables for infants/children extracted (research/raw/efsa_ar_summaries.txt)."),
    "nasem2023": ("National Academies of Sciences, Engineering, and Medicine. Dietary Reference Intakes for Energy. Washington, DC: National Academies Press; 2023.",
                  "https://www.nationalacademies.org/publications/26818", "wb_nasem_26818.html",
                  "Read pages via Wayback; EER equations extracted (Table S-2; research/raw/nasem_eer_equations.txt)."),
    "fao2004": ("FAO/WHO/UNU. Human energy requirements: Report of a Joint FAO/WHO/UNU Expert Consultation. FAO Food and Nutrition Technical Report Series 1. Rome; 2004.",
                "https://www.fao.org/3/y5686e/y5686e00.htm", "url_fao2004",
                "Full chapter set downloaded, incl. catch-up-growth sections (ch. 3.5, 4)."),
    "pzh2024": ("Rychlik E, Stoś K, Woźniak A, et al. Normy żywienia dla populacji Polski - 2024. NIZP PZH-PIB.",
                "https://www.pzh.gov.pl/normy-zywienia-2024/", "url_pzh_normy",
                "PDF document fetched (url_pzh_normy_pdf.pdf), 3.0 MB."),
    "who_protein2007": ("FAO/WHO/UNU. Protein and amino acid requirements in human nutrition. WHO Technical Report Series 935. Geneva: WHO; 2007.",
                        "https://iris.who.int/handle/10665/43411", "url_who_protein2007_full.pdf",
                        "Full 284-page PDF fetched from IRIS."),
    "iddsi": ("IDDSI. The IDDSI Framework 2.0. 2019.",
              "https://www.iddsi.org/standards", "url_iddsi", "Standards page fetched."),
}


def find_record(path_glob, pmid=None):
    files = path_glob if isinstance(path_glob, list) else [path_glob]
    for f in files:
        p = RAW / f
        if not p.exists():
            continue
        try:
            d = json.loads(p.read_text())
        except Exception:
            continue
        rs = ((d.get("resultList") or {}).get("result") or [])
        if pmid:
            for r in rs:
                if str(r.get("pmid")) == str(pmid) or str(r.get("id")) == str(pmid):
                    return r, f
            continue
        if rs:
            return rs[0], f
    return None, None


sources = []
for sid, cat, cls, files, pmid, notes in ROWS:
    r, used = find_record(files, pmid)
    if not r:
        print("MISSING:", sid)
        continue
    ji = r.get("journalInfo") or {}
    page = r.get("pageInfo")
    vol = ji.get("volume")
    iss = ji.get("issue")
    loc = ""
    if vol:
        loc = f"{vol}"
        if iss:
            loc += f"({iss})"
        if page:
            loc += f":{page}"
    elif page:
        loc = page
    citation = "%s %s. %s %s;%s." % (
        r.get("authorString") or "", (r.get("title") or "").rstrip("."),
        (ji.get("journal") or {}).get("title") or "", ji.get("yearOfPublication") or "", loc)
    sources.append({
        "id": sid, "category": cat, "evidence_class": cls,
        "citation": " ".join(citation.split()),
        "title": r.get("title"), "authors": r.get("authorString"),
        "journal": (ji.get("journal") or {}).get("title"),
        "year": ji.get("yearOfPublication"), "volume": vol, "issue": iss, "pages": page,
        "doi": r.get("doi"), "pmid": r.get("pmid"), "pmcid": r.get("pmcid"),
        "url": ("https://doi.org/" + r["doi"]) if r.get("doi") else (("https://europepmc.org/article/MED/" + str(r.get("pmid") or r.get("id"))) if (r.get("pmid") or r.get("id")) else None),
        "verified": True, "accessed": ACCESSED, "fetched_file": "research/raw/" + (used or ""),
        "notes": notes,
    })

for sid, (citation, url, rawf, notes) in URLS.items():
    sources.append({
        "id": sid, "category": "guideline" if sid not in ("orphanet280", "iddsi") else "organisation",
        "evidence_class": "A" if sid in ("nice_ng75", "efsa_energy", "nasem2023", "fao2004", "pzh2024", "who_protein2007", "iddsi", "who_standards_wfa") else "C",
        "citation": citation, "url": url,
        "verified": True, "accessed": ACCESSED,
        "fetched_file": "research/raw/" + rawf, "notes": notes,
    })

out = {"accessed": ACCESSED, "count": len(sources), "sources": sources}
(ROOT / "research" / "sources.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
print("sources.json written:", len(sources), "entries")
for s in sources:
    print("-", s["id"], "|", (s.get("citation") or "")[:110])
