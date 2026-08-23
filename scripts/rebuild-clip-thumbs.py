#!/usr/bin/env python3
"""Rebuild Explore posters: face + white line chart, no headline, each one distinct."""

from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path("/workspace")
OUT = ROOT / "public" / "demo" / "clips"
WORK = Path("/tmp/stoa-thumbs")
STOCK = Path("/tmp/stoa-stock")

PAPER = (244, 239, 230, 255)
INK = (28, 25, 23, 255)
VERDIGRIS = (63, 111, 100, 255)
RUST = (140, 74, 58, 255)
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

CLIPS = [
    # layout: how the chart sits, so posters do not look like one template.
    {"id": "01", "ticker": "NVDA", "side": "LONG", "chg": "+18.4%", "up": True, "src": "46352.mp4", "at": 8.4, "layout": "low", "zoom": 1.06},
    {"id": "02", "ticker": "AAPL", "side": "LONG", "chg": "+9.2%", "up": True, "src": "42323.mp4", "at": 5.1, "layout": "tight", "zoom": 1.18},
    {"id": "03", "ticker": "MSFT", "side": "LONG", "chg": "+12.1%", "up": True, "src": "41290.mp4", "at": 1.6, "layout": "grid", "zoom": 1.08},
    {"id": "04", "ticker": "AMZN", "side": "LONG", "chg": "+14.8%", "up": True, "src": "2955.mp4", "at": 4.4, "layout": "side", "zoom": 1.05},
    {"id": "05", "ticker": "META", "side": "LONG", "chg": "+11.6%", "up": True, "src": "41272.mp4", "at": 6.2, "layout": "thin", "zoom": 1.22},
    {"id": "06", "ticker": "TSLA", "side": "SHORT", "chg": "-8.7%", "up": False, "src": "2960.mp4", "at": 2.8, "layout": "big", "zoom": 1.12},
    {"id": "07", "ticker": "GOOGL", "side": "LONG", "chg": "+7.4%", "up": True, "src": "52184.mp4", "at": 7.0, "layout": "mid", "zoom": 1.0},
    {"id": "08", "ticker": "AVGO", "side": "LONG", "chg": "+16.3%", "up": True, "src": "4834.mp4", "at": 3.8, "layout": "fill", "zoom": 1.15},
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def walk(seed: str, n: int, up: bool) -> list[float]:
    h = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)
    v = 36 + (h % 40)
    drift = 0.045 if up else -0.04
    out = []
    for i in range(n):
        h = (h * 1103515245 + 12345 + i * 97) & 0x7FFFFFFF
        # Each ticker gets a different shape so the lines are not copies.
        bump = 8 * (1 if up else -1) * (i / n) ** (1.4 if seed[0] in "NM" else 0.8)
        noise = ((h % 900) - 450) / (90 if i % 3 else 55)
        v = max(8, min(92, v + drift * 12 + noise + bump * 0.15))
        out.append(v)
    return out


def grab(src: Path, dest: Path, at: float, zoom: float, *, key_green: bool = False) -> None:
    z = max(1.0, zoom)
    crop = (
        f"scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,"
        f"scale=iw*{z}:ih*{z},crop=720:1280,setsar=1"
    )
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
    if key_green:
        cmd += [
            "-f", "lavfi", "-i", "color=c=0x1C1917:s=720x1280:d=1",
            "-ss", f"{at:.2f}", "-i", str(src),
            "-filter_complex",
            f"[1:v]{crop},colorkey=0x00FF00:0.3:0.2,format=yuva420p[fg];[0:v][fg]overlay=0:0",
        ]
    else:
        cmd += ["-ss", f"{at:.2f}", "-i", str(src), "-vf", crop]
    cmd += ["-frames:v", "1", str(dest)]
    subprocess.run(cmd, check=True)


def line_chart(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], ys: list[float], *, grid: bool) -> None:
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    if grid:
        for i in range(1, 4):
            y = y0 + int(h * i / 4)
            draw.line([(x0, y), (x1, y)], fill=(244, 239, 230, 40), width=1)
        for i in range(1, 6):
            x = x0 + int(w * i / 6)
            draw.line([(x, y0), (x, y1)], fill=(244, 239, 230, 28), width=1)
    lo, hi = min(ys), max(ys)
    span = (hi - lo) or 1
    pts = []
    for i, v in enumerate(ys):
        x = x0 + int(i * (w - 1) / (len(ys) - 1))
        y = y1 - int((v - lo) / span * (h - 8)) - 4
        pts.append((x, y))
    draw.line(pts, fill=PAPER, width=3, joint="curve")
    # End dot so it reads as a live series, not a decoration.
    ex, ey = pts[-1]
    draw.ellipse((ex - 5, ey - 5, ex + 5, ey + 5), fill=PAPER)


