"""Capture original Kutar title and initial play frames on Windows.

This is a visual audit helper, not a gameplay recorder. It runs only the 20
named executables, closes the processes it starts, and writes PNGs/metadata.
"""

from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import subprocess
import time
from pathlib import Path

from PIL import ImageGrab

from extract_assets import GAMES

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32
WM_CLOSE = 0x0010
HANDLE = ctypes.c_void_p
user32.GetWindowDC.argtypes = [HANDLE]
user32.GetWindowDC.restype = HANDLE
user32.GetWindowThreadProcessId.argtypes = [HANDLE, ctypes.POINTER(ctypes.c_ulong)]
user32.GetForegroundWindow.restype = HANDLE
user32.SetForegroundWindow.argtypes = [HANDLE]
user32.SetForegroundWindow.restype = ctypes.c_bool
user32.AttachThreadInput.argtypes = [ctypes.c_ulong, ctypes.c_ulong, ctypes.c_bool]
user32.IsWindowVisible.argtypes = [HANDLE]
user32.GetClientRect.argtypes = [HANDLE, HANDLE]
user32.GetWindowRect.argtypes = [HANDLE, HANDLE]
user32.EnumWindows.argtypes = [HANDLE, HANDLE]
user32.EnumChildWindows.argtypes = [HANDLE, HANDLE, HANDLE]
user32.GetClassNameW.argtypes = [HANDLE, HANDLE, ctypes.c_int]
user32.SetWindowPos.argtypes = [HANDLE, HANDLE, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_uint]
user32.SendMessageW.argtypes = [HANDLE, ctypes.c_uint, HANDLE, HANDLE]
user32.PrintWindow.argtypes = [HANDLE, HANDLE, ctypes.c_uint]
user32.ReleaseDC.argtypes = [HANDLE, HANDLE]
user32.PostMessageW.argtypes = [HANDLE, ctypes.c_uint, HANDLE, HANDLE]
gdi32.CreateCompatibleDC.argtypes = [HANDLE]
gdi32.CreateCompatibleDC.restype = HANDLE
gdi32.CreateCompatibleBitmap.argtypes = [HANDLE, ctypes.c_int, ctypes.c_int]
gdi32.CreateCompatibleBitmap.restype = HANDLE
gdi32.SelectObject.argtypes = [HANDLE, HANDLE]
gdi32.SelectObject.restype = HANDLE
gdi32.DeleteObject.argtypes = [HANDLE]
gdi32.DeleteDC.argtypes = [HANDLE]
gdi32.GetDIBits.argtypes = [HANDLE, HANDLE, ctypes.c_uint, ctypes.c_uint, HANDLE, HANDLE, ctypes.c_uint]
kernel32 = ctypes.windll.kernel32


class Rect(ctypes.Structure):
    _fields_ = [(name, ctypes.c_long) for name in ("left", "top", "right", "bottom")]


class BitmapInfoHeader(ctypes.Structure):
    _fields_ = [
        ("size", ctypes.c_uint32), ("width", ctypes.c_int32),
        ("height", ctypes.c_int32), ("planes", ctypes.c_uint16),
        ("bits", ctypes.c_uint16), ("compression", ctypes.c_uint32),
        ("image_size", ctypes.c_uint32), ("xppm", ctypes.c_int32),
        ("yppm", ctypes.c_int32), ("used", ctypes.c_uint32),
        ("important", ctypes.c_uint32),
    ]


class BitmapInfo(ctypes.Structure):
    _fields_ = [("header", BitmapInfoHeader), ("colors", ctypes.c_uint32 * 3)]


def find_window(pid: int) -> int | None:
    matches: list[int] = []
    callback_type = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)

    def visit(hwnd: int, _: int) -> bool:
        window_pid = ctypes.c_ulong()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(window_pid))
        if window_pid.value == pid and user32.IsWindowVisible(hwnd):
            rect = Rect()
            user32.GetClientRect(hwnd, ctypes.byref(rect))
            width, height = rect.right - rect.left, rect.bottom - rect.top
            if 390 <= width <= 450 and 300 <= height <= 380:
                matches.append(hwnd)
        return True

    user32.EnumWindows(callback_type(visit), 0)
    return matches[0] if matches else None


