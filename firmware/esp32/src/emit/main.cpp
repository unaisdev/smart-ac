#include <Arduino.h>

#include "ir_emit.h"

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

void setup() {
  Serial.begin(115200);
  delay(2000);

  while (Serial.available() > 0) {
    Serial.read();
  }

  irEmitBegin();

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
      irEmitByIndex(0);
      break;
    case '2':
      irEmitByIndex(1);
      break;
    case '3':
      irEmitByIndex(2);
      break;
    case '4':
      irEmitByIndex(3);
      break;
    case 'm':
    case 'M':
      printMenu();
      break;
    default:
      break;
  }
}
