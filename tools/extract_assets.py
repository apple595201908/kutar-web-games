"""Extract licensed Kutar game assets from the 20 supplied Windows executables.

The executables are deliberately kept outside the repository. Run with:
    python tools/extract_assets.py --input "C:/path/to/exes"
Requires pefile and Pillow (see tools/requirements.txt).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path

import pefile
from PIL import Image


GAMES = (
    "balloon", "chan", "concert", "endroll", "HipDance", "hvst",
    "ikki", "kodomo", "kona", "lift", "makyu", "manu", "musa",
    "nawa", "rocket", "rodeo", "santa", "t-shirt", "tube", "apple",
)
MARKER = 0x98982133
PACK_MAGIC = 0x54549022


def unpack_resource(exe: Path) -> list[tuple[str, bytes]]:
    pe = pefile.PE(str(exe))
    entry = next(
        item for item in pe.DIRECTORY_ENTRY_RESOURCE.entries
        if item.name and item.name.string in (b"KPD", b"PACK_DATA")
    )
    resource = entry.directory.entries[0].directory.entries[0].data.struct
    data = pe.get_data(resource.OffsetToData, resource.Size)
    count = struct.unpack_from("<I", data, 4)[0]
    offset = 8
    files: list[tuple[str, int]] = []
    encoded = data.startswith(b"KPDX")
    if encoded:
        for _ in range(count):
            size = struct.unpack_from("<I", data, offset)[0]
            offset += 4
            end = data.index(0x4D, offset)
            name = bytes((byte - 0x4D) & 0xFF for byte in data[offset:end]).decode("cp932")
            offset = end + 1
            files.append((name, size))
    elif struct.unpack_from("<I", data)[0] == PACK_MAGIC:
        for _ in range(count):
            marker, length, size = struct.unpack_from("<III", data, offset)
            if marker != MARKER:
                raise ValueError(f"Unexpected PACK_DATA marker in {exe.name}")
            offset += 12
            name = data[offset:offset + length].decode("cp932")
            offset += length
            files.append((name, size))
    else:
        raise ValueError(f"Unknown asset format in {exe.name}")

    result = []
    for name, size in files:
        if Path(name).name != name or "/" in name or "\\" in name:
            raise ValueError(f"Unsafe asset name in {exe.name}: {name}")
        chunk = data[offset:offset + size]
        if len(chunk) != size:
            raise ValueError(f"Truncated asset {name} in {exe.name}")
        if encoded:
            chunk = bytes((byte - 0x26) & 0xFF for byte in chunk)
        offset += size
        result.append((name, chunk))
    if offset != len(data):
        raise ValueError(f"Unexpected trailing data in {exe.name}")
    return result


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def extract(input_dir: Path, output_dir: Path) -> None:
    source_manifest = {}
    for game in GAMES:
        exe = input_dir / f"{game}.exe"
        if not exe.is_file():
            raise FileNotFoundError(exe)
        raw_exe = exe.read_bytes()
        game_dir = output_dir / game.lower()
        game_dir.mkdir(parents=True, exist_ok=True)
        entries = []
        seen = set()
        for original_name, blob in unpack_resource(exe):
            name = original_name.lower()
            if name in seen:
                raise ValueError(f"Duplicate asset name in {exe.name}: {name}")
            seen.add(name)
            source_hash = sha256(blob)
            if name.endswith(".bmp"):
                bitmap = game_dir / f"{Path(name).stem}.png"
                # Retain every source pixel and its palette colors. Sprite color keys
                # are applied by the renderer per game, after reference inspection.
                from io import BytesIO

                with Image.open(BytesIO(blob)) as image:
                    image.convert("RGB").save(bitmap, format="PNG", optimize=True)
                    dimensions = [image.width, image.height]
                output_name = bitmap.name
            else:
                (game_dir / name).write_bytes(blob)
                dimensions = None
                output_name = name
            entries.append({
                "source": original_name,
                "file": output_name,
                "sourceBytes": len(blob),
                "sourceSha256": source_hash,
                "dimensions": dimensions,
            })
        (game_dir / "manifest.json").write_text(
            json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        source_manifest[game] = {
            "exeSha256": sha256(raw_exe),
            "exeBytes": len(raw_exe),
            "assetCount": len(entries),
        }
        print(f"{game}: {len(entries)} assets")
    (output_dir / "sources.json").write_text(
        json.dumps(source_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True, help="Folder containing the original EXEs")
    parser.add_argument("--output", type=Path, default=Path("public/assets"))
    args = parser.parse_args()
    extract(args.input, args.output)
