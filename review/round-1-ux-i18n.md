# Round 1 — UX / i18n review (independent auditor, fresh context)

Auditor role: GOAL.md §7.1 role 4 (Polish language quality, search quality, hover/table sync, mobile, accessibility).
Date: 2026-10-02. Scope: `content/*.json`, `src/ui/*`, built site in `dist/` (served on `localhost:8793`), both PL and EN.

**Summary: 0 critical · 13 major · 19 minor.**
Top 3 issues: (1) calculator results/warnings are English-only in the PL-primary UI (B1); (2) Ctrl+K search cannot find section names the placeholder advertises, nor products by their visible localized tags (C1, C2) — and its keyboard/modal behaviour is broken (C3); (3) dark mode: key chart series lines and the child marker are near-invisible (~1.2–2.4:1) and the focus ring fails WCAG 1.4.11 (F1, F2).

Method: source review of all five content files and `src/ui/{main.ts,styles.css}`; live inspection of the production build in a real browser (Chromium) — DOM/state extraction, scripted keyboard interaction, axe-core (WCAG 2.0/2.1 A+AA, injected from a local test server so `dist/` was not modified), CDP device emulation (320–390 px), contrast computation (WCAG formula), and screen-capture + visual inspection. axe re-runs in my sessions: light 0/0, dark 0/0, dialog-open 0 violations + 1 incomplete (`color-contrast` on `#search-close`, backdrop-related) — i.e. all a11y findings below are **beyond axe's detection**.

---

## A. Polish language quality

### A1 [major] — Ambiguous safety instruction about concentrating infant formula
- **Location**: `content/base.json` → `start.safety.pl[0]` (line 55): "Nigdy nie zagęszczaj mleka modyfikowanego mocniej, niż podaje producent…"; `content/rules.json` → block `infant`, item 0: "NIGDY nie zagęszczaj mleka modyfikowanego ponad instrukcję producenta" (EN mirror: "concentrate infant formula beyond the manufacturer's instructions").
- **Evidence**: "zagęszczać" in Polish infant-feeding language means *to thicken* (with a thickener), a different operation from *concentrating* (more powder per ml water). "zagęszczaj … mocniej, niż podaje producent" / "ponad instrukcję" is not idiomatic and can be misread; the red-flag/safety intent ("never concentrate beyond instructions") does not come through cleanly. Note: this overlaps the clinical-safety reviewer's remit; raised here as wording.
- **Suggested fix**: "Nigdy nie przygotowuj mleka modyfikowanego o wyższym stężeniu energii niż podaje producent (np. więcej proszku na mniej wody) i nie dodawaj modułów energetycznych/białkowych bez nadzoru klinicznego." Also review whether thickening is separately addressed.

### A2 [minor] — Typos (5 confirmed)
- **Location / evidence** (all render in the UI; verified in the live PL build):
  - `base.json` line 101 `calc.method_d_t`: **"D. Daganianie wzrostu"** → "Doganianie". Appears in result cards "D. Daganianie wzrostu (catch-up)" and "… — 2".
  - `flags.json` item "now" #1: **"senne/aparyczne"** → "apatyczne".
  - `reasons.json` group 2 check: **"Kalprotaktyna"** → "kalprotektyna" (web-verified standard PL spelling).
  - `reasons.json` group 1 item 2: **"Aversja"** → "awersja".
  - `base.json` line 170 `method.p6`: **"Aminokwasy/oiligo"** → unclear; likely "oligopeptydy". The EN mirror ("rare modules") is also not a translation of anything recognizable.
- **Fix**: correct the five strings; unify "oiligo" with the intended term (PL and EN).

### A3 [minor] — Grammar / agreement defects
- **Location / evidence**:
  - `base.json` line 57: **"Przy znacznego stopnia niedożywieniu"** → "Przy znacznym stopniu niedożywienia" (case error).
  - `reasons.json` group 4 item 0 (line 120): "Dziecko z WHS może być **zdrowym** 'na swoim' kanale" → "zdrowe" (neuter subject).
  - `base.json` line 170: "…nie uwzględnia indywidualnej absorpcji, **a przy gęstości >1 kcal/ml wymaga nadzoru klinicznego**" — subject is "kalkulator", but the intended subject is the *use of* high density. → "a stosowanie gęstości >1 kcal/ml wymaga nadzoru klinicznego".
  - `base.json` line 162 (`method.p4`, PL and EN): "Siatka WHS (**„An”** z kalkulatora)" / "WHS chart (\"An\" in the calculator)" — no element labelled "An" exists anywhere in the UI; broken reference (appears to leak an internal variable name).
