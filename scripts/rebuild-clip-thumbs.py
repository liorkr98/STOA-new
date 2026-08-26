#!/usr/bin/env python3
"""Rebuild demo clip posters and burn a matching HUD onto the existing mp4s.

Crops a face window from above the old burned-in card (and below the old
ticker chips), scales it into the top of the frame, then draws an opaque
paper lower-third. Hebrew is shaped RTL via libraqm. Noto Sans Hebrew has no
period glyph, so Hebrew copy never uses ASCII punctuation.
"""

from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, features

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "demo" / "clips"
WORK = Path("/tmp/stoa-thumbs-v3")

W, H = 720, 1280
FACE_H = 864
WASH_Y = 820
CARD_Y = 844

PAPER = (250, 247, 241, 255)
INK = (20, 23, 31, 255)
MUTE = (20, 23, 31, 140)
VERDIGRIS = (47, 110, 93, 255)
RUST = (166, 72, 60, 255)
BAND_UP = (214, 228, 222, 255)
GRID = (20, 23, 31, 28)
HAIRLINE = (20, 23, 31, 36)

SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
SANS_R = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
HEB = "/usr/share/fonts/truetype/noto/NotoSansHebrew-Bold.ttf"
HEB_R = "/usr/share/fonts/truetype/noto/NotoSansHebrew-Regular.ttf"

HAS_RAQM = bool(features.check("raqm"))

# face = (src_y, src_h): starts below the stock ticker chips so they cannot ghost.
CLIPS = [
    {"id": "01", "ticker": "NVDA", "name": "NVIDIA", "side": "LONG", "chg": "+18.4%", "price": "128.40", "up": True, "style": "area", "face": (78, 600)},
    {"id": "02", "ticker": "AAPL", "name": "Apple", "side": "LONG", "chg": "+9.2%", "price": "214.80", "up": True, "style": "quote", "face": (78, 310)},
    {"id": "03", "ticker": "MSFT", "name": "Microsoft", "side": "LONG", "chg": "+12.1%", "price": "428.10", "up": True, "style": "bars", "face": (78, 300)},
    {"id": "04", "ticker": "AMZN", "name": "Amazon", "side": "LONG", "chg": "+14.8%", "price": "186.20", "up": True, "style": "he_quote", "he": ["המרווח של הענן", "חוזר"], "face": (78, 310)},
    {"id": "05", "ticker": "META", "name": "Meta", "side": "LONG", "chg": "+11.6%", "price": "512.90", "up": True, "style": "pnl", "face": (78, 400)},
    {"id": "06", "ticker": "TSLA", "name": "Tesla", "side": "SHORT", "chg": "-8.7%", "price": "178.40", "up": False, "style": "candles", "face": (110, 580)},
    {"id": "07", "ticker": "GOOGL", "name": "Alphabet", "side": "LONG", "chg": "+7.4%", "price": "172.60", "up": True, "style": "he_bars", "he": ["הענן עולה", "החיפוש מחזיק"], "face": (78, 300)},
    {"id": "08", "ticker": "AVGO", "name": "Broadcom", "side": "LONG", "chg": "+16.3%", "price": "174.20", "up": True, "style": "ticket", "face": (78, 320)},
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def walk(seed: str, n: int, up: bool) -> list[float]:
    h = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)
    v = 42.0 + (h % 18)
    drift = 0.9 if up else -0.85
    out: list[float] = []
    for i in range(n):
        h = (h * 1664525 + 1013904223 + i * 17) & 0xFFFFFFFF
        v = max(18.0, min(86.0, v + drift + (((h % 500) - 250) / 140)))
        out.append(v)
    return out


def ohlc(seed: str, n: int, up: bool) -> list[tuple[float, float, float, float]]:
    ys = walk(seed, n + 1, up)
    rows = []
    for i in range(n):
        o, c = ys[i], ys[i + 1]
        rows.append((o, max(o, c) + 1.6, min(o, c) - 1.2, c))
    return rows


def round_box(d: ImageDraw.ImageDraw, box, fill, r=12) -> None:
    d.rounded_rectangle(box, radius=r, fill=fill)


def pts(box, ys):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    lo, hi = min(ys), max(ys)
    span = (hi - lo) or 1
    out = []
    for i, v in enumerate(ys):
        x = x0 + int(i * (w - 1) / (len(ys) - 1))
        y = y1 - int((v - lo) / span * (h - 10)) - 5
        out.append((x, y))
    return out


