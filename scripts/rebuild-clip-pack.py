#!/usr/bin/env python3
"""Eight professional finance-creator posters and matching clips.

Different chart types on purpose: area, quote card, bars, Hebrew quote,
P&L table, candles, Hebrew bars, fill ticket. English on six, Hebrew on two.
"""

from __future__ import annotations

import hashlib
import subprocess
import sys
import unicodedata
from pathlib import Path

from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path("/workspace")
OUT = ROOT / "public" / "demo" / "clips"
WORK = Path("/tmp/stoa-pack")
STOCK = Path("/tmp/stoa-stock")
VOICE = Path("/tmp/stoa-explain")

PAPER = (244, 239, 230, 255)
INK = (28, 25, 23, 255)
INK_D = (28, 25, 23, 228)
VERDIGRIS = (63, 111, 100, 255)
RUST = (140, 74, 58, 255)
CARD = (250, 247, 241, 255)
MUTE = (28, 25, 23, 150)
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
SANS_R = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
HEB = "/usr/share/fonts/truetype/noto/NotoSansHebrew-Bold.ttf"

CLIPS = [
    {"id": "01", "ticker": "NVDA", "name": "NVIDIA Corp", "side": "LONG", "chg": "+18.4%", "price": "128.40", "up": True, "src": "46352.mp4", "at": 8.4, "zoom": 1.04, "style": "area", "note": "Data center demand"},
    {"id": "02", "ticker": "AAPL", "name": "Apple Inc", "side": "LONG", "chg": "+9.2%", "price": "214.80", "up": True, "src": "42323.mp4", "at": 5.1, "zoom": 1.14, "style": "quote", "note": "Last 5 sessions"},
    {"id": "03", "ticker": "MSFT", "name": "Microsoft", "side": "LONG", "chg": "+12.1%", "price": "428.10", "up": True, "src": "41290.mp4", "at": 1.8, "zoom": 1.08, "style": "bars", "note": "Azure mix, four prints"},
    {"id": "04", "ticker": "AMZN", "name": "Amazon.com", "side": "LONG", "chg": "+14.8%", "price": "186.20", "up": True, "src": "2955.mp4", "at": 4.4, "zoom": 1.04, "style": "he_quote", "note": "המרווח של הענן חוזר"},
    {"id": "05", "ticker": "META", "name": "Meta Platforms", "side": "LONG", "chg": "+11.6%", "price": "512.90", "up": True, "src": "41272.mp4", "at": 6.0, "zoom": 1.16, "style": "pnl", "note": "Unrealized"},
    {"id": "06", "ticker": "TSLA", "name": "Tesla Inc", "side": "SHORT", "chg": "-8.7%", "price": "178.40", "up": False, "src": "2960.mp4", "at": 2.8, "zoom": 1.10, "style": "candles", "note": "20 sessions"},
    {"id": "07", "ticker": "GOOGL", "name": "Alphabet", "side": "LONG", "chg": "+7.4%", "price": "172.60", "up": True, "src": "52184.mp4", "at": 6.8, "zoom": 1.02, "style": "he_bars", "note": "חיפוש מחזיק. הענן עולה."},
    {"id": "08", "ticker": "AVGO", "name": "Broadcom", "side": "LONG", "chg": "+16.3%", "price": "174.20", "up": True, "src": "4834.mp4", "at": 3.6, "zoom": 1.12, "style": "ticket", "note": "Filled  ·  market buy"},
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def rtl(s: str) -> str:
    visual = get_display(s)
    return "".join(ch for ch in visual if unicodedata.category(ch) != "Cf")


def text_he(d: ImageDraw.ImageDraw, right: int, y: int, s: str, fnt, fill) -> None:
    visual = rtl(s)
    bbox = d.textbbox((0, 0), visual, font=fnt)
    d.text((right - (bbox[2] - bbox[0]), y), visual, font=fnt, fill=fill)


def walk(seed: str, n: int, up: bool) -> list[float]:
    h = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)
    v = 40.0 + (h % 24)
    drift = 1.1 if up else -1.0
    out: list[float] = []
    for i in range(n):
        h = (h * 1664525 + 1013904223 + i * 17) & 0xFFFFFFFF
        v = max(14.0, min(90.0, v + drift + (((h % 700) - 350) / 90)))
        out.append(v)
    return out


