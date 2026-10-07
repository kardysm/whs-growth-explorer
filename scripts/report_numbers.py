#!/usr/bin/env python3
"""Regenerate REPORT.md numeric cells after the H1/M1 model fixes (reads the new grid.json)."""
import json

g = json.load(open('src/data/grid.json'))
rows = g['rows']

def spread_at(sex, age):
    vals = []
    for r in rows:
        if r['sex'] == sex and r['age'] == age:
            trio = [r[k] for k in ('A', 'C', 'D') if r[k] is not None]
            if len(trio) == 3 and min(trio) > 0:
                vals.append(100 * (max(trio) - min(trio)) / min(trio))
    return (min(vals), max(vals)) if vals else (None, None)

print('== uncertainty row 1: spread (max-min)/min over A/C/D, weights 2-20 kg ==')
for sex in ('boys', 'girls'):
    for age in (6, 18, 36):
        lo, hi = spread_at(sex, age)
        print(f'  {sex} {age} mo: {lo:.1f}-{hi:.1f}%')

print()
print('== method-spread detail (boys; A/C/D kcal/day) ==')
for age in (6, 18, 36):
    cells = []
    for w in (5, 8, 12):
        r = next(r for r in rows if r['sex'] == 'boys' and r['age'] == age and r['w'] == w)
        cells.append(f"{r['A']:.0f} / {r['C']:.0f} / {r['D']:.0f}")
    print(f'  {age} mo: ' + ' | '.join(cells))

print()
print('== same rows for girls ==')
for age in (6, 18, 36):
    cells = []
    for w in (5, 8, 12):
        r = next(r for r in rows if r['sex'] == 'girls' and r['age'] == age and r['w'] == w)
        cells.append(f"{r['A']:.0f} / {r['C']:.0f} / {r['D']:.0f}")
    print(f'  {age} mo: ' + ' | '.join(cells))

# max spread overall (for the PL summary "maks. ~X% przy 2 kg")
allv = []
for sex in ('boys', 'girls'):
    for age in range(0, 49):
        lo, hi = spread_at(sex, age)
        if hi is not None:
            allv.append((hi, sex, age))
allv.sort(reverse=True)
print()
print('== largest spreads overall (top 5) ==')
for hi, sex, age in allv[:5]:
    print(f'  {hi:.1f}% ({sex}, {age} mo)')