- **Fix**: rephrase as above; replace "An" with the actual UI label ("Siatka WHS — średnia").

### A4 [minor] — Clinical register / calque / clarity cluster (Polish)
- **Location / evidence** (selection; all visible to users):
  - "prędkość masy < −2 z" (`flags.json` intro + item) — literal calque of "weight velocity"; PL clinical usage prefers "tempo przyrostu masy ciała". Also "spadek ≥1 z" → "spadek o ≥1 SD (z)" reads better; "siatek z-score" → "kryteriów z-score".
  - "męczenie się" (`reasons.json` group 1 check) → "męczliwość".
  - "próba leczenia próbnego" (`reasons.json` group 2 check) — redundant; → "próba leczenia empirycznego".
  - "diagnostyka pod gastroenterologiem" (`flags.json`) → "pod kontrolą gastroenterologa".
  - "ta sama **waga**" (`flags.json`, `rules.json`, `reasons.json`) — "waga" = scale vs weight ambiguity; → "ta sama waga (urządzenie)" or add the noun.
  - "narzędzie pokazuje **banner** ryzyka" (`flags.json`) → "ostrzeżenie"; the PL UI elsewhere says "baner"/nothing — anglicism in a caregiver-facing string.
  - "**kaloryczność w ml**" (`rules.json` texture item) → "wartość energetyczna na mililitr".
  - "**przeklasyfikuj** przyczyny" (`flags.json`) → "przejrzyj ponownie".
  - "zgodnie z normami" redundancy after "Żelazo: **normy** (EAR/RDA)…" (`rules.json` micro item).
  - "(wzdęcia, **wody**)" (`rules.json` macro item) — "wody" is unclear shorthand; → "wodniste stolce".
  - "„dokarmianie” po niedożywieniu" (`flags.json` refeeding item) — "dokarmianie" is not refeeding; the site elsewhere uses "zespół ponownego odżywienia". → "ponowne odżywianie (refeeding)".
  - "Wymioty (**zwłaszcza treścią zieloną** lub podbarwioną krwią)" → "o zielonym zabarwieniu lub podbarwione krwią".
  - Minor terminology: "Zapotrzebowanie **podstawowe**" for maintenance → "podtrzymujące" is the usual PL term; mixed "kcal/24h" vs "kcal/dzień" across UI.
- **Fix**: copy-edit pass with these substitutions; keep one term per concept (tone/velocity/density).

---

## B. EN mirror & localization completeness

### B1 [major] — Calculator notes, guardrails and warnings are English-only in the PL default UI
- **Location**: `src/calc/methods.ts` returns hardcoded English strings that `main.ts` renders directly: notes (lines 88, 91, 109–112, 123, 126, 192–196, 227–229), guardrails (218–221), volume flags (250–252), F note (264–266); rendered at `main.ts` lines 276, 283–305.
- **Evidence** (live PL mode, "Jak to policzono" expanded): all 14 notes are English, e.g. "Methods differ by more than 5% - both shown.", "weight-age = 6.2 months", "Krick-type: BMR (Schofield weight+height) x tone x activity…", "energy cost of tissue gain: 4.1 / 5.0 / 6.0 kcal/g …", "target weight not above current weight for the chosen horizon/reference". **Visible (not only in details)**: warning banner "volume needed (547 ml) exceeds Holliday-Segar maintenance fluid (450 ml) at this density" and F-card text "measured intake near maintenance estimate - if weight is not rising, see section 5 (…)" — both shown to PL users in English. GOAL §5 requires all strings in `content/*.json` with `pl`/`en`; §0/§1 make PL primary.
- **Fix**: move all user-facing calc strings to content keys with `pl`/`en` (or a small i18n table in `src/ui`), translate, and pass `lang` into rendering; also fix "section 5" to name the actual section ("Dlaczego mimo jedzenia?").

