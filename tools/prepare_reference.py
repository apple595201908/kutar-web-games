"""Crop the native 400x300 playfield and build visual contact sheets."""

import json
from pathlib import Path
from PIL import Image, ImageDraw

from extract_assets import GAMES


def main() -> None:
    source = Path("reference")
    exe_info = json.loads(Path("public/assets/sources.json").read_text(encoding="utf-8"))
    captures = {}
    for stage in ("title", "play-early", "play-later"):
        sheet = Image.new("RGB", (5 * 208, 4 * 182), "#f7f1e7")
        draw = ImageDraw.Draw(sheet)
        for i, game in enumerate(GAMES):
            path = source / game.lower() / f"{stage}.png"
            if not path.exists():
                continue
            with Image.open(path) as original:
                field = original.crop((3, 62, 403, 362)).convert("RGB")
                if stage == "title":
                    destination = Path("public/assets") / game.lower() / "title-screen.png"
                    field.save(destination, optimize=True)
                thumbnail = field.resize((200, 150), Image.Resampling.NEAREST)
                x, y = i % 5 * 208 + 4, i // 5 * 182 + 4
                sheet.paste(thumbnail, (x, y))
                draw.text((x, y + 153), game, fill="#222222")
        sheet.save(source / f"contact-{stage}.png", optimize=True)
    for game in GAMES:
        game_dir = source / game.lower()
        if all((game_dir / f"{stage}.png").exists() for stage in ("title", "play-early", "play-later")):
            captures[game] = {
                "exeSha256": exe_info[game]["exeSha256"],
                "clientSize": [400, 336],
                "playfieldSize": [400, 300],
            }
    (source / "capture-manifest.json").write_text(
        json.dumps(captures, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