def ohlc(seed: str, n: int, up: bool) -> list[tuple[float, float, float, float]]:
    ys = walk(seed, n + 1, up)
    rows = []
    for i in range(n):
        o, c = ys[i], ys[i + 1]
        rows.append((o, max(o, c) + 2.0, min(o, c) - 1.6, c))
    return rows


def grab(src: Path, dest: Path, at: float, zoom: float) -> None:
    z = max(1.0, zoom)
    vf = (
        f"scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,"
        f"scale=iw*{z}:ih*{z},crop=720:1280,setsar=1"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-ss", f"{at:.2f}", "-i", str(src), "-vf", vf, "-frames:v", "1", str(dest)],
        check=True,
    )


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
        y = y1 - int((v - lo) / span * (h - 8)) - 4
        out.append((x, y))
    return out


def paint_line(d, box, ys, color, width=3, band=None, grid=False, grid_ink=False):
    x0, y0, x1, y1 = box
    g = (28, 25, 23, 30) if grid_ink else (244, 239, 230, 36)
    if grid:
        for i in range(1, 4):
            y = y0 + int((y1 - y0) * i / 4)
            d.line([(x0, y), (x1, y)], fill=g, width=1)
        for i in range(1, 5):
            x = x0 + int((x1 - x0) * i / 5)
            d.line([(x, y0), (x, y1)], fill=g, width=1)
    p = pts(box, ys)
    if band:
        d.polygon([(p[0][0], y1)] + p + [(p[-1][0], y1)], fill=band)
    d.line(p, fill=color, width=width, joint="curve")
    ex, ey = p[-1]
    d.ellipse((ex - 5, ey - 5, ex + 5, ey + 5), fill=color)