### B2 [minor] — Language leftovers in the other locale
- **Location / evidence** (live checks):
  - PL strings shown in EN mode: `main.ts` line 722 hardcodes "błonnik" and PL abbreviations "B/T/W" (protein/fat/carbs) in every product card ("100 ml: 100 kcal · B 2.6 g · T 5.3 g · W 10.2 g · błonnik 0.57 g …"); E-card headers "gęstość / density", "płyny podtrzymujące / maintenance fluid" (lines 297–299) and "białko / protein" are bilingual hardcodes rendered in both languages.
  - `products.json` `source.label` is PL-only ("Nutricia … — tabela wartości odżywczej producenta") and renders in EN.
  - Chart series/legend names are English in PL mode ("WHS mean", "WHO median", "maintenance fluid" is localized but "ml @0.67" uses dot decimals; `main.ts` lines 356, 400–409, 428–432).
  - Food `portions[].desc` are English + imperial ("1 tbsp", "1 oz", '1 pat (1" sq…)') and render in the PL product cards under "porcje domowe".
- **Fix**: use `pl`/`en`-aware formatting for the nutrient line ("B/T/W" → "B/T/W" only for PL, "P/F/C" or spelled-out for EN; "błonnik" → "fibre"), localize E-card headers and chart series names, translate or convert portion descriptions to metric PL measures.

### B3 [minor] — Decimal separators inconsistent; raw floats leak into the UI
- **Evidence** (PL mode): product cards "B **2.6** g … **0.57** g"; calculator card B title "wiek masowy: **6.2** mies."; table weight column "**2.25**", "**2.50**"; chart tooltip "B **960.2275197628458**"; series "ml @**0.67**" vs the hint "**0,67**/1,0/1,5". Meanwhile results bands and labels correctly use commas ("1 234", "0,67"). PL convention is the decimal comma; tooltips should also be rounded.
- **Fix**: route all numeric display through `fmt()`/`Intl.NumberFormat('pl-PL')`; add an ECharts tooltip `valueFormatter`/custom formatter.

### B4 [minor] — Plural forms broken
- **Evidence**: PL section counter shows "**1 pozycji**" (search "mleko": 1 card) and "**3 pozycji**" (search "masło"); correct PL: "1 pozycja", "2–4 pozycje", "5+ pozycji". EN shows "**1 items**" (search "tahini"). `main.ts` line 713 concatenates a single string.
- **Fix**: implement simple plural rules (pl: 1/2–4/other; en: 1/other).

### B5 [minor] — Typographic quote inconsistency in PL strings
- **Evidence**: straight `'…'` appear in **7 PL strings in `reasons.json`** (e.g. "je 'normalnie'", "'na oko'", "'nie tyje mimo jedzenia'") and **1 PL string in `rules.json`** ("źródło 'szybkiej' energii"), while `base.json`/`flags.json` use Polish „…” throughout. Straight apostrophes also interact badly with future typographic checks.
- **Fix**: normalise PL copy to „…”; keep `'…'` only in EN.

### B6 [minor] — Source notes are English-only; access label wording
- **Evidence**: all 44 entries in `sources.json` carry English `notes` (e.g. "n=101, 0-4y; mean+/-SD charts; figures downloaded for digitization…", "GeneReviews NBK1183; RETIRED chapter…"), rendered raw in PL UI. PL label "dostęp:" (EN "accessed") should read "data dostępu:" in PL.
- **Fix**: translate or shorten notes (or mark as EN reference notes); adjust label.

### B7 [minor] — Static meta not localized
- **Evidence**: `dist/index.html` `<meta name="description">` is PL-only and never updated on EN toggle (`main.ts` only updates `documentElement.lang`); `<title>` is the EN brand in both (acceptable).
- **Fix**: update description via JS on language switch, or accept and note.

---

## C. Ctrl+K search overlay

### C1 [major] — Section names advertised in the placeholder are not searchable
- **Location**: `main.ts` `buildSearchIndex()` (lines 775–806) indexes only item title+text for sections 5–8; the `section` field is not a Fuse key. Placeholder (`base.json` `search.ph`): "Szukaj: dlaczego / sygnały / zasady / produkty…" / "Search: why / flags / rules / products…".
- **Evidence** (live): PL "**sygnały**" → 2 hits, none from "Sygnały alarmowe" (top: a fluids rules item); "**produkty**" → 3 hits, none a product card; "**kalkulator**" → 3 irrelevant; EN "**red flags**" → "No results."; EN "**flags**" → 1 hit = "Flaxseed"; EN "**why**" → 12 noisy hits. Section-level queries fail exactly where the placeholder tells users to start.
- **Fix**: index section names/nav labels (+ section intros) as searchable keys, or change the placeholder to match reality.

