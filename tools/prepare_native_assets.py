"""Convert the original sprite sheets' magenta matte for Canvas use."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
for game, names in {
    "lift": ("bg.png", "kutar1.png", "kutar2.png", "kutar3.png", "kutar4.png"),
    "ikki": ("all.png",),
}.items():
    source = ROOT / "public" / "assets" / game
    target = ROOT / "public" / "native" / game
    target.mkdir(parents=True, exist_ok=True)
    for name in names:
        image = Image.open(source / name).convert("RGBA")
        pixels = image.load()
        for y in range(image.height):
            for x in range(image.width):
                red, green, blue, _ = pixels[x, y]
                if red > 240 and green < 20 and blue > 240:
                    pixels[x, y] = (0, 0, 0, 0)
        image.save(target / name, optimize=True)
