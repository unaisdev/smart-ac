#include "ir_emit.h"

#include <Arduino.h>
#include <IRsend.h>

namespace {
IRsend irsend(kIrLedPin);

void emitSignal(const MappedSignal& signal, const uint8_t repeats) {
  Serial.print(F("IR emit (RAW x"));
  Serial.print(repeats);
  Serial.print(F("): "));
  Serial.println(signal.label);

  for (uint8_t attempt = 0; attempt < repeats; attempt++) {
    irsend.sendRaw(signal.raw, signal.rawLen, kIrFrequency);
    delay(200);
  }

  Serial.println(F("IR OK"));
}

bool emitById(const char* id, const uint8_t repeats) {
  const MappedSignal* signal = findSignalById(id);
  if (signal == nullptr) {
    Serial.print(F("IR: signal not found: "));
    Serial.println(id);
    return false;
  }

  emitSignal(*signal, repeats);
  return true;
}
}  // namespace

void irEmitBegin() { irsend.begin(); }

void irEmitByIndex(const size_t index) {
  if (index >= kMappedSignalCount) {
    Serial.println(F("IR: index out of range"));
    return;
  }

  const uint8_t repeats = (index >= 2) ? 1 : 3;
  emitSignal(kMappedSignals[index], repeats);
}

bool irEmitPower(const bool powerOn) {
  return emitById(powerOn ? "power-on" : "power-off", 3);
}

bool irEmitTempUp() { return emitById("temp-up", 1); }

bool irEmitTempDown() { return emitById("temp-down", 1); }
