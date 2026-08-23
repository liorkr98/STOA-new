#!/usr/bin/env python3
"""Talking-head explainers + chart thumbnails for the investor demo.

Uses Mixkit talking-to-camera footage (Free License), a spoken thesis via
edge-tts, and a candlestick overlay so clips read like social-finance shorts
rather than Ken Burns stills.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
from pathlib import Path

import edge_tts
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path("/workspace")
OUT = ROOT / "public" / "demo" / "clips"
WORK = Path("/tmp/stoa-explain")
STOCK = Path("/tmp/stoa-stock")
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
SANS_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

PAPER = (244, 239, 230, 255)
VERDIGRIS = (63, 111, 100, 255)
RUST = (140, 74, 58, 255)

CLIPS = [
    {
        "id": "01",
        "ticker": "NVDA",
        "side": "LONG",
        "chg": "+18.4%",
        "price": "128.40",
        "hook": "Supply is still\nthe whole story",
        "caption": "Hyperscaler capex says H1 stays tight.",
        "script": (
            "Here is the Nvidia call. This is still a supply story, not a demand story. "
            "The Street is modelling a normal cycle. Hyperscaler capex says the first half "
            "stays tight. Inventories are not building the way bears want. I stay long into "
            "January with a one hundred forty target on this setup."
        ),
        "voice": "en-US-GuyNeural",
        "src": "28287.mp4",
        "up": True,
    },
    {
        "id": "02",
        "ticker": "AAPL",
        "side": "LONG",
        "chg": "+9.2%",
        "price": "214.80",
        "hook": "Services hold\nthe multiple",
        "caption": "Hardware is fine. Services keep the multiple.",
        "script": (
            "Apple is not a unit-growth story anymore. Watch services mix. That attach "
            "rate is what holds the multiple when hardware is only fine. Buybacks keep "
            "shrinking the share count. I stay long while services keep compounding through "
            "the next two prints."
        ),
        "voice": "en-US-JennyNeural",
        "src": "42323.mp4",
        "up": True,
    },
    {
        "id": "03",
        "ticker": "MSFT",
        "side": "LONG",
        "chg": "+12.1%",
        "price": "428.10",
        "hook": "This is an\nAzure call",
        "caption": "The savings target does not break the Azure ramp.",
        "script": (
            "Microsoft is an Azure call. They reiterated the savings target. That does "
            "not break the cloud ramp. Commercial seats are still growing and GitHub plus "
            "security keep the mix rich. I stay long as long as Azure growth holds above "
            "the Street's fade."
        ),
        "voice": "en-US-AriaNeural",
        "src": "41290.mp4",
        "up": True,
    },
    {
        "id": "04",
        "ticker": "AMZN",
        "side": "LONG",
        "chg": "+14.8%",
        "price": "186.20",
        "hook": "AWS margin\nis turning",
        "caption": "Retail funds the flywheel. AWS is the earnings.",
        "script": (
            "Amazon is an AWS margin story. Retail funds the flywheel. AWS is where "
            "the earnings show up. The Street is still under-modelling operating leverage "
            "as capacity fills. Watch the next two quarters. I stay long into that inflection."
        ),
        "voice": "en-US-GuyNeural",
        "src": "2955.mp4",
        "up": True,
    },
    {
        "id": "05",
        "ticker": "META",
        "side": "LONG",
        "chg": "+11.6%",
        "price": "512.90",
        "hook": "Ads beat.\nReels convert.",
        "caption": "Reels conversion is catching up to feed.",
        "script": (
            "Meta is an ads-efficiency story. Reels conversion is catching the feed. "
            "That gap closing is the whole multiple. Spend stays disciplined and Reality "
            "Labs is no longer eating the print. I stay long while conversion keeps moving "
            "in the right direction."
        ),
        "voice": "en-US-MichelleNeural",
        "src": "41272.mp4",
        "up": True,
    },
    {
        "id": "06",
        "ticker": "TSLA",
        "side": "SHORT",
        "chg": "-8.7%",
        "price": "178.40",
        "hook": "Price cuts\neat the multiple",
        "caption": "Volume is not covering the margin give.",
        "script": (
            "Tesla is a margin story going the wrong way. Price cuts are eating the "
            "multiple. Volume is not covering the give. Energy does not offset auto. Until "
            "mix turns, this is a short, not a dip-buy. I stay short with a one fifty-five target."
        ),
        "voice": "en-US-ChristopherNeural",
        "src": "2960.mp4",
        "up": False,
    },
    {
        "id": "07",
        "ticker": "GOOGL",
        "side": "LONG",
        "chg": "+7.4%",
        "price": "172.60",
        "hook": "Search holds.\nCloud ramps.",
        "caption": "YouTube plus cloud is the second engine.",
        "script": (
            "Google is still a search cash-flow story, with cloud as the second engine. "
            "YouTube pricing is holding. Cloud mix is improving and the AI overlap is not "
            "breaking search the way bears claim. I stay long while that second engine keeps "
            "taking share of the print."
        ),
        "voice": "en-US-JennyNeural",
        "src": "52184.mp4",
        "up": True,
    },
    {
        "id": "08",
        "ticker": "AVGO",
        "side": "LONG",
        "chg": "+16.3%",
        "price": "174.20",
        "hook": "Custom silicon\nis the runway",
        "caption": "Networking plus ASICs, not one chip cycle.",
        "script": (
            "Broadcom is a custom-silicon runway. This is networking plus ASICs, not "
            "one chip cycle. The large customers keep converting and VMware mix is helping "
            "the print. I stay long while that backlog stays visible into next year."
        ),
        "voice": "en-US-GuyNeural",
        "src": "4834.mp4",
        "up": True,
    },
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def candles(seed: str, n: int = 28, up: bool = True) -> list[tuple[float, float, float, float]]:
    h = 2166136261
    for ch in seed:
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    close = 40 + (h % 80)
    drift = 0.018 if up else -0.016
    rows = []
    for _ in range(n):
        h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
        o = close
        close = max(6, close * (1 + drift + (((h % 91) - 44) / 520)))
        hi = max(o, close) * (1.01 + ((h % 17) / 900))
        lo = min(o, close) * (0.99 - ((h % 13) / 900))
        rows.append((o, hi, lo, close))
    return rows


def draw_chart(path: Path, seed: str, up: bool, w: int = 980, h: int = 420) -> None:
    rows = candles(seed, 32, up)
    fig, ax = plt.subplots(figsize=(w / 100, h / 100), dpi=100)
    fig.patch.set_facecolor((0.11, 0.10, 0.09, 0.0))
    ax.set_facecolor((0.11, 0.10, 0.09, 0.0))
    up_c = "#3F6F64"
    dn_c = "#8C4A3A"
    width = 0.62
    for i, (o, hi, lo, c) in enumerate(rows):
        color = up_c if c >= o else dn_c
        ax.plot([i, i], [lo, hi], color=color, linewidth=1.4, solid_capstyle="round")
        y = min(o, c)
        height = abs(c - o) or 0.35
        ax.add_patch(Rectangle((i - width / 2, y), width, height, facecolor=color, edgecolor=color))
    closes = [r[3] for r in rows]
    ax.plot(closes, color="#C4A574", linewidth=1.5, alpha=0.85)
    ax.set_xlim(-0.8, len(rows) - 0.2)
    pad = (max(closes) - min(closes)) * 0.18
    ax.set_ylim(min(r[2] for r in rows) - pad, max(r[1] for r in rows) + pad)
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)
    fig.subplots_adjust(0.01, 0.04, 0.99, 0.96)
    fig.savefig(path, dpi=100, transparent=True)
    plt.close(fig)


def compose_overlay(clip: dict, chart: Path, dest: Path, *, thumb: bool) -> None:
    W, H = 720, 1280
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    scrim_h = 560 if thumb else 420
    for y in range(H - scrim_h, H):
        t = (y - (H - scrim_h)) / scrim_h
        a = int((200 if thumb else 170) * t)
        d.line([(0, y), (W, y)], fill=(28, 25, 23, min(230, a)))

    d.rounded_rectangle((24, 28, 210, 92), radius=8, fill=(28, 25, 23, 220))
    d.text((38, 42), clip["ticker"], font=font(MONO, 32), fill=PAPER)
    side_fill = VERDIGRIS if clip["up"] else RUST
    d.rounded_rectangle((222, 28, 348, 92), radius=8, fill=side_fill)
    d.text((236, 46), clip["side"], font=font(SANS, 22), fill=PAPER)
    chg_fill = VERDIGRIS if clip["up"] else RUST
    d.text((362, 42), clip["chg"], font=font(MONO, 28), fill=chg_fill)

    if thumb:
        d.text((28, 640), clip["hook"], font=font(SANS, 46), fill=PAPER, spacing=4)
        d.text((28, 770), f"${clip['price']}", font=font(MONO, 36), fill=PAPER)

    ch = Image.open(chart).convert("RGBA")
    ch = ch.resize((672, 300 if thumb else 250), Image.Resampling.LANCZOS)
    img.paste(ch, (24, 860 if thumb else 980), ch)
    d.text(
        (32, 1178 if thumb else 1240),
        clip["caption"],
        font=font(SANS_REG, 18 if thumb else 16),
        fill=PAPER,
    )
    img.save(dest)


def grab_frame(src: Path, dest: Path, at: float = 2.4) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-ss", f"{at:.2f}", "-i", str(src),
            "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1",
            "-frames:v", "1", str(dest),
        ],
        check=True,
    )


def make_thumbnail(frame: Path, overlay: Path, dest: Path) -> None:
    base = Image.open(frame).convert("RGB")
    base = ImageEnhance.Contrast(base).enhance(1.06)
    base = ImageEnhance.Color(base).enhance(0.92)
    ov = Image.open(overlay).convert("RGBA")
    out = Image.alpha_composite(base.convert("RGBA"), ov)
    out.convert("RGB").save(dest, quality=90)


FALLBACK_VOICES = [
    "en-US-GuyNeural",
    "en-US-JennyNeural",
    "en-US-AriaNeural",
    "en-US-ChristopherNeural",
]


async def speak(clip: dict, dest: Path) -> None:
    voices = [clip["voice"], *[v for v in FALLBACK_VOICES if v != clip["voice"]]]
    last_err: Exception | None = None
    for voice in voices:
        try:
            comm = edge_tts.Communicate(clip["script"], voice, rate="-4%")
            await comm.save(str(dest))
            return
        except Exception as err:  # noqa: BLE001 — TTS CDN is flaky
            last_err = err
            if dest.exists():
                dest.unlink()
    raise RuntimeError(f"TTS failed for {clip['id']}") from last_err


def probe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "csv=p=0", str(path),
        ],
        text=True,
    ).strip()
    return float(out)


def encode(stock: Path, overlay: Path, audio: Path, dest: Path) -> float:
    dur = min(29.8, max(14.0, probe_duration(audio) + 0.35))
    vf = (
        "[0:v]scale=720:1280:force_original_aspect_ratio=increase,"
        "crop=720:1280,setsar=1,eq=contrast=1.04:saturation=0.92[v];"
        "[v][2:v]overlay=0:0:format=auto[out]"
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-stream_loop", "-1", "-i", str(stock),
            "-i", str(audio),
            "-i", str(overlay),
            "-filter_complex", vf,
            "-map", "[out]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "fast", "-crf", "21", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
            "-t", f"{dur:.2f}", "-movflags", "+faststart",
            str(dest),
        ],
        check=True,
    )
    return dur


async def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for clip in CLIPS:
        print(f"building {clip['id']} {clip['ticker']}", flush=True)
        stock = STOCK / clip["src"]
        if not stock.exists():
            raise SystemExit(f"missing stock footage {stock}")
        chart = WORK / f"chart-{clip['id']}.png"
        hud = WORK / f"hud-{clip['id']}.png"
        hud_thumb = WORK / f"hud-thumb-{clip['id']}.png"
        frame = WORK / f"frame-{clip['id']}.jpg"
        audio = WORK / f"voice-{clip['id']}.mp3"
        thumb = OUT / f"clip-{clip['id']}.jpg"
        video = OUT / f"clip-{clip['id']}.mp4"
        draw_chart(chart, clip["ticker"], clip["up"])
        compose_overlay(clip, chart, hud, thumb=False)
        compose_overlay(clip, chart, hud_thumb, thumb=True)
        grab_frame(stock, frame)
        make_thumbnail(frame, hud_thumb, thumb)
        await speak(clip, audio)
        dur = encode(stock, hud, audio, video)
        print(
            f"  {dur:.1f}s  video {video.stat().st_size // 1024} KB  "
            f"thumb {thumb.stat().st_size // 1024} KB",
            flush=True,
        )


if __name__ == "__main__":
    os.chdir(ROOT)
    asyncio.run(main())
