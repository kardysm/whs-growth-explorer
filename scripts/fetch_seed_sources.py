#!/usr/bin/env python3
"""Fetch/verify WHS Feeding & Growth Explorer seed sources.

Rules (GOAL.md 1.2): nothing is marked verified from memory - only from
responses fetched in this session. Raw responses go to research/raw/.

- DOI/PMID/title seeds -> Europe PMC REST (resultType=core), CrossRef fallback for DOIs.
- URL seeds -> curl (browser UA), body + HTTP code stored.
- Open-access items: also try fullTextXML; record figure hrefs (for later digitization).
Summary written to research/seed_fetch_results.json.
"""
import datetime
import json
import pathlib
import re
import subprocess
import time
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
RAW.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
ACCESSED = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"


def curl(url, dest, max_time=90):
    p = subprocess.run(
        ["curl", "-sS", "-L", "--max-time", str(max_time), "-A", UA,
         "-o", str(dest), "-w", "%{http_code}|%{content_type}|%{size_download}", url],
        capture_output=True, text=True)
    parts = (p.stdout or "").strip().split("|")
    try:
        code = int(parts[0])
    except Exception:
        code = 0
    ctype = parts[1] if len(parts) > 1 else ""
    size = parts[2] if len(parts) > 2 else "0"
    ok = (p.returncode == 0 and 200 <= code < 400)
    return code, ctype, size, ok


SEEDS = [
    # --- WHS growth & phenotype ---
    {"id": "antonius2008", "kind": "doi", "q": "10.1007/s00431-007-0595-8", "fulltext": True},
    {"id": "growth2025", "kind": "doi", "q": "10.1002/ajmg.a.64075", "fulltext": True},
    {"id": "shimojima2012", "kind": "doi", "q": "10.3233/PGE-2012-007"},
    {"id": "battaglia2008", "kind": "title", "q": "Update on clinical features and natural history of Wolf-Hirschhorn syndrome 87 patients"},
    {"id": "battaglia2015", "kind": "title", "q": "Wolf-Hirschhorn syndrome a review and update Battaglia Carey South"},
    {"id": "hanley1998", "kind": "title", "q": "antibody deficiency in Wolf-Hirschhorn syndrome"},
    {"id": "zollino2008", "kind": "title", "q": "Genotype-phenotype correlations and clinical diagnostic criteria in Wolf-Hirschhorn syndrome"},
    {"id": "gene_reviews", "kind": "url", "q": "https://www.ncbi.nlm.nih.gov/books/NBK1183/"},
    {"id": "orphanet280", "kind": "url", "q": "https://www.orpha.net/en/disease/detail/280"},
    # --- Nutrition / NI / growth methodology ---
    {"id": "romano2017", "kind": "doi", "q": "10.1097/MPG.0000000000001740", "fulltext": True},
    {"id": "nice_ng75", "kind": "url", "q": "https://www.nice.org.uk/guidance/ng75"},
    {"id": "krick1992", "kind": "pmid", "q": "1612207"},
    {"id": "culley1969", "kind": "title", "q": "Culley caloric requirements cerebral palsy children height"},
    {"id": "borsani2023", "kind": "doi", "q": "10.3389/fped.2023.1097152", "fulltext": True},
    {"id": "schofield1985", "kind": "title", "q": "Predicting basal metabolic rate new standards and review of previous work Schofield"},
    {"id": "who_standards", "kind": "url", "q": "https://www.who.int/tools/child-growth-standards/standards/weight-for-age"},
    {"id": "who2007ref", "kind": "url", "q": "https://www.who.int/tools/growth-reference-data-for-5to19-years"},
    {"id": "efsa_energy", "kind": "url", "q": "https://www.efsa.europa.eu/en/efsajournal/pub/3005"},
    {"id": "nasem2023", "kind": "url", "q": "https://nap.nationalacademies.org/catalog/26840/dietary-reference-intakes-for-energy"},
    {"id": "fao2004", "kind": "url", "q": "https://www.fao.org/3/y5686e/y5686e00.htm"},
    {"id": "pzh_normy", "kind": "url", "q": "https://www.pzh.gov.pl/normy-zywienia-2024/"},
    {"id": "pzh_normy_pdf", "kind": "url", "q": "https://www.pzh.gov.pl/wp-content/uploads/2025/01/normy-02.01.pdf"},
    {"id": "who_protein2007", "kind": "url", "q": "https://www.who.int/publications/i/item/9241209356"},
    {"id": "holliday1957", "kind": "title", "q": "The maintenance need for water in parenteral fluid therapy Holliday Segar"},
    {"id": "ashworth1969", "kind": "title", "q": "Growth rates in children recovering from protein-calorie malnutrition"},
    {"id": "catchup_energy", "kind": "title", "q": "energy cost of catch-up growth in malnourished children"},
    {"id": "da_silva2020", "kind": "doi", "q": "10.1002/ncp.10474"},
    {"id": "fewtrell2017", "kind": "doi", "q": "10.1097/MPG.0000000000001454"},
    {"id": "pludowski2023", "kind": "doi", "q": "10.3390/nu15030695"},
    {"id": "iddsi", "kind": "url", "q": "https://www.iddsi.org/standards"},
    {"id": "espen_pn_energy", "kind": "title", "q": "ESPGHAN ESPEN ESPR CSPEN guidelines on pediatric parenteral nutrition energy"},
    {"id": "espen_pn_energy_pdf", "kind": "url", "q": "https://espen.org/documents/A174-02PaedPNGuidel_ESPGHANESPENPNGuidelines2Energy.pdf"},
    {"id": "cp_preschool_energy", "kind": "title", "q": "Energy requirements in preschool-age children with cerebral palsy"},
]