def paint_line(d, box, ys, color, width=3, band=None, grid=False):
    x0, y0, x1, y1 = box
    if grid:
        for i in range(1, 3):
            y = y0 + int((y1 - y0) * i / 3)
            d.line([(x0, y), (x1, y)], fill=GRID, width=1)
    p = pts(box, ys)
    if band:
        d.polygon([(p[0][0], y1)] + p + [(p[-1][0], y1)], fill=band)
    d.line(p, fill=color, width=width, joint="curve")
    ex, ey = p[-1]
    d.ellipse((ex - 4, ey - 4, ex + 4, ey + 4), fill=color)


def paint_candles(d, box, rows):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    lo = min(r[2] for r in rows)
    hi = max(r[1] for r in rows)
    span = (hi - lo) or 1
    bw = max(5, int(w / len(rows) * 0.55))
    gap = w / len(rows)

    def Y(v):
        return y1 - int((v - lo) / span * (h - 8)) - 4

    for i, (o, hi_, lo_, c) in enumerate(rows):
        x = int(x0 + i * gap + gap / 2)
        col = VERDIGRIS if c >= o else RUST
        d.line([(x, Y(hi_)), (x, Y(lo_))], fill=col, width=2)
        top, bot = min(Y(o), Y(c)), max(Y(o), Y(c))
        d.rectangle((x - bw // 2, top, x + bw // 2, max(bot, top + 3)), fill=col)


def paint_bars(d, box, groups, labels):
    x0, y0, x1, y1 = box
    n = len(groups)
    slot = (x1 - x0) / n
    for i, (a, b) in enumerate(groups):
        left = x0 + slot * i + slot * 0.22
        bw = slot * 0.24
        ha = int((y1 - y0) * a)
        hb = int((y1 - y0) * b)
        d.rectangle((left, y1 - ha, left + bw, y1), fill=INK)
        d.rectangle((left + bw + 4, y1 - hb, left + bw * 2 + 4, y1), fill=VERDIGRIS)
        d.text((left, y1 + 8), labels[i], font=font(MONO, 12), fill=MUTE)


def he_width(d: ImageDraw.ImageDraw, text: str, fnt) -> int:
    if HAS_RAQM:
        bbox = d.textbbox((0, 0), text, font=fnt, direction="rtl", language="he")
    else:
        bbox = d.textbbox((0, 0), text, font=fnt)
    return bbox[2] - bbox[0]


def draw_he(d: ImageDraw.ImageDraw, right: int, y: int, text: str, fnt, fill) -> None:
    if HAS_RAQM:
        d.text((right, y), text, font=fnt, fill=fill, direction="rtl", language="he", anchor="ra")
        return
    from bidi.algorithm import get_display

    visual = get_display(text)
    bbox = d.textbbox((0, 0), visual, font=fnt)
    d.text((right - (bbox[2] - bbox[0]), y), visual, font=fnt, fill=fill)


def legend_he(d: ImageDraw.ImageDraw, items: list[tuple[tuple[int, int, int, int], str]], right: int, y: int) -> None:
    """RTL legend: swatch sits to the right of its Hebrew label, packed from the right edge."""
    x = right
    fnt = font(HEB_R, 15)
    for i, (color, label) in enumerate(items):
        if i:
            x -= 22
        d.rectangle((x - 12, y + 4, x, y + 16), fill=color)
        tw = he_width(d, label, fnt)
        draw_he(d, x - 18, y, label, fnt, INK)
        x -= 18 + tw


def chips(d, clip, xy=(20, 20)):
    x, y = xy
    tw = 26 + 13 * len(clip["ticker"])
    round_box(d, (x, y, x + tw, y + 44), INK, 6)
    d.text((x + 12, y + 12), clip["ticker"], font=font(MONO, 16), fill=PAPER)
    side = VERDIGRIS if clip["up"] else RUST
    round_box(d, (x + tw + 8, y, x + tw + 112, y + 44), side, 6)
    d.text((x + tw + 20, y + 13), clip["side"], font=font(SANS, 14), fill=PAPER)


def plate(d, W_, H_):
    for y in range(WASH_Y, CARD_Y + 8):
        t = min(1.0, (y - WASH_Y) / 72)
        d.line([(0, y), (W_, y)], fill=(20, 23, 31, int(255 * t)))
    d.rectangle((0, CARD_Y, W_, H_), fill=(20, 23, 31, 255))
    box = (16, CARD_Y, W_ - 16, H_ - 16)
    round_box(d, box, PAPER, 12)
    d.rounded_rectangle(box, radius=12, outline=HAIRLINE, width=1)


def header_row(d, clip, y):
    d.text((36, y), clip["name"].upper(), font=font(SANS_R, 13), fill=MUTE)
    d.text((36, y + 20), f"${clip['price']}", font=font(MONO, 32), fill=INK)
    col = VERDIGRIS if clip["up"] else RUST
    d.text((36, y + 60), clip["chg"], font=font(MONO, 18), fill=col)


def chart_box():
    return (36, CARD_Y + 132, 684, H - 48)


def style_area(d, clip, W_, H_):
    plate(d, W_, H_)
    header_row(d, clip, CARD_Y + 22)
    paint_line(d, chart_box(), walk("nvda", 36, True), VERDIGRIS, 3, BAND_UP, True)


def style_quote(d, clip, W_, H_):
    plate(d, W_, H_)
    header_row(d, clip, CARD_Y + 22)
    d.text((220, CARD_Y + 82), "Last 5 sessions", font=font(SANS_R, 12), fill=MUTE)
    paint_line(d, chart_box(), walk("aapl", 40, True), VERDIGRIS, 3, BAND_UP, True)


def style_bars(d, clip, W_, H_):
    plate(d, W_, H_)
    d.text((36, CARD_Y + 22), "Revenue vs operating income", font=font(SANS, 16), fill=INK)
    d.text((36, CARD_Y + 48), clip["name"], font=font(SANS_R, 13), fill=MUTE)
    d.rectangle((36, CARD_Y + 78, 48, CARD_Y + 90), fill=INK)
    d.text((56, CARD_Y + 74), "Revenue", font=font(SANS_R, 12), fill=INK)
    d.rectangle((148, CARD_Y + 78, 160, CARD_Y + 90), fill=VERDIGRIS)
    d.text((168, CARD_Y + 74), "Op. income", font=font(SANS_R, 12), fill=INK)
    paint_bars(d, (36, CARD_Y + 118, 684, H - 78), [(0.60, 0.26), (0.70, 0.33), (0.80, 0.40), (0.90, 0.51)], ["FY22", "FY23", "FY24", "FY25"])
    d.text((36, H - 52), f"${clip['price']}   {clip['chg']}", font=font(MONO, 16), fill=INK)


def style_he_quote(d, clip, W_, H_):
    plate(d, W_, H_)
    lines = clip["he"]
    draw_he(d, 684, CARD_Y + 20, lines[0], font(HEB, 22), INK)
    draw_he(d, 684, CARD_Y + 50, lines[1], font(HEB, 22), INK)
    d.text((36, CARD_Y + 20), f"${clip['price']}", font=font(MONO, 28), fill=INK)
    d.text((36, CARD_Y + 56), clip["chg"], font=font(MONO, 16), fill=VERDIGRIS)
    paint_line(d, chart_box(), walk("amzn-he", 32, True), VERDIGRIS, 3, BAND_UP, True)


def style_pnl(d, clip, W_, H_):
    plate(d, W_, H_)
    d.text((36, CARD_Y + 20), "Unrealized", font=font(SANS, 16), fill=INK)
    d.text((36, CARD_Y + 50), "Instrument", font=font(SANS_R, 11), fill=MUTE)
    d.text((240, CARD_Y + 50), "Side", font=font(SANS_R, 11), fill=MUTE)
    d.text((380, CARD_Y + 50), "P/L", font=font(SANS_R, 11), fill=MUTE)
    d.line([(36, CARD_Y + 72), (684, CARD_Y + 72)], fill=GRID, width=1)
    rows = [(clip["ticker"], "Long", "+11.6%"), ("IGV", "Long", "+4.1%"), ("QQQ", "Long", "+2.8%")]
    y = CARD_Y + 86
    for sym, side, pnl in rows:
        d.text((36, y), sym, font=font(MONO, 16), fill=INK)
        d.text((240, y), side, font=font(SANS_R, 14), fill=INK)
        d.text((380, y), pnl, font=font(MONO, 16), fill=VERDIGRIS)
        y += 36
    paint_line(d, (36, y + 12, 684, H - 48), walk("meta-pnl", 28, True), VERDIGRIS, 3, BAND_UP)


def style_candles(d, clip, W_, H_):
    plate(d, W_, H_)
    header_row(d, clip, CARD_Y + 22)
    d.text((220, CARD_Y + 82), "20 sessions", font=font(SANS_R, 12), fill=MUTE)
    paint_candles(d, (36, CARD_Y + 132, 684, H - 48), ohlc("tsla", 16, False))


def style_he_bars(d, clip, W_, H_):
    plate(d, W_, H_)
    lines = clip["he"]
    draw_he(d, 684, CARD_Y + 18, lines[0], font(HEB, 20), INK)
    draw_he(d, 684, CARD_Y + 46, lines[1], font(HEB, 20), INK)
    d.text((36, CARD_Y + 22), "Search vs cloud", font=font(SANS_R, 13), fill=MUTE)
    paint_bars(d, (36, CARD_Y + 108, 684, H - 96), [(0.86, 0.22), (0.82, 0.29), (0.78, 0.37), (0.74, 0.46)], ["Q1", "Q2", "Q3", "Q4"])
    legend_he(d, [(VERDIGRIS, "ענן"), (INK, "חיפוש")], 684, H - 72)
    d.text((36, H - 52), f"${clip['price']}   {clip['chg']}", font=font(MONO, 15), fill=INK)


def style_ticket(d, clip, W_, H_):
    plate(d, W_, H_)
    d.text((36, CARD_Y + 20), "Order filled", font=font(SANS, 16), fill=INK)
    d.text((36, CARD_Y + 48), "Market buy", font=font(SANS_R, 13), fill=MUTE)
    rows = [("Ticker", clip["ticker"]), ("Action", "BUY"), ("Qty", "120"), ("Fill", f"${clip['price']}"), ("Mark", clip["chg"])]
    y = CARD_Y + 82
    for k, v in rows:
        d.text((36, y), k, font=font(SANS_R, 14), fill=MUTE)
        d.text((400, y), v, font=font(MONO, 15), fill=INK)
        y += 32
    paint_line(d, (36, y + 16, 684, H - 48), walk("avgo", 24, True), VERDIGRIS, 3, BAND_UP, True)


STYLES = {
    "area": style_area,
    "quote": style_quote,
    "bars": style_bars,
    "he_quote": style_he_quote,
    "pnl": style_pnl,
    "candles": style_candles,
    "he_bars": style_he_bars,
    "ticket": style_ticket,
}


def face_canvas(base: Image.Image, face: tuple[int, int]) -> Image.Image:
    src = base.convert("RGB")
    if src.size != (W, H):
        src = src.resize((W, H), Image.Resampling.LANCZOS)
    fy, fh = face
    head = src.crop((0, fy, W, fy + fh)).resize((W, FACE_H), Image.Resampling.LANCZOS)
    head = ImageEnhance.Contrast(head).enhance(1.04)
    head = ImageEnhance.Color(head).enhance(0.97)
    canvas = Image.new("RGB", (W, H), (20, 23, 31))
    canvas.paste(head, (0, 0))
    return canvas


def compose(clip: dict, base: Image.Image, dest: Path, hud_path: Path) -> None:
    face = face_canvas(base, clip["face"])
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    chips(d, clip)
    STYLES[clip["style"]](d, clip, W, H)
    overlay.save(hud_path)
    Image.alpha_composite(face.convert("RGBA"), overlay).convert("RGB").save(dest, quality=92)


def burn_video(src: Path, hud: Path, dest: Path, face: tuple[int, int]) -> None:
    tmp = dest.with_suffix(".tmp.mp4")
    fy, fh = face
    vf = (
        f"[0:v]crop=720:{fh}:0:{fy},scale=720:{FACE_H},"
        f"pad=720:1280:0:0:color=0x14171F[bg];"
        f"[bg][1:v]overlay=0:0:format=auto[v]"
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(src), "-i", str(hud),
            "-filter_complex", vf,
            "-map", "[v]", "-map", "0:a?",
            "-c:v", "libx264", "-preset", "fast", "-crf", "21", "-pix_fmt", "yuv420p",
            "-c:a", "copy", "-movflags", "+faststart", str(tmp),
        ],
        check=True,
    )
    tmp.replace(dest)


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "-C", str(ROOT), "checkout", "--", "public/demo/clips"], check=True)
    print(f"hebrew: {'libraqm RTL' if HAS_RAQM else 'bidi visual-order fallback'}")
    for clip in CLIPS:
        jpg = OUT / f"clip-{clip['id']}.jpg"
        mp4 = OUT / f"clip-{clip['id']}.mp4"
        if not jpg.exists():
            raise SystemExit(f"missing {jpg}")
        base = Image.open(jpg).convert("RGB")
        hud = WORK / f"hud-{clip['id']}.png"
        compose(clip, base, jpg, hud)
        print(f"  thumb {clip['id']} {clip['ticker']:5} {clip['style']:10} {jpg.stat().st_size // 1024} KB")
        if mp4.exists():
            burn_video(mp4, hud, mp4, clip["face"])
            print(f"  video {clip['id']} {mp4.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
