# DESIGN-SYSTEM.md — WHS Growth & Feeding Explorer

Liquid-glass design system (2026-10-05). Applied site-wide in `src/ui/styles.css`; the palette was
supplied by the user. Everything is static CSS — no external requests, no web fonts, no frameworks.

## 1. Color palette (user-supplied)

| token | hex | hsl | role |
|---|---|---|---|
| `--pal-lake` (frozen-lake) | `#97dffc` | hsl(197 94% 79%) | light accent / dark link & focus color |
| `--pal-periwinkle` (soft-periwinkle) | `#858ae3` | hsl(237 63% 71%) | dark primary button, selected states, zebra tint |
| `--pal-violet` (violet-twilight) | `#613dc1` | hsl(256 52% 50%) | light primary button, section rules, borders |
| `--pal-indigo` (indigo) | `#4e148c` | hsl(269 75% 31%) | light link/focus color, button gradient end |
| `--pal-amethyst` (dark-amethyst) | `#2c0735` | hsl(288 77% 12%) | light text color, dark surfaces, overlays |

Derived theme tokens (see the top of `styles.css`): `--fg`, `--muted`, `--bg`, `--glass`,
`--glass-strong`, `--glass-line`, `--glass-hi`, `--accent`, `--accent2`, `--btn-grad`,
`--btn-text`, `--warn-*`, `--crit-*`, shadows, `--bg-image`.

### Theme mapping

| | light | dark |
|---|---|---|
| text | `#2c0735` on `#f4f5ff` (16.3:1) | `#f1edf7` on `#1b0426` (16.7:1) |
| muted | `#5b5570` (≥6.5:1) | `#b9aed2` (≥8.7:1) |
| links / focus | indigo `#4e148c` (≥10:1) | frozen-lake `#97dffc` (≥12:1) |
| primary button | white on violet→indigo gradient (≥7.1:1) | amethyst text on periwinkle gradient (≥5.7:1) |
| glass card | `rgba(255,255,255,.72)` over wash | `rgba(44,7,53,.62)` over wash |

Contrast ratios computed per WCAG 2.x (relative luminance) on the effective composited surfaces;
the axe-core runs in `research/qa/a11y-report.md` stay at **0 violations** (light / dark / dialog).

## 2. Glass recipe

```
surface  = translucent color (var(--glass) or var(--glass-strong)) over the palette wash
blur     = backdrop-filter: blur(16px) saturate(150%)   (header 18px, tooltip/dialog 14px)
border   = 1px solid var(--glass-line)                  (violet / lake tint at ~20% alpha)
shadow   = var(--shadow-card) + inset 0 1px 0 var(--glass-hi)   (inner top highlight)
radius   = 16px cards, 14px banners, 10-12px controls
```

The colorful wash (three palette radial-gradients) lives in a fixed `body::before` back layer with
`z-index: -1`, while `html` keeps a solid `--bg`. This keeps the glass effect visually the same and
keeps the background *computable* for contrast tooling (axe resolves the solid html background
instead of bailing out on a gradient).

## 3. Components

- **Cards** — `.card`: glass, 16px radius, reader measure capped at 78ch for text.
- **Banners** — `.banner` (+ `.warn` / `.crit`): glass with state-colored border; warn/crit keep
  their amber/red semantics (validated text pairs 10.7:1 / 9.8:1 dark).
- **Header** — sticky glass bar (18px blur), border hairline; on ≤640px the nav collapses into a
  glass hamburger sheet that also hosts the theme + PL/EN toggles.
- **Buttons** — `button.primary`: violet gradient, soft shadow; `.hdr-btn` / `.lang-toggle button`:
  small glass pills; pressed state uses `--accent` + `--btn-text`.
- **Inputs** — translucent (`--glass-strong`), 10px radius, accent focus ring (3px).
- **Tables** — sticky glass header inside scroll containers, periwinkle zebra rows (7% alpha),
  hover/focus row states, sortable headers.
- **Badges** — glass pills. Grade badges A–D keep **evidence colors** (green/blue/amber/purple,
  dark-mode shades for AA) — they are semantic, not brand, colors.
- **Tooltips** — instant CSS-only (`[data-tip]::after{content:attr(data-tip)}`), glass background
  at 88% opacity, `cursor: help` on non-interactive triggers; `.tip-below` variant for table headers.
- **Dialog** — search overlay: amethyst veil + blur, glass panel.

## 4. Chart series palette

Charts use a theme-aware series palette (`PAL` in `src/ui/main.ts`) harmonized with the design
tokens; series B („healthy same weight”) **stays the yellow line** (`#b0790f` light / `#f0c674`
dark — both ≥3:1 against their card surfaces, i.e. WCAG non-text contrast).

## 5. Rules

1. Derive component colors from the tokens; don't hard-code hexes in components (exceptions:
   grade badges, chart series — documented above).
2. Every text pair must reach 4.5:1 and every meaningful graphic 3:1 on both themes; run the axe
   procedure from `research/qa/a11y-report.md` after UI changes.
3. Glass never replaces focus affordances: `:focus-visible` = 3px `--accent2` ring.
4. Motion is limited to hover transitions ≤150 ms; `prefers-reduced-motion` disables the flash
   highlight.
5. Print stylesheet collapses the glass: white surfaces, no blur, wash hidden (see `@media print`).
6. No runtime external requests — system font stack only.