def paint_candles(d, box, rows):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    lo = min(r[2] for r in rows)
    hi = max(r[1] for r in rows)
    span = (hi - lo) or 1
    bw = max(6, int(w / len(rows) * 0.6))
    gap = w / len(rows)
    for i, (o, hi_, lo_, c) in enumerate(rows):
        x = int(x0 + i * gap + gap / 2)
        def Y(v):
            return y1 - int((v - lo) / span * (h - 8)) - 4
        col = VERDIGRIS if c >= o else RUST
        d.line([(x, Y(hi_)), (x, Y(lo_))], fill=col, width=2)
        top, bot = min(Y(o), Y(c)), max(Y(o), Y(c))
        d.rectangle((x - bw // 2, top, x + bw // 2, max(bot, top + 3)), fill=col)


def paint_bars(d, box, groups, labels):
    x0, y0, x1, y1 = box
    n = len(groups)
    slot = (x1 - x0) / n
    for i, (a, b) in enumerate(groups):
        left = x0 + slot * i + slot * 0.16
        bw = slot * 0.28
        ha = int((y1 - y0) * a)
        hb = int((y1 - y0) * b)
        d.rectangle((left, y1 - ha, left + bw, y1), fill=INK)
        d.rectangle((left + bw + 5, y1 - hb, left + bw * 2 + 5, y1), fill=VERDIGRIS)
        d.text((left, y1 + 8), labels[i], font=font(MONO, 14), fill=MUTE)


def chips(d, clip, xy=(24, 28)):
    x, y = xy
    tw = 22 + 13 * len(clip["ticker"])
    round_box(d, (x, y, x + tw, y + 50), INK_D, 8)
    d.text((x + 12, y + 12), clip["ticker"], font=font(MONO, 22), fill=PAPER)
    side = VERDIGRIS if clip["up"] else RUST
    round_box(d, (x + tw + 8, y, x + tw + 118, y + 50), side, 8)
    d.text((x + tw + 20, y + 14), clip["side"], font=font(SANS, 18), fill=PAPER)


def fade_bottom(d, top, H, W, a=210):
    for y in range(top, H):
        t = (y - top) / (H - top)
        d.line([(0, y), (W, y)], fill=(28, 25, 23, int(a * t)))


def style_area(d, clip, W, H):
    fade_bottom(d, H - 540, H, W, 215)
    chips(d, clip)
    d.text((28, 790), clip["name"].upper(), font=font(SANS_R, 16), fill=(244, 239, 230, 160))
    d.text((28, 818), f"${clip['price']}", font=font(MONO, 46), fill=PAPER)
    d.text((28, 876), clip["chg"], font=font(MONO, 26), fill=VERDIGRIS)
    paint_line(d, (18, 930, 702, 1240), walk("nvda-area", 40, True), PAPER, 3, (63, 111, 100, 75), True)


def style_quote(d, clip, W, H):
    chips(d, clip)
    round_box(d, (32, 400, 688, 1020), CARD, 14)
    d.text((52, 424), clip["name"], font=font(SANS_R, 20), fill=MUTE)
    d.text((52, 456), f"{clip['ticker']}  NASDAQ", font=font(MONO, 15), fill=MUTE)
    d.text((52, 500), f"${clip['price']}", font=font(MONO, 48), fill=INK)
    d.text((52, 560), f"{clip['chg']}    5D", font=font(MONO, 20), fill=VERDIGRIS)
    paint_line(d, (52, 620, 668, 960), walk("aapl-q", 42, True), VERDIGRIS, 3, (63, 111, 100, 40), True, True)
    d.text((52, 976), clip["note"], font=font(SANS_R, 15), fill=MUTE)


def style_bars(d, clip, W, H):
    chips(d, clip)
    round_box(d, (24, 540, 696, 1190), CARD, 14)
    d.text((44, 564), "Financials", font=font(SANS, 22), fill=INK)
    d.text((44, 596), clip["note"], font=font(SANS_R, 15), fill=MUTE)
    d.rectangle((44, 640, 60, 656), fill=INK)
    d.text((68, 638), "Revenue", font=font(SANS_R, 14), fill=INK)
    d.rectangle((176, 640, 192, 656), fill=VERDIGRIS)
    d.text((200, 638), "Operating income", font=font(SANS_R, 14), fill=INK)
    paint_bars(d, (44, 680, 676, 1080), [(0.60, 0.26), (0.70, 0.33), (0.80, 0.40), (0.90, 0.51)], ["FY22", "FY23", "FY24", "FY25"])
    d.text((44, 1136), f"{clip['ticker']}   ${clip['price']}   {clip['chg']}", font=font(MONO, 18), fill=INK)


def style_he_quote(d, clip, W, H):
    chips(d, clip)
    round_box(d, (28, 470, 692, 1060), CARD, 14)
    text_he(d, 672, 494, clip["note"], font(HEB, 26), INK)
    d.text((48, 544), f"{clip['name']}   {clip['ticker']}", font=font(MONO, 15), fill=MUTE)
    d.text((48, 580), f"${clip['price']}", font=font(MONO, 44), fill=INK)
    d.text((48, 636), clip["chg"], font=font(MONO, 22), fill=VERDIGRIS)
    paint_line(d, (48, 690, 672, 1020), walk("amzn-he", 34, True), VERDIGRIS, 3, (63, 111, 100, 34), True, True)


def style_pnl(d, clip, W, H):
    chips(d, clip)
    round_box(d, (20, 600, 700, 1200), (32, 29, 27, 236), 12)
    d.text((40, 624), "Instrument", font=font(SANS_R, 13), fill=(244, 239, 230, 130))
    d.text((250, 624), "Side", font=font(SANS_R, 13), fill=(244, 239, 230, 130))
    d.text((370, 624), "P/L", font=font(SANS_R, 13), fill=(244, 239, 230, 130))
    d.text((520, 624), "Avg", font=font(SANS_R, 13), fill=(244, 239, 230, 130))
    d.line([(36, 656), (684, 656)], fill=(244, 239, 230, 40), width=1)
    rows = [(clip["ticker"], "Long", "+11.6%", "462.10"), ("IGV", "Long", "+4.1%", "88.40"), ("QQQ", "Long", "+2.8%", "478.20")]
    y = 680
    for i, (sym, side, pnl, avg) in enumerate(rows):
        if i == 0:
            round_box(d, (28, y - 10, 692, y + 50), (244, 239, 230, 18), 8)
        d.text((40, y), sym, font=font(MONO, 20), fill=PAPER)
        d.text((250, y), side, font=font(SANS_R, 18), fill=PAPER)
        d.text((370, y), pnl, font=font(MONO, 20), fill=VERDIGRIS)
        d.text((520, y), avg, font=font(MONO, 18), fill=PAPER)
        y += 62
    paint_line(d, (40, 900, 680, 1080), walk("meta-pnl", 28, True), PAPER, 2, (63, 111, 100, 55))
    d.text((40, 1124), "Unrealized  ·  marked live", font=font(SANS_R, 14), fill=(244, 239, 230, 120))


def style_candles(d, clip, W, H):
    chips(d, clip)
    fade_bottom(d, H - 580, H, W, 220)
    d.text((28, 740), f"${clip['price']}", font=font(MONO, 42), fill=PAPER)
    d.text((28, 794), clip["chg"], font=font(MONO, 26), fill=RUST)
    d.text((28, 838), clip["note"], font=font(SANS_R, 16), fill=(244, 239, 230, 150))
    paint_candles(d, (18, 880, 702, 1244), ohlc("tsla", 18, False))


def style_he_bars(d, clip, W, H):
    chips(d, clip)
    round_box(d, (24, 520, 696, 1170), CARD, 14)
    text_he(d, 676, 544, clip["note"], font(HEB, 22), INK)
    d.text((44, 594), "Search vs cloud mix", font=font(SANS_R, 15), fill=MUTE)
    paint_bars(d, (44, 650, 676, 1020), [(0.86, 0.22), (0.82, 0.29), (0.78, 0.37), (0.74, 0.46)], ["Q1", "Q2", "Q3", "Q4"])
    d.rectangle((44, 1088, 60, 1104), fill=INK)
    d.text((68, 1084), rtl("חיפוש"), font=font(HEB, 16), fill=INK)
    d.rectangle((200, 1088, 216, 1104), fill=VERDIGRIS)
    d.text((224, 1084), rtl("ענן"), font=font(HEB, 16), fill=INK)


def style_ticket(d, clip, W, H):
    chips(d, clip)
    round_box(d, (32, 450, 688, 1120), CARD, 14)
    d.text((52, 474), "Order filled", font=font(SANS, 22), fill=INK)
    d.text((52, 508), clip["note"], font=font(SANS_R, 15), fill=MUTE)
    rows = [("Ticker", clip["ticker"]), ("Action", "BUY"), ("Type", "Market"), ("Qty", "120"), ("Fill", f"${clip['price']}"), ("Mark", clip["chg"])]
    y = 560
    for k, v in rows:
        d.text((52, y), k, font=font(SANS_R, 16), fill=MUTE)
        d.text((420, y), v, font=font(MONO, 18), fill=INK)
        y += 40
    paint_line(d, (52, 820, 668, 1070), walk("avgo", 22, True), VERDIGRIS, 3, (63, 111, 100, 32), True, True)


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


def compose(clip: dict, face: Path, dest: Path) -> None:
    W, H = 720, 1280
    base = Image.open(face).convert("RGB")
    base = ImageEnhance.Contrast(base).enhance(1.06)
    base = ImageEnhance.Color(base).enhance(0.92)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    STYLES[clip["style"]](ImageDraw.Draw(overlay), clip, W, H)
    Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB").save(dest, quality=90)
    overlay.save(WORK / f"hud-{clip['id']}.png")
    print(f"  {clip['id']} {clip['ticker']:5} {clip['style']:10} {dest.stat().st_size // 1024} KB")


def probe(path: Path) -> float:
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        text=True,
    ).strip())


