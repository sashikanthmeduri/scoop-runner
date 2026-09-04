#!/usr/bin/env python3
"""Build Play / App Store icons and Android mipmaps from the runner sprite."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SPRITE = ROOT / "public" / "sprites" / "run-3.png"
OUT = ROOT / "store" / "listing"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
IOS_APPICON = ROOT / "ios" / "ScoopRunner" / "Assets.xcassets" / "AppIcon.appiconset"

INK = (18, 16, 12, 255)
PAPER = (243, 234, 216, 255)
MASTHEAD = (196, 30, 58, 255)
GOLD = (212, 160, 23, 255)


def load_runner(size: int) -> Image.Image:
    im = Image.open(SPRITE).convert("RGBA")
    # trim near-empty edges
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im.thumbnail((int(size * 0.72), int(size * 0.72)), Image.Resampling.LANCZOS)
    return im


def make_icon(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    pad = int(size * 0.06)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=int(size * 0.22),
        fill=INK,
    )
    # masthead bar
    draw.rectangle(
        [pad, pad, size - pad, pad + int(size * 0.16)],
        fill=MASTHEAD,
    )
    runner = load_runner(size)
    x = (size - runner.width) // 2
    y = pad + int(size * 0.18) + ((size - pad - int(size * 0.18) - runner.height) // 2)
    canvas.alpha_composite(runner, (x, y))
    # gold rule
    y2 = size - pad - int(size * 0.08)
    draw.rectangle([pad + int(size * 0.12), y2, size - pad - int(size * 0.12), y2 + max(2, size // 80)], fill=GOLD)
    return canvas


def save_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG")
    print("wrote", path.relative_to(ROOT))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    icon1024 = make_icon(1024)
    save_png(icon1024, OUT / "icon-1024.png")
    save_png(icon1024.resize((512, 512), Image.Resampling.LANCZOS), OUT / "icon-512.png")

    # Play feature graphic 1024x500
    feat = Image.new("RGB", (1024, 500), (18, 16, 12))
    d = ImageDraw.Draw(feat)
    d.rectangle([0, 0, 1024, 64], fill=MASTHEAD)
    d.rectangle([0, 480, 1024, 500], fill=GOLD)
    runner = load_runner(420)
    feat.paste(runner, (80, 90 + (340 - runner.height) // 2), runner)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except OSError:
        font = ImageFont.load_default()
        small = font
    d.text((430, 160), "SCOOP RUNNER", fill=PAPER[:3], font=font)
    d.text((430, 250), "Chase the exclusive. File it first.", fill=(196, 30, 58), font=small)
    feat.save(OUT / "feature-graphic-1024x500.png", "PNG")
    print("wrote store/listing/feature-graphic-1024x500.png")

    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in densities.items():
        resized = icon1024.resize((size, size), Image.Resampling.LANCZOS)
        save_png(resized, ANDROID_RES / folder / "ic_launcher.png")
        save_png(resized, ANDROID_RES / folder / "ic_launcher_round.png")

    # iOS app icon set (single 1024 required for modern Xcode)
    save_png(icon1024, IOS_APPICON / "AppIcon.png")


if __name__ == "__main__":
    main()
