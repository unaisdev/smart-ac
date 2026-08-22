#include <Arduino.h>
#include <IRsend.h>

#include "captured_signals.h"

IRsend irsend(kIrLedPin);

void printMenu() {
  Serial.println();
  Serial.println(F("=== Smart AC — Fase 3: prueba emisor IR (Johnson) ==="));
  Serial.println(F("Apunta el LED IR al aire (GPIO 4)."));
  Serial.println();
  Serial.println(F("Teclas:"));
  Serial.println(F("  1 = Apagar       (power-off)"));
  Serial.println(F("  2 = Encender     (power-on)"));
  Serial.println(F("  3 = Subir temp   (temp-up)"));
  Serial.println(F("  4 = Bajar temp   (temp-down)"));
  Serial.println(F("  m = Este menu"));
  Serial.println(F("Consejo: LED a 20-30 cm del aire; camara movil para ver si parpadea."));
  Serial.println();
}

void emitSignal(const MappedSignal& signal, const uint8_t repeats) {
  Serial.print(F("Emitiendo (RAW x"));
  Serial.print(repeats);
  Serial.print(F("): "));
  Serial.println(signal.label);

  for (uint8_t attempt = 0; attempt < repeats; attempt++) {
    irsend.sendRaw(signal.raw, signal.rawLen, kIrFrequency);
    delay(200);
  }

  Serial.println(F("OK"));
}

void emitByIndex(const size_t index) {
  if (index >= kMappedSignalCount) {
    Serial.println(F("Tecla no mapeada"));
    return;
  }

  // Power: 3 envios. Temp: 1 envio (como un solo clic del mando).
  const uint8_t repeats = (index >= 2) ? 1 : 3;
  emitSignal(kMappedSignals[index], repeats);
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  while (Serial.available() > 0) {
    Serial.read();
  }

  irsend.begin();

  Serial.println();
  Serial.println(F("=== BOOT OK (emit) ==="));
  printMenu();
}

void loop() {
  if (!Serial.available()) {
    return;
  }

  const char key = static_cast<char>(Serial.read());

  switch (key) {
    case '1':
      emitByIndex(0);
      break;
    case '2':
      emitByIndex(1);
      break;
    case '3':
      emitByIndex(2);
      break;
    case '4':
      emitByIndex(3);
      break;
    case 'm':
    case 'M':
      printMenu();
      break;
    default:
      break;
  }
}
