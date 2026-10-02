#!/usr/bin/env python3
"""Annotated zoom crops for calibration verification.

Draws colored horizontal rulers at exact pixel positions for chosen values,
so a visual check can confirm which value the curve starts at.
"""
import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[1]
FIGS = ROOT / "research" / "raw" / "figs"

RULERS = {
    # value: color
    41: (255, 0, 0), 42: (0, 160, 0), 43: (0, 0, 255), 44: (255, 140, 0),
    45: (160, 0, 200), 46: (0, 160, 160), 47: (120, 60, 0),
}


def py_for(val, yt, yb, ymin, ymax):
    return yb - (val - ymin) / (ymax - ymin) * (yb - yt)


def make(fig, xl, xr, yt, yb, ymin, ymax, crop, scale, vals, out):
    im = Image.open(FIGS / fig).convert("RGB")
    im = im.crop(crop).resize(((crop[2] - crop[0]) * scale, (crop[3] - crop[1]) * scale), Image.NEAREST)
    dr = ImageDraw.Draw(im)
    for v in vals:
        py = (py_for(v, yt, yb, ymin, ymax) - crop[1]) * scale
        dr.line([(0, py), (im.width, py)], fill=RULERS[v], width=2)
    im.save(FIGS / out)
    print(out, im.size, "vals:", vals)


# fig2 height girls: dense 1cm rulers 41..46 over left region
make("antonius_fig2.jpg", 47, 442, 81, 615, 30, 105, (40, 380, 170, 640), 3,
     [41, 42, 43, 44, 45, 46], "annot_fig2_left.png")
# fig5 weight boys: rulers 1.6..2.6 step 0.2
make("antonius_fig5.jpg", 41, 447, 78, 626, 0, 12, (34, 380, 170, 640), 3,
     [], "annot_fig5_left.png")
# weight rulers need custom values; redo with explicit list
im = Image.open(FIGS / "antonius_fig5.jpg").convert("RGB")
crop = (34, 380, 170, 640)
im = im.crop(crop).resize(((crop[2] - crop[0]) * 3, (crop[3] - crop[1]) * 3), Image.NEAREST)
dr = ImageDraw.Draw(im)
cols = {1.6: (255, 0, 0), 1.8: (0, 160, 0), 2.0: (0, 0, 255), 2.2: (255, 140, 0),
        2.4: (160, 0, 200), 2.6: (0, 160, 160), 2.8: (120, 60, 0)}
for v, c in cols.items():
    py = (py_for(v, 78, 626, 0, 12) - crop[1]) * 3
    dr.line([(0, py), (im.width, py)], fill=c, width=2)
im.save(FIGS / "annot_fig5_left.png")
print("annot_fig5_left.png", im.size, "cols:", list(cols))