def encode(stock: Path, hud: Path, audio: Path, dest: Path) -> float:
    dur = min(29.5, max(14.0, probe(audio) + 0.3))
    vf = (
        "[0:v]scale=720:1280:force_original_aspect_ratio=increase,"
        "crop=720:1280,setsar=1,eq=contrast=1.03:saturation=0.92[v];"
        "[v][2:v]overlay=0:0:format=auto[out]"
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-stream_loop", "-1", "-i", str(stock),
            "-i", str(audio),
            "-i", str(hud),
            "-filter_complex", vf,
            "-map", "[out]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "fast", "-crf", "21", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
            "-t", f"{dur:.2f}", "-movflags", "+faststart", str(dest),
        ],
        check=True,
    )
    return dur


def main() -> None:
    wanted = {a.zfill(2) for a in sys.argv[1:]} if len(sys.argv) > 1 else None
    WORK.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for clip in CLIPS:
        if wanted and clip["id"] not in wanted:
            continue
        src = STOCK / clip["src"]
        if not src.exists():
            raise SystemExit(f"missing {src}")
        frame = WORK / f"face-{clip['id']}.jpg"
        grab(src, frame, clip["at"], clip["zoom"])
        compose(clip, frame, OUT / f"clip-{clip['id']}.jpg")
        audio = VOICE / f"voice-{clip['id']}.mp3"
        if audio.exists():
            dur = encode(src, WORK / f"hud-{clip['id']}.png", audio, OUT / f"clip-{clip['id']}.mp4")
            print(f"     video {dur:.1f}s  {(OUT / f'clip-{clip['id']}.mp4').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
