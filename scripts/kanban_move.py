#!/usr/bin/env python3
"""Move kanban card titles to Done chips: usage: python scripts/kanban_move.py "<h3 substring>" "<done chip text>"
Removes the <article class="card"> whose <h3> contains the substring; inserts a Done chip; fixes counts."""
import pathlib, re, sys

p = pathlib.Path('UX-KANBAN.html')
s = p.read_text(encoding='utf-8')
needle, chip = sys.argv[1], sys.argv[2]

# find the article containing the needle
m = None
for mm in re.finditer(r'<article class="card">(.*?)</article>', s, re.S):
    if needle in mm.group(1):
        m = mm
        break
assert m, f'article with {needle!r} not found'
s = s[:m.start()] + s[m.end():]
# collapse leftover blank lines around the removal
s = re.sub(r'\n{3,}', '\n\n', s)

# Next up count
def bump(header, delta):
    global s
    mm = re.search(r'(<h2>' + header + r' <span class="count">)(\d+)(</span>)', s)
    assert mm, header
    s = s[:mm.start(2)] + str(int(mm.group(2)) + delta) + s[mm.end(2):]
bump('Next up', -1)

# Done chip
mm = re.search(r'(<h2>Done \(recent context\) <span class="count">)(\d+)(</span></h2>\s*<div class="chips">\n)', s)
assert mm
s = s[:mm.start(2)] + str(int(mm.group(2)) + 1) + s[mm.end(2):]
needle2 = '<div class="chips">\n'
i = s.find(needle2, s.find('Done (recent context)'))
j = i + len(needle2)
s = s[:j] + f'      <span class="pill ok">{chip}</span>\n' + s[j:]

p.write_text(s, encoding='utf-8')
print('moved to done:', chip)
