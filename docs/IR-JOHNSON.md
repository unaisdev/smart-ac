# IR — mando Johnson (Midea RG10)

Decisión de protocolo y límites del **replay RAW** (Fases 2–3). Plan general: [`PLAN.md`](PLAN.md).

## Decisión

| Aspecto | Elección |
| --- | --- |
| Librería | [IRremoteESP8266](https://github.com/crankyoldgit/IRremoteESP8266) (decode en captura) |
| Emisión Fase 3 (POC) | **RAW replay** (`irsend.sendRaw`) desde `firmware/esp32/captures/` |
| Encoder de librería | **No** para temp± repetidos — ver pendiente abajo |

El decoder etiqueta tramas como **COOLIX** (24 bits) o **BOSCH144** (144 bits). Esos nombres vienen de la librería, no de la marca del aire.

## Comportamiento del mando

- Cada pulsación envía **estado completo** del aire (power, modo, temperatura, etc.), no un comando abstracto tipo “+1°C”.
- **ON/OFF** con recaptura en el estado correcto son relativamente estables (COOLIX / BOSCH144 según encendido/apagado).
- **Temp+** suele salir **COOLIX** (ej. `0xB2BF50` en una captura concreta).
- **Temp−** puede salir **BOSCH144** en la primera pulsación desde un estado dado y **COOLIX** en la siguiente (ej. `0xB2BF60` tras bajar ya 1°C). Ver `firmware/esp32/captures/temp-down-step2-coolix.txt`.
- El código COOLIX **cambia con la temperatura** (ej. `0xB2BF50` → `0xB2BF60`, +`0x10` en el último byte en un ejemplo).

## Límite del POC (replay RAW)

Una captura por botón solo funciona **mientras el aire siga en el mismo estado** que cuando se capturó. Tras cambiar temperatura (mando físico o ESP32), hay que **recapturar** o **generar** la trama.

Capturas y emisor: `firmware/esp32/captures/`, entorno PlatformIO `esp32dev-emit`.

## Pendiente — generación COOLIX con estado en ESP32

**Prioridad:** después de WiFi + MQTT (Fases 4–5), antes de control fiable desde app/backend.

**Objetivo:** el firmware mantiene un `AcState` interno (power, mode, temp, fan, …) y **construye** la trama IR en lugar de repetir un RAW fijo.

**Tareas (borrador):**

1. Mapear bits COOLIX / tramas largas para el Johnson RG10 (capturas por grado y modo en `captures/`, o probar `IRMideaAC` / familia Midea en IRremoteESP8266).
2. Sincronizar estado interno con el aire real al arrancar (asumir último `desiredState` por MQTT o forzar recaptura / “sync” manual).
3. Sustituir teclas `3`/`4` del emisor serial por `setState({ temp: N })` → encoder → `sendRaw` o `sendCOOLIX`.
4. Cuando MQTT esté activo: `subscribe command` → actualizar estado → emitir trama generada → `publish state` con `desiredState` (sin fingir `reportedState`).

**No hacer en el POC:** inventar el protocolo a ciegas; usar capturas y decoders existentes como evidencia.

## Referencias en repo

- Capturas: `firmware/esp32/captures/`
- Regenerar emisor: `firmware/esp32/tools/regenerate_signals.py`
- Montaje: [`MATERIALS.md`](MATERIALS.md)
