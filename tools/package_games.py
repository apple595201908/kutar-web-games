"""Create reproducible browser packages from the 20 licensed original EXEs.

The generated ZIPs are intentionally ignored by Git. They are deployed as site
artifacts only; the original executables never enter repository history.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / "public/assets/sources.json").read_text(encoding="utf-8"))


def package(source: Path, output: Path) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    result = {}
    for game, reference in SOURCES.items():
        exe = source / f"{game}.exe"
        if not exe.is_file():
            raise FileNotFoundError(exe)
        original = exe.read_bytes()
        digest = hashlib.sha256(original).hexdigest()
        if digest != reference["exeSha256"]:
            raise ValueError(f"{exe.name}: SHA-256 mismatch; refusing to package")
        archive = output / f"{game.lower()}.zip"
        info = zipfile.ZipInfo(exe.name, date_time=(2020, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        with zipfile.ZipFile(archive, "w", compresslevel=9) as zipped:
            zipped.writestr(info, original)
        result[game] = {
            "archive": archive.name,
            "bytes": archive.stat().st_size,
            "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
            "sourceSha256": digest,
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="folder containing the 20 EXEs")
    parser.add_argument("--output", type=Path, default=ROOT / "public/emulator/games")
    args = parser.parse_args()
    manifest = package(args.source, args.output)
    (ROOT / "reference/package-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Packaged {len(manifest)} games ({sum(x['bytes'] for x in manifest.values()):,} bytes)")


if __name__ == "__main__":
    main()
