#include <Arduino.h>
#include <IRrecv.h>
#include <IRutils.h>

// Ver docs/MATERIALS.md — receptor VS1838B OUT → GPIO 15
constexpr uint16_t kRecvPin = 15;
constexpr uint16_t kCaptureBufferSize = 1024;
constexpr uint8_t kTimeout = 50;

IRrecv irrecv(kRecvPin, kCaptureBufferSize, kTimeout, true);
decode_results results;

void writeCapture(const decode_results& decoded) {
  Serial.println(F("--- Señal recibida ---"));

  Serial.print(F("Protocolo: "));
  Serial.println(typeToString(decoded.decode_type, decoded.repeat));

  if (hasACState(decoded.decode_type)) {
    Serial.println(resultToHumanReadableBasic(&decoded));
  }

  Serial.print(F("Codigo: 0x"));
  Serial.println(uint64ToString(decoded.value, 16));

  Serial.println(F("RAW:"));
  Serial.print(F("uint16_t rawData["));
  Serial.print(decoded.rawlen - 1);
  Serial.println(F("] = {"));

  for (uint16_t i = 1; i < decoded.rawlen; i++) {
    Serial.print(decoded.rawbuf[i] * kRawTick);
    if (i < decoded.rawlen - 1) {
      Serial.print(F(", "));
    }
    if (i % 8 == 0) {
      Serial.println();
    }
  }

  Serial.println();
  Serial.println(F("};"));
  Serial.println(F("--- Fin captura ---"));
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println(F("=== BOOT OK ==="));
  Serial.println(F("Smart AC — Fase 1: captura IR (Johnson)"));
  Serial.println(F("Apunta el mando Johnson al receptor (20-50 cm) y pulsa botones."));
  Serial.println(F("Baudios: 115200"));
  Serial.println(F("Guardado automatico en Mac: python tools/capture_monitor.py"));
  Serial.println();

  irrecv.enableIRIn();
}

void loop() {
  if (!irrecv.decode(&results)) {
    return;
  }

  writeCapture(results);
  Serial.println();
  irrecv.resume();
}
