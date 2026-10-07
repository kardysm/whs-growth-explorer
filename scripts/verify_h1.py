#!/usr/bin/env python3
"""Card 1 verification: C before/after the H1 fix + worst adjacent step across the grid."""
import csv, json, math

DATA = 'research/data'
# WHO LMS
def load(sex, kind):
    return json.load(open(f'{DATA}/who_lms/{kind}_{sex}.json'))
def lms(t, anchor):
    cols = [c.strip() for c in t['columns']]; rows = t['rows']
    if anchor < rows[0][0] or anchor > rows[-1][0]: return None
    lo, hi = 0, len(rows)-1
    while hi-lo > 1:
        mid = (lo+hi)//2
        if rows[mid][0] <= anchor: lo = mid
        else: hi = mid
    r0, r1 = rows[lo], rows[hi]; a0, a1 = r0[0], r1[0]
    tt = 0 if a1 == a0 else (anchor-a0)/(a1-a0)
    return [r0[cols.index(k)]+(r1[cols.index(k)]-r0[cols.index(k)])*tt for k in ('L','M','S')]
def median(t, a):
    l = lms(t, a); return None if l is None else l[1]
def age_for_weight(t, w):
    iM = [c.strip() for c in t['columns']].index('M')
    rows = t['rows']
    if w < rows[0][iM] or w > rows[-1][iM]: return None
    for i in range(len(rows)-1):
        a0, a1 = rows[i][0], rows[i+1][0]
        m0, m1 = rows[i][iM], rows[i+1][iM]
        if (w >= m0 and w <= m1) or (w <= m0 and w >= m1):
            return a0 if m1 == m0 else a0 + (w-m0)/(m1-m0)*(a1-a0)
    return None
WHO = {k: json.load(open(f'{DATA}/who_lms/{k}.json')) for k in ['wfa_boys','wfa_girls']}

# WHS means
mw, ml = {}, {}
for row in csv.DictReader(open(DATA+'/whs_growth/antonius_digitized.csv')):
    if row['line'] == 'mean' and row['value']:
        key = (row['sex'], int(row['age_months']))
        (mw if row['measure'] == 'weight' else ml)[key] = float(row['value'])
def whs_mean_l(sex, age):
    pts = sorted((a, v) for (s, a), v in ml.items() if s == sex)
    if age < pts[0][0] or age > pts[-1][0]: return None
    for i in range(len(pts)-1):
        a0, v0 = pts[i]; a1, v1 = pts[i+1]
        if a0 <= age <= a1:
            return v0 if a1 == a0 else v0+(v1-v0)*(age-a0)/(a1-a0)
    return None

def bmr(sex, m, w, h, new=True):
    H = h/100
    if new:
        wa = age_for_weight(WHO[f'wfa_{sex}'], w)
        if wa is None:
            m36 = median(WHO[f'wfa_{sex}'], 36)
            if m36 is not None: wa = 36 if w >= m36 else 0
        use_wh = (m >= 36) if wa is None else (wa >= 36)
    else:
        use_wh = m >= 36
    if not use_wh:
        return (59.48*w-30.33) if sex == 'boys' else (58.29*w-31.05)
    return (19.6*w+130.3*H+414.9) if sex == 'boys' else (16.97*w+161.8*H+371.2)

def C(sex, m, w, new=True, h=None):
    if h is None: h = whs_mean_l(sex, min(m, 48))
    return bmr(sex, m, w, h, new) * 0.9 * 1.2  # hypotonic x dependent (grid defaults)

# 1) before/after at the 36-month boundary for WHS-mean children
print('== WHS-mean child at the 36-month boundary (grid defaults tone 0.9 x act 1.2) ==')
for sex in ('boys','girls'):
    w36, l36 = mw[(sex,36)], ml[(sex,36)]
    cb = C(sex, 35.99, w36, new=False, h=l36); ca = C(sex, 36.0, w36, new=False, h=l36)
    print(f'  {sex}: OLD C(35.99)={cb:.1f} -> C(36.0)={ca:.1f}  step {100*(ca-cb)/cb:+.1f}%')
    n36 = C(sex, 36.0, w36, new=True, h=l36); n48 = C(sex, 48.0, mw[(sex,48)], new=True, h=ml[(sex,48)])
    print(f'         NEW C(36)={n36:.1f} ({n36/w36:.1f} kcal/kg)  C(48)={n48:.1f} ({n48/mw[(sex,48)]:.1f} kcal/kg)')
    for w in (5.0, 8.0):
        cb5 = C(sex, 35.99, w, new=False, h=l36); ca5 = C(sex, 36.0, w, new=False, h=l36)
        n5 = C(sex, 36.0, w, new=True, h=l36)
        print(f'         {w} kg: OLD {cb5:.1f}->{ca5:.1f} ({ca5/cb5:.2f}x)  NEW {n5:.1f}')

# 2) worst adjacent step over the grid (step 0.25 kg, default WHS length)
print()
print('== max adjacent C step over grid rows (0-48 mo, 2-20 kg, step 0.25, WHS default length) ==')
worst = (0, None)
for sex in ('boys','girls'):
    for m in range(0, 49):
        prev = None
        w = 2.0
        while w <= 20.0001:
            c = C(sex, m, round(w*100)/100, new=True)
            if prev is not None:
                rel = abs(c-prev[1])/prev[1]
                if rel > worst[0]: worst = (rel, (sex, m, prev[0], round(w*100)/100))
            prev = (round(w*100)/100, c)
            w += 0.25
print(f'  worst step: {100*worst[0]:.2f}% at {worst[1]}')

# where does it happen (weight-age)?
sex, m, w0, w1 = worst[1]
print('  weight-age at the step:', age_for_weight(WHO[f'wfa_{sex}'], w1))
# and for comparison: OLD worst over the same grid
worst_old = (0, None)
for sex in ('boys','girls'):
    for m in range(0, 49):
        prev = None
        w = 2.0
        while w <= 20.0001:
            c = C(sex, m, round(w*100)/100, new=False)
            if prev is not None:
                rel = abs(c-prev[1])/prev[1]
                if rel > worst_old[0]: worst_old = (rel, (sex, m, prev[0], round(w*100)/100))
            prev = (round(w*100)/100, c)
            w += 0.25
print(f'  OLD logic worst step over the same grid: {100*worst_old[0]:.2f}% at {worst_old[1]}')
