#!/usr/bin/env python3
"""Lee el serial del ESP32 y guarda cada captura IR en ../captures/."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import serial
    from serial.tools import list_ports
except ImportError:
    print("Instala pyserial: pip install pyserial", file=sys.stderr)
    sys.exit(1)

CAPTURES_DIR = Path(__file__).resolve().parent.parent / "captures"
START_MARKER = "--- Señal recibida ---"
END_MARKER = "--- Fin captura ---"


def find_port(preferred: str | None) -> str:
    if preferred:
        return preferred

    for port in list_ports.comports():
        device = port.device.lower()
        if "usbserial" in device or "wchusbserial" in device or "slab" in device:
            return port.device

    ports = [port.device for port in list_ports.comports()]
    if not ports:
        raise RuntimeError("No se detecto ningun puerto serial del ESP32")
    if len(ports) == 1:
        return ports[0]

    raise RuntimeError(
        "Hay varios puertos seriales. Indica uno con --port, por ejemplo "
        f"--port {ports[0]}"
    )


def next_capture_path() -> Path:
    CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    index = 1
    while True:
        path = CAPTURES_DIR / f"capture-{stamp}-{index:02d}.txt"
        if not path.exists():
            return path
        index += 1


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Guarda automaticamente capturas IR del ESP32 en captures/"
    )
    parser.add_argument("--port", help="Puerto serial, p. ej. /dev/cu.usbserial-0001")
    parser.add_argument("--baud", type=int, default=115200)
    args = parser.parse_args()

    port = find_port(args.port)
    print(f"Puerto: {port}")
    print(f"Carpeta: {CAPTURES_DIR}")
    print("Pulsa Ctrl+C para salir.")
    print()

    current_lines: list[str] = []

    with serial.Serial(port, args.baud, timeout=1) as ser:
        while True:
            raw = ser.readline()
            if not raw:
                continue

            try:
                line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
            except UnicodeDecodeError:
                continue

            if not line.strip():
                continue

            print(line)

            if line.strip() == START_MARKER:
                current_lines = [line]
                continue

            if current_lines:
                current_lines.append(line)
                if line.strip() == END_MARKER:
                    path = next_capture_path()
                    path.write_text("\n".join(current_lines) + "\n", encoding="utf-8")
                    print(f"-> Guardado en Mac: {path}")
                    current_lines = []


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nDetenido.")
        raise SystemExit(0)