### C2 [major] — Localized tags/category labels not searchable (global search and section-8 filter)
- **Location**: `main.ts` buildSearchIndex product text = `${x.tags.join(" ")}` (raw slugs, lines 799–804); section filter `paint()` = name.pl + name.en + `x.tags.join(" ")` (line 707).
- **Evidence** (live):
  - Global search: "**żelazo**" → 4 hits, **0 products**, although 26 product cards display a "żelazo" badge; EN "**iron**" → 12 text hits, 0 products; "**vitamin D**"/"**gęste energetycznie**"/"**energy-dense**" → no product cards; only raw slugs work ("**Fe**", "**high-energy**").
  - Section filter: "żelazo" → **0 cards**, "Fe" → 26; "gęste energetycznie" → 0, "high-energy" → 36. Category labels ("tłuszcze") and `form` text (e.g. "truskawkowy" flavour) are likewise unmatched.
- **Fix**: index and filter on the localized `taglabels`/`cats` strings (both languages), category names, and `form`; keep raw slugs as an extra.

### C3 [major] — Keyboard / modal behaviour of the search dialog is broken in several ways
- **Location**: `main.ts` lines 818–892 (openSearch/closeSearch/goSearch/searchKey/global keydown); markup line 119 (`role="dialog" aria-modal="true"`); `styles.css` 151–159.
- **Evidence** (live, keyboard-only):
  - **No focus trap**: with the dialog open, Tab cycles `search-input → search-close → skip-link → nav "Start" → "Kalkulator" → …` — focus walks the page *behind* the modal.
  - **Background is operable**: focusing and activating the nav "Start" link while the overlay was open navigated the page and the overlay **stayed open**.
  - **Focus is lost**: after Enter (opening a result) and after Esc, `document.activeElement` = `BODY`; focus is not returned to the opener, and the target element is only scrolled/flashed — not focused or announced (`goSearch` uses `scrollIntoView` + class flash only; targets have no `tabindex="-1"`).
  - **Selection invisible to AT and possibly off-screen**: `ArrowDown` only toggles a CSS `.active` class (no `aria-activedescendant`/`aria-selected`; list is a plain `<ul aria-live="polite">`). With 12 results, 11 × `ArrowDown` moved the selection to item 12 while `#search-results.scrollTop` stayed 0 → the "active" item was outside the visible list area; Enter then opens an item the user cannot see.
- **Fix**: trap focus inside the panel (or make the background `inert`), restore focus to `#search-open` on close, focus the destination (`tabindex="-1"`+`.focus()`) and announce it, add `aria-activedescendant` + `scrollIntoView({block:'nearest'})` for the active result.