def focus_window(hwnd: int) -> None:
    foreground = user32.GetForegroundWindow()
    if foreground == hwnd:
        return
    current_thread = kernel32.GetCurrentThreadId()
    foreground_thread = user32.GetWindowThreadProcessId(foreground, None) if foreground else 0
    target_thread = user32.GetWindowThreadProcessId(hwnd, None)
    attached = set()
    try:
        for thread in (foreground_thread, target_thread):
            if thread and thread != current_thread and thread not in attached:
                if user32.AttachThreadInput(current_thread, thread, True):
                    attached.add(thread)
        user32.ShowWindow(hwnd, 9)
        user32.SetForegroundWindow(hwnd)
    finally:
        for thread in attached:
            user32.AttachThreadInput(current_thread, thread, False)


def capture(hwnd: int, path: Path) -> tuple[int, int]:
    rect = Rect()
    client = Rect()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    user32.GetClientRect(hwnd, ctypes.byref(client))
    width, height = rect.right - rect.left, rect.bottom - rect.top
    if width <= 0 or height <= 0:
        raise RuntimeError("Window closed before capture")
    # DirectDraw surfaces appear black in PrintWindow. Bring only this game
    # briefly above ordinary windows and take a desktop capture.
    flags = 0x0001 | 0x0002 | 0x0040
    user32.SetWindowPos(hwnd, ctypes.c_void_p(-1), 0, 0, 0, 0, flags)
    try:
        time.sleep(0.1)
        ImageGrab.grab(
            bbox=(rect.left, rect.top, rect.right, rect.bottom), all_screens=True
        ).save(path)
    finally:
        user32.SetWindowPos(hwnd, ctypes.c_void_p(-2), 0, 0, 0, 0, flags)
    return client.right - client.left, client.bottom - client.top


def click_start(hwnd: int) -> None:
    buttons: list[tuple[int, int]] = []
    callback_type = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)

    def visit(child: int, _: int) -> bool:
        class_name = ctypes.create_unicode_buffer(64)
        user32.GetClassNameW(child, class_name, 64)
        if class_name.value == "Button":
            rect = Rect()
            user32.GetWindowRect(child, ctypes.byref(rect))
            buttons.append((rect.left, child))
        return True

    user32.EnumChildWindows(hwnd, callback_type(visit), 0)
    if not buttons:
        raise RuntimeError("Start button not found")
    first = min(buttons)[1]
    user32.SendMessageW(first, 0x00F5, 0, 0)  # BM_CLICK


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", default=Path("reference"), type=Path)
    parser.add_argument("--games", nargs="*", default=GAMES)
    parser.add_argument("--intro-wait", type=float, default=4.0)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / "capture-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    for game in args.games:
        if game not in GAMES:
            raise ValueError(f"Game not in requested scope: {game}")
        exe = args.input / f"{game}.exe"
        previous_window = user32.GetForegroundWindow()
        process = subprocess.Popen([str(exe)], cwd=args.input)
        try:
            hwnd = None
            for _ in range(100):
                time.sleep(0.1)
                hwnd = find_window(process.pid)
                if hwnd:
                    break
            if not hwnd:
                raise RuntimeError(f"No game window: {game}")
            focus_window(hwnd)
            # These releases first show an animated GIGA-RENSYA logo.
            time.sleep(args.intro_wait)
            game_dir = args.output / game.lower()
            game_dir.mkdir(parents=True, exist_ok=True)
            dimensions = capture(hwnd, game_dir / "title.png")
            click_start(hwnd)
            time.sleep(0.2)
            if find_window(process.pid):
                capture(hwnd, game_dir / "play-early.png")
            time.sleep(3.0)
            if find_window(process.pid):
                capture(hwnd, game_dir / "play-later.png")
            manifest[game] = {
                "exeSha256": hashlib.sha256(exe.read_bytes()).hexdigest(),
                "clientSize": dimensions,
                "playfieldSize": [400, 300],
            }
            print(game, dimensions, flush=True)
        finally:
            if previous_window and user32.IsWindowVisible(previous_window):
                focus_window(previous_window)
            if process.poll() is None:
                hwnd = find_window(process.pid)
                if hwnd:
                    user32.PostMessageW(hwnd, WM_CLOSE, 0, 0)
                try:
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
