#pragma once

#include <stddef.h>
#include <stdint.h>

// GPIO del LED IR #1 — ver docs/MATERIALS.md
constexpr uint16_t kIrLedPin = 4;
constexpr uint16_t kIrFrequency = 38000;

enum class EmitStrategy : uint8_t {
  Coolix24,
  RawReplay,
};

struct MappedSignal {
  const char* id;
  const char* label;
  EmitStrategy strategy;
  uint64_t coolixCode;
  const uint16_t* raw;
  uint16_t rawLen;
};

extern const MappedSignal kMappedSignals[];
extern const size_t kMappedSignalCount;

const MappedSignal* findSignalById(const char* id);