### C4 [minor] — Fuzzy-search precision and diacritics
- **Evidence**: "tahini" → 12 results (only #1 relevant); "high-energy" → 12 (fine); "kalkulator" → 3 irrelevant; "**zelazo**" (no diacritics, as Poles often type) → top hit "**Olej rzepakowy**", while "żelazo" ranks sensibly — inconsistent treatment of diacritics; threshold 0.38 + `ignoreLocation` is loose (`main.ts` 808–816).
- **Fix**: diacritic-insensitive normalisation on both index and query (e.g. strip/transliterate), lower threshold or require token matches for short queries, boost exact prefix matches.

### C5 [minor] — Pressing Ctrl+K while the overlay is open clears the typed query
- **Evidence**: with "infant" typed, Ctrl+K again → input value reset to "" (`openSearch()` unconditionally resets input+focus, `main.ts` 818–825).
- **Fix**: if already open, treat Ctrl+K as no-op (or toggle), and do not clear a non-empty query.

---

## D. Chart/table interaction

### D1 [major] — No hover sync between charts and the table (GOAL §5 requirement)
- **Location**: `main.ts` chart section & table section — only *click* handlers exist (`ch1.on("click")` line 368–376; row click 513–520). There are no `mouseover`/`axisPointer` link handlers in either direction; the only table highlighting is `tr.hl` for the row nearest to the entered weight (line 488).
- **Evidence**: GOAL §5.3/§5.4: "hover shows all values…" and "hover synced with charts (both directions)". Live behaviour: hovering chart rows does not highlight table rows and vice-versa; table rows highlight only via the nearest-weight outline. (Chart→calculator linking works partially: clicking a chart point or table row sets the weight — table path verified live, "4.5"; chart click is implemented in source but could not be exercised with synthetic events.)
- **Fix**: wire `ch.on('updateAxisPointer')`/series mouseover ↔ `tr` highlighting both ways, with an off state; keep click-to-set.

### D2 [major] — Chart-1 tooltip lacks ml-at-density and prints raw unrounded floats
- **Location**: `main.ts` line 350 `tooltip: { trigger: "axis" }` (no formatter); 8 series only.
- **Evidence**: live tooltip text: "11.50 | A | 902.5 | B | **960.2275197628458** | C | 683.1151349040001 | C− | … | D+ | 834.9184982160001". GOAL §5 requires hover to show "all values + ml at selected density" — the ml column is missing, and float noise makes values hard to read.
- **Fix**: custom tooltip formatter (rounded via `fmt`, unit-aware) + a row for ml/day at the currently selected density.

### D3 [minor] — Table sticky header offset leaves rows visible above the header
- **Location**: `styles.css` line 107 `thead th { position: sticky; top: 3.2rem; }` inside `#table-wrap` (`overflow:auto`, max-height 420 px).
- **Evidence**: after `#table-wrap.scrollTop = 260`, the header sits ~68 px below the container's top edge (css top 51.2 px); screenshot + visual check confirm data rows (3.75, 4.00…) scroll in the strip **above** the stuck header row. (Intended offset was presumably to clear the page header, but the page header is outside the scroll container.)
- **Fix**: `top: 0` for the in-container sticky header (optionally a 1 px border), and rely on the page-level sticky for the page header.

### D4 [minor] — Table/row interactions are mouse-only; no caption; chart canvas not keyboard-operable
- **Evidence**: `<tr>` has no `tabindex`/`role` (click handler only, line 513–520); no `<caption>` on the table; chart click-to-set-weight is pointer-only (equivalent input path exists via the calculator form and the row-click equivalent, so keyboard use is possible but the table row affordance is not keyboard-reachable). The CSV button and sort buttons are keyboard-accessible (verified `aria-sort` updates).
- **Fix**: make rows keyboard-activatable (`tabindex="0"` + Enter/Space, or a "use" button per row), add a caption; document the keyboard alternative for chart clicking.

---

## E. Mobile layout

### E1 [major] — Sticky header consumes ~25–40% of a phone viewport
- **Evidence** (CDP emulation): 390×844 → header height **203 px** (nav 122 px, 4 rows of links, no collapse); ~378 px wide → **261 px**. Screenshot + visual check: title + 4 nav rows + controls row, "crowded". GOAL §5 says mobile-first; a permanent 24–39% tax is a major usability issue on the primary device class.
- **Fix**: collapsible nav (details/summary or a menu button) that keeps only key items inline; reduce header stacking; consider non-sticky on short viewports.

### E2 [major] — Anchor navigation hides section headings under the sticky header
- **Location**: `styles.css` line 64 `section { scroll-margin-top: 4rem; }`.
- **Evidence** (live, both viewports): jumping to `#flags` → `h2` top = 64 px, header bottom = **103 px** (desktop 1280×720) and **203 px** (mobile 390×844) → heading hidden in both cases. Mobile screenshot after the jump shows the "Sygnały alarmowe" heading fully hidden and the intro paragraph cut mid-sentence ("…wagowe odnoszą się do siatek z-score…"). Every nav click and every search "go to" suffers this.
- **Fix**: set `scroll-margin-top` from the measured header height (or use `scroll-padding-top` on `html`), e.g. `--header-h` variable updated on resize; ≥7 rem desktop, and re-evaluate on mobile with the compact header.

### E3 [major] — Horizontal overflow on common phone widths (< ~380 px)
- **Locations/causes**: (a) unbreakable long DOI links in the sources list — widest anchor "doi:10.1097/mpg.0000000000001646" extends to x=**378** at 320 px viewport (no `overflow-wrap`); (b) `.grid2 { minmax(320px, 1fr) }` (`styles.css` line 82) + `main` padding forces a 320 px track in a 288 px content box → cards clipped 16 px and document scroll width 378.
- **Evidence**: CDP emulation — 320 px: `scrollWidth 378 > clientWidth 320`, card/form right edges at 336 px; **360 px: overflow (378>360)**; **375 px: overflow (378>375)**; 390 px: clean. 
- **Fix**: `overflow-wrap: anywhere` (or `word-break: break-word`) for `main a`/DOI text; `grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr))` or a smaller min (260 px); add `max-width:100%` guards; re-test at 320/360/375.

---

## F. Accessibility (WCAG 2.1 AA goal)

### F1 [major] — Dark mode: key chart series and the child marker are near-invisible
- **Location**: `main.ts` hardcoded series colours (lines 358–365, 400–409, 428–432, 411–412): C/`C±`/WHS lines `#7a1f3d`; D/`D±`, WHO lines `#1f5d7a`; 2025 quartiles `#1a7a6a`; ±2 SD `#b06a80`; maintenance fluid `#555`; child marker `#000000`; A/B use the ECharts default light-oriented palette. Only the *text* colour is theme-aware (`fgVar`).
- **Evidence**: contrast vs dark card `#1f2124`: C `#7a1f3d` **1.61:1**, D/WHO `#1f5d7a` **2.23:1**, fluid `#555` **2.16:1**, child marker `#000` **1.18:1** (±2 SD `#b06a80` 4.0:1; 2025 `#1a7a6a` 3.1:1). Visual inspection of dark-mode screenshots: "dark red/maroon line(s) … almost invisible", "black dot marker … very hard to see", legend swatches hard to match to lines. This is the calculator's core "same values in three places" claim failing at night.
- **Fix**: theme-aware palette — light variants for dark mode (≥3:1 vs card), halo/outline for the child marker (e.g. white ring), and re-run contrast checks for lines, legend swatches and axis text; re-draw charts on theme change (already re-drawn, but colours are static).

### F2 [major] — Focus indicator fails non-text contrast in dark mode
- **Location**: `styles.css` line 126 `:focus-visible { outline: 2px solid #1f5d7a; }` (same colour both themes).
- **Evidence**: `#1f5d7a` vs dark bg `#17181a` = **2.46:1**, vs dark card `#1f2124` = **2.23:1** — below the 3:1 required by WCAG 2.1 SC 1.4.11 (Non-text Contrast) for focus indicators; light mode is fine (6.91:1). The kill of `outline` anywhere else is fixed globally, so this hits every keyboard user in dark mode.
- **Fix**: theme-aware `--focus` colour (e.g. `--accent2` #8fc5da in dark ≈ 8.6:1 vs card).

### F3 [major] — ECharts auto-ARIA produces English, garbled, NaN-filled descriptions
- **Location**: `main.ts` `aria: { enabled: true }` on all three charts (lines 351, 393, 421).
- **Evidence**: the `#chart1` container gets an `aria-label` such as: *"This is a chart. It consists of 8 series count. The 0 series is a Line chart representing A.The first 10 items are: 2, 902.5, 2.5, 902.5, … The 1 series is a Line chart representing B.The first 10 items are: 2, **NaN**, 2.5, **NaN**, …"* — English-only (PL UI), broken grammar, raw floats, literal `NaN` entries (series B out of WHO range), thousands of characters, and attached to a plain `<div>` (no `role`, so exposure via AT is unreliable). The a11y report already flags "English-only" as open; the NaN/float/verbosity makes it worse than described.
- **Fix**: replace with a short localized `aria-label` (or `role="img"` + localized description) summarising the chart and pointing to the data-table fallback; keep the fallbacks as the accessible data path.

### F4 [minor] — Skip link does not move focus
- **Evidence**: activating `a.skip-link` leaves `document.activeElement` = `BODY`; `#main` has no `tabindex` (checked live).
- **Fix**: `#main tabindex="-1"` + focus it on skip-link activation (or native anchor focus where supported).

### F5 [minor] — `.hl-flash` highlight: theme-blind and motion-blind
- **Location**: `styles.css` 161–162 (`background: #ffe9a8` keyframe).
- **Evidence**: mid-animation in dark mode, the flashed element's computed background = `rgba(255,233,168,0.77)` while its text colour = `rgb(232,230,224)` → ≈**1.2:1** text contrast for ~1.8 s (unreadable flash). No `@media (prefers-reduced-motion: reduce)` rule exists (grep = 0 hits).
- **Fix**: theme-aware flash colour (light accent in dark mode) or animate `outline` instead of `background`; disable/soften under `prefers-reduced-motion`.

### F6 [minor] — Search dialog active-state is weak in dark mode
- **Evidence**: `#search-results li.active { background: var(--bg); outline: 1px solid var(--accent2); }` — in dark mode the result row bg `#17181a` on card `#1f2124` is a ~1.03:1 difference; visual check: "the active result is not clearly distinguishable". (Accessible label/selection feedback issue is covered in C3.)
- **Fix**: stronger active style (e.g. 2 px accent left bar + brighter bg token) in both themes.

### F7 [minor] — Landmark/control labels not localized; toggle state not exposed
- **Evidence** (live): `nav.main aria-label="sekcje"` remains Polish in EN mode; `#calc-form aria-label="calculator"` is English in PL mode; the theme toggle has only a name (no `aria-pressed`/state); `a11y.sort_hint` appears only as a `title` tooltip (not available to touch/keyboard users).
- **Fix**: localize both labels per language; expose theme state or phrase the label as an action ("tryb ciemny: włącz/wyłącz"); give sort buttons a visible/labelled affordance or `aria-label`.

---

## G. Housekeeping (minor)

### G1 [minor] — Dead strings and stale CSS
- **Evidence**: `content/base.json` keys never referenced by the UI: `placeholder`, `table.col_ml` ("ml/dzień (klikalna gęstość)" — the actual header is the hardcoded "ml @1"), `calc.band_low/central/high` (grep in `main.ts` = 0 hits). `styles.css` retains `#search-results li[aria-disabled="true"]` and `th[role="button"]` (the role was removed in D-014).
- **Fix**: remove or wire up; keep content keys and UI in sync (the "klikalna gęstość" string is also the only place a plural/typo check would have caught rotation).

### G2 [minor] — Listener accumulation on language switch
- **Evidence**: `renderAll()` adds a new `window.addEventListener("resize", …)` on every call (`main.ts` line 912), including each PL/EN toggle; old handlers keep resizing charts that get disposed/re-created.
- **Fix**: attach the resize handler once at boot.

---

## Coverage note

**Inspected**: all of `content/*.json` (base, flags, reasons, rules, products — every PL and EN string read; missing-field scan = 0 gaps in those five files), `src/ui/main.ts` (all 917 lines), `src/ui/styles.css` (all 170 lines), `src/calc/methods.ts` notes/warnings, `src/data/products_foods.json` + `sources.json` (spot + systematic checks), `dist/` served on `localhost:8793` in Chromium.

**Checks performed on the live build** (PL and EN): axe-core WCAG 2.0/2.1 A+AA runs (light 0/0/31, dark 0/0, dialog-open 0 violations/1 incomplete — consistent with `research/qa/a11y-report.md`); keyboard walkthrough (tab order, skip link, dialog Tab/Arrow/Enter/Esc); 15+ search queries in both languages incl. edge cases (1 char, no results, diacritic-less, tag names, section names); section-8 filter searches (żelazo/Fe/mleko/masło/high-energy); table sort/row-click/sticky-scroll measurements; chart tooltip interception; contrast computation (WCAG formula) for focus ring, chart colours, muted text, banners; CDP device emulation 320/360/375/390 px (overflow, header height, anchor-jump geometry); dark-mode toggle + persistence (`localStorage: whs-theme` only); privacy sanity check (`performance.getEntriesByType('resource')` → only `localhost:8793`; no runtime external requests); screenshots + visual inspection for dark charts, search overlay, mobile header and anchor jumps.

**Not covered / limitations**: no real screen reader (NVDA/VoiceOver) was available — screen-reader behaviour is inferred from ARIA/DOM state; only Chromium was tested (Firefox/Safari number-input comma handling and `:focus-visible` behaviour unverified — flagged as plausible, not confirmed); chart click-to-set-weight could not be exercised via synthetic events (reviewed in source only; the table-click equivalent was verified); reduced-motion behaviour assessed by CSS inspection only; axe cannot detect several issues above (focus trap, off-screen selection, contrast-in-canvas) — findings F1/F3/F5/F6/C3 were verified by DOM measurement and visual inspection. One environment artifact (a "🐴" prefix appearing in the tab title during automated sessions) was ruled out as browser-harness instrumentation: neither `dist/index.html` nor the shipped bundle contains that character (raw fetch + grep both clean).

**Positives worth keeping**: privacy rules hold (zero runtime external requests, `localStorage` limited to the theme preference); data-table fallbacks exist under all three charts and are localized; print stylesheet behaves; axe passes in all three states; PL content is otherwise dense and largely well-sourced; `aria-sort` + sort buttons work by keyboard; skip-link, `:focus-visible`, and `aria-live` additions from D-014 are present.
