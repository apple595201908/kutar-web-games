"""Convert the original lift sprite sheets' magenta matte for Canvas use."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "lift"
TARGET = ROOT / "public" / "native" / "lift"
TARGET.mkdir(parents=True, exist_ok=True)

for name in ("bg.png", "kutar1.png", "kutar2.png", "kutar3.png", "kutar4.png"):
    image = Image.open(SOURCE / name).convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, _ = pixels[x, y]
            if red > 240 and green < 20 and blue > 240:
                pixels[x, y] = (0, 0, 0, 0)
    image.save(TARGET / name, optimize=True)