results = []
for s in SEEDS:
    rec = {"id": s["id"], "kind": s["kind"], "query": s["q"], "accessed": ACCESSED}
    try:
        if s["kind"] in ("doi", "pmid", "title"):
            if s["kind"] == "doi":
                q = 'DOI:"%s"' % s["q"]
            elif s["kind"] == "pmid":
                q = "EXT_ID:%s AND SRC:MED" % s["q"]
            else:
                q = s["q"]
            url = EPMC + "?" + urllib.parse.urlencode(
                {"query": q, "format": "json", "resultType": "core", "pageSize": "5"})
            dest = RAW / ("epmc_%s.json" % s["id"])
            code, ctype, size, ok = curl(url, dest)
            rec.update({"epmc_http": code, "epmc_file": str(dest.relative_to(ROOT))})
            if ok:
                data = json.loads(dest.read_text())
                hits = data.get("hitCount", 0)
                rec["hitCount"] = hits
                rl = (data.get("resultList") or {}).get("result") or []
                if rl:
                    top = rl[0]
                    ji = (top.get("journalInfo") or {})
                    rec["top"] = {
                        "pmid": top.get("pmid"), "pmcid": top.get("pmcid"), "doi": top.get("doi"),
                        "title": top.get("title"), "authors": top.get("authorString"),
                        "journal": (ji.get("journal") or {}).get("title"),
                        "year": ji.get("yearOfPublication"),
                        "volume": ji.get("volume"), "issue": ji.get("issue"),
                        "pages": top.get("pageInfo"),
                        "openAccess": top.get("isOpenAccess"),
                    }
                    rec["top5"] = [{"id": r.get("id"), "title": r.get("title"),
                                    "pmid": r.get("pmid"), "doi": r.get("doi"),
                                    "year": (r.get("journalInfo") or {}).get("yearOfPublication")}
                                   for r in rl]
                    if s.get("fulltext") and top.get("pmcid"):
                        fx = "https://www.ebi.ac.uk/europepmc/webservices/rest/%s/fullTextXML" % top["pmcid"]
                        fdest = RAW / ("fulltext_%s.xml" % s["id"])
                        fcode, fctype, fsize, fok = curl(fx, fdest)
                        rec["fulltext_http"] = fcode
                        if fok:
                            rec["fulltext_file"] = str(fdest.relative_to(ROOT))
                            txt = fdest.read_text(errors="ignore")
                            figs = re.findall(r'(?:xlink:)?href="([^"]+\.(?:jpg|jpeg|png|gif|tif))"', txt, re.I)
                            rec["figures"] = sorted(set(figs))
                else:
                    if s["kind"] == "doi":
                        cr = "https://api.crossref.org/works/%s" % s["q"]
                        cdest = RAW / ("crossref_%s.json" % s["id"])
                        ccode, cctype, csize, cok = curl(cr, cdest)
                        rec["crossref_http"] = ccode
                        rec["crossref_file"] = str(cdest.relative_to(ROOT))
                        if cok:
                            m = json.loads(cdest.read_text()).get("message", {})
                            rec["crossref"] = {
                                "title": (m.get("title") or [""])[0],
                                "container": (m.get("container-title") or [""])[0],
                                "year": ((m.get("issued") or {}).get("date-parts") or [[None]])[0][0],
                                "volume": m.get("volume"), "issue": m.get("issue"), "page": m.get("page"),
                            }
                time.sleep(0.75)
        else:  # url
            dest = RAW / ("url_%s" % s["id"] if "pdf" not in s["id"] else "url_%s.pdf" % s["id"])
            code, ctype, size, ok = curl(s["q"], dest)
            rec.update({"http": code, "content_type": ctype, "bytes": size,
                        "file": str(dest.relative_to(ROOT))})
    except Exception as e:  # keep going, record the failure
        rec["error"] = "%s: %s" % (type(e).__name__, e)
    results.append(rec)
    t = (rec.get("top") or {}).get("title") or (rec.get("crossref") or {}).get("title") or ""
    status = "HTTP %s" % (rec.get("epmc_http") or rec.get("http"))
    if rec.get("hitCount") == 0 and s["kind"] == "doi":
        status += " / crossref %s" % rec.get("crossref_http")
    print("%-18s %-24s %s" % (s["id"], status, (t[:80] or "(no title)").replace("\n", " ")))

out = ROOT / "research" / "seed_fetch_results.json"
out.write_text(json.dumps({"accessed": ACCESSED, "results": results}, indent=1))
print("\nWrote %s (%d seeds)" % (out, len(results)))
