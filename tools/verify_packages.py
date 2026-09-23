"""Verify deployed game archives against the SHA-256 references of the originals."""

from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / "public/assets/sources.json").read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=ROOT / "public/emulator/games")
    args = parser.parse_args()
    for game, reference in SOURCES.items():
        archive = args.directory / f"{game.lower()}.zip"
        with zipfile.ZipFile(archive) as zipped:
            if zipped.namelist() != [f"{game}.exe"]:
                raise ValueError(f"{archive.name}: unexpected archive contents")
            exe = zipped.read(f"{game}.exe")
        if len(exe) != reference["exeBytes"]:
            raise ValueError(f"{archive.name}: wrong executable length")
        if hashlib.sha256(exe).hexdigest() != reference["exeSha256"]:
            raise ValueError(f"{archive.name}: SHA-256 mismatch")
    print(f"Verified {len(SOURCES)} game archives")


if __name__ == "__main__":
    main()
