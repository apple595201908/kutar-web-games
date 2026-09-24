"""Create a smaller fixed-memory BoxedWine WASM for iPhone Safari.

Only the initial and maximum page counts in the WebAssembly memory section
change. The original upstream WASM remains untouched for desktop browsers.
"""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "public" / "emulator"
SOURCE = ROOT / "boxedwine.wasm"
TARGET = ROOT / "boxedwine-mobile.wasm"
ORIGINAL_PAGES = 8192  # 512 MiB
MOBILE_PAGES = 4096  # 256 MiB


def read_uleb(data: bytes | bytearray, offset: int) -> tuple[int, int]:
    result = 0
    shift = 0
    while True:
        byte = data[offset]
        offset += 1
        result |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return result, offset
        shift += 7


def write_uleb(value: int) -> bytes:
    result = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        result.append(byte | (0x80 if value else 0))
        if not value:
            return bytes(result)


def main() -> None:
    data = bytearray(SOURCE.read_bytes())
    if data[:8] != b"\0asm\x01\0\0\0":
        raise ValueError("Input is not a WebAssembly module")
    offset = 8
    while offset < len(data):
        section = data[offset]
        offset += 1
        size, offset = read_uleb(data, offset)
        end = offset + size
        if section == 5:  # memory section
            count, offset = read_uleb(data, offset)
            flags, offset = read_uleb(data, offset)
            initial_start = offset
            initial, offset = read_uleb(data, offset)
            maximum_start = offset
            maximum, offset = read_uleb(data, offset)
            if (count, flags, initial, maximum, offset) != (1, 1, ORIGINAL_PAGES, ORIGINAL_PAGES, end):
                raise ValueError("Unexpected upstream memory layout")
            replacement = write_uleb(MOBILE_PAGES)
            if len(replacement) != maximum_start - initial_start or len(replacement) != end - maximum_start:
                raise ValueError("Page count encoding would change module length")
            data[initial_start:maximum_start] = replacement
            data[maximum_start:end] = replacement
            TARGET.write_bytes(data)
            print(f"Created {TARGET.name}: {MOBILE_PAGES // 16} MiB fixed memory")
            return
        offset = end
    raise ValueError("No WebAssembly memory section found")


if __name__ == "__main__":
    main()
