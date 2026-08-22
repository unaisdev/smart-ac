#!/usr/bin/env python3
"""Regenerate src/emit/signals_data.cpp from captures/manifest.json + *.txt."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURES = ROOT / "captures"
OUTPUT = ROOT / "src" / "emit" / "signals_data.cpp"

RAW_RE = re.compile(
    r"uint16_t rawData\[\d+\]\s*=\s*\{([^}]+)\};",
    re.DOTALL,
)


def id_to_array_name(signal_id: str) -> str:
    parts = signal_id.split("-")
    name = "".join(p[:1].upper() + p[1:] for p in parts)
    return f"k{name}Raw"


def parse_raw_values(text: str) -> list[int]:
    match = RAW_RE.search(text)
    if not match:
        raise ValueError("RAW array not found in capture file")
    values = [int(v.strip()) for v in match.group(1).split(",") if v.strip()]
    if not values:
        raise ValueError("RAW array is empty")
    return values


def format_raw_array(name: str, values: list[int]) -> str:
    lines = [f"const uint16_t {name}[] = {{"]
    for i in range(0, len(values), 8):
        chunk = values[i : i + 8]
        suffix = "," if i + 8 < len(values) else ","
        line = "    " + ", ".join(str(v) for v in chunk) + suffix
        lines.append(line)
    lines.append("};")
    return "\n".join(lines)


def main() -> int:
    manifest_path = CAPTURES / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    arrays: list[str] = []
    entries: list[str] = []

    for signal in manifest["signals"]:
        signal_id = signal["id"]
        label = signal["label"]
        txt_path = CAPTURES / signal["file"]
        if not txt_path.is_file():
            print(f"Missing capture file: {txt_path}", file=sys.stderr)
            return 1

        raw_values = parse_raw_values(txt_path.read_text(encoding="utf-8"))
        array_name = id_to_array_name(signal_id)
        arrays.append(format_raw_array(array_name, raw_values))
        entries.append(
            f'    {{"{signal_id}", "{label}", EmitStrategy::RawReplay, 0, '
            f"{array_name}, static_cast<uint16_t>(sizeof({array_name}) / "
            f"sizeof({array_name}[0]))}},"
        )

    body = f"""#include "captured_signals.h"

#include <cstring>

namespace {{
{chr(10).join(arrays)}
}}  // namespace

const MappedSignal kMappedSignals[] = {{
{chr(10).join(entries)}
}};

const size_t kMappedSignalCount =
    sizeof(kMappedSignals) / sizeof(kMappedSignals[0]);

const MappedSignal* findSignalById(const char* id) {{
  if (id == nullptr) {{
    return nullptr;
  }}

  for (size_t i = 0; i < kMappedSignalCount; i++) {{
    if (strcmp(kMappedSignals[i].id, id) == 0) {{
      return &kMappedSignals[i];
    }}
  }}

  return nullptr;
}}
"""

    OUTPUT.write_text(body, encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({len(manifest['signals'])} signals)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