def chips(draw: ImageDraw.ImageDraw, clip: dict, y: int = 28) -> None:
    draw.rounded_rectangle((24, y, 168, y + 56), radius=8, fill=(28, 25, 23, 210))
    draw.text((38, y + 14), clip["ticker"], font=font(MONO, 26), fill=PAPER)
    side = VERDIGRIS if clip["up"] else RUST
    draw.rounded_rectangle((176, y, 300, y + 56), radius=8, fill=side)
    draw.text((190, y + 16), clip["side"], font=font(SANS, 20), fill=PAPER)


def compose(clip: dict, face: Path, dest: Path) -> None:
    W, H = 720, 1280
    base = Image.open(face).convert("RGB")
    base = ImageEnhance.Contrast(base).enhance(1.05)
    base = ImageEnhance.Color(base).enhance(0.9)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    layout = clip["layout"]
    ys = walk(clip["ticker"] + clip["layout"], 28 if layout != "thin" else 40, clip["up"])

    if layout == "low":
        for y in range(H - 360, H):
            t = (y - (H - 360)) / 360
            d.line([(0, y), (W, y)], fill=(28, 25, 23, int(200 * t)))
        chips(d, clip)
        line_chart(d, (32, 920, 688, 1220), ys, grid=False)
    elif layout == "tight":
        for y in range(H - 280, H):
            t = (y - (H - 280)) / 280
            d.line([(0, y), (W, y)], fill=(28, 25, 23, int(220 * t)))
        chips(d, clip, 36)
        line_chart(d, (40, 1020, 680, 1230), ys, grid=False)
    elif layout == "grid":
        for y in range(H - 420, H):
            t = (y - (H - 420)) / 420
            d.line([(0, y), (W, y)], fill=(28, 25, 23, int(210 * t)))
        chips(d, clip)
        line_chart(d, (28, 860, 692, 1236), ys, grid=True)
    elif layout == "side":
        for x in range(W - 280, W):
            t = (x - (W - 280)) / 280
            d.line([(x, 0), (x, H)], fill=(28, 25, 23, int(160 * t)))
        chips(d, clip)
        line_chart(d, (430, 200, 700, 1080), ys, grid=False)
    elif layout == "thin":
        for y in range(H - 200, H):
            t = (y - (H - 200)) / 200
            d.line([(0, y), (W, y)], fill=(28, 25, 23, int(190 * t)))
        chips(d, clip)
        line_chart(d, (24, 1100, 696, 1248), ys, grid=False)
    elif layout == "big":
        for y in range(H - 520, H):
            t = (y - (H - 520)) / 520
            d.line([(0, y), (W, y)], fill=(28, 25, 23, int(215 * t)))
        chips(d, clip)
        line_chart(d, (24, 780, 696, 1240), ys, grid=True)
    elif layout == "mid":
        for y in range(640, 980):
            t = (y - 640) / 340
            d.line([(0, y), (W, y)], fill=(28, 25, 23, int(90 + 80 * t)))
        chips(d, clip)
        line_chart(d, (36, 680, 684, 960), ys, grid=False)
    else:  # fill: chart sits on a plate, face still reads above it
        for y in range(H - 400, H):
            t = (y - (H - 400)) / 400
            d.line([(0, y), (W, y)], fill=(28, 25, 23, min(230, int(230 * t))))
        chips(d, clip, 40)
        line_chart(d, (20, 900, 700, 1250), ys, grid=True)

    out = Image.alpha_composite(base.convert("RGBA"), overlay)
    out.convert("RGB").save(dest, quality=90)
    print(f"  thumb {clip['id']} {clip['ticker']} {layout} {dest.stat().st_size // 1024} KB")


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for clip in CLIPS:
        src = STOCK / clip["src"]
        if not src.exists():
            raise SystemExit(f"missing {src}")
        frame = WORK / f"face-{clip['id']}.jpg"
        grab(src, frame, clip["at"], clip["zoom"])
        compose(clip, frame, OUT / f"clip-{clip['id']}.jpg")


if __name__ == "__main__":
    main()
