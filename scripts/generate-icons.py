"""Generate square PWA / favicon icons from public/dobicon.png.

Source is a landscape 1536x1024 render of the cube on black. We crop to
the cube, then center it on a square black canvas at every size browsers
and install prompts expect.
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "dobicon.png"
OUT = ROOT / "public" / "icons"
BG = (0, 0, 0, 255)


def content_bbox(img: Image.Image, black_thresh: int = 18, step: int = 2):
    px = img.load()
    w, h = img.size
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            if r < black_thresh and g < black_thresh and b < black_thresh:
                continue
            found = True
            if x < minx:
                minx = x
            if y < miny:
                miny = y
            if x > maxx:
                maxx = x
            if y > maxy:
                maxy = y
    if not found:
        return (0, 0, w, h)
    pad = 8
    return (
        max(0, minx - pad),
        max(0, miny - pad),
        min(w, maxx + 1 + pad),
        min(h, maxy + 1 + pad),
    )


def make_icon(crop: Image.Image, size: int, safe_ratio: float, dest: Path) -> None:
    canvas = Image.new("RGBA", (size, size), BG)
    inner = max(1, int(size * (1 - 2 * safe_ratio)))
    cw, ch = crop.size
    scale = min(inner / cw, inner / ch)
    nw = max(1, int(cw * scale))
    nh = max(1, int(ch * scale))
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "PNG", optimize=True)
    print(f"wrote {dest.relative_to(ROOT)} ({size}x{size})")


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    print(f"source {src.size} {src.mode}")
    box = content_bbox(src)
    print(f"bbox {box}")
    crop = src.crop(box)
    print(f"crop {crop.size}")

    OUT.mkdir(parents=True, exist_ok=True)

    for s in (32, 48, 64, 96, 128, 180, 192, 256, 512):
        make_icon(crop, s, 0.06, OUT / f"icon-{s}.png")

    make_icon(crop, 192, 0.18, OUT / "maskable-192.png")
    make_icon(crop, 512, 0.18, OUT / "maskable-512.png")

    # Convenience copies at public root
    Image.open(OUT / "icon-32.png").save(ROOT / "public" / "favicon.ico", format="ICO", sizes=[(32, 32)])
    Image.open(OUT / "icon-180.png").save(ROOT / "public" / "apple-touch-icon.png")
    Image.open(OUT / "icon-192.png").save(ROOT / "public" / "icon-192.png")
    Image.open(OUT / "icon-512.png").save(ROOT / "public" / "icon-512.png")
    print("done")


if __name__ == "__main__":
    main()
