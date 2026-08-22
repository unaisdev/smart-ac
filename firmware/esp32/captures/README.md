# Capturas IR — mando Johnson

Cada botón tiene un `.txt` con el RAW completo y una entrada en `manifest.json`.

En firmware, los botones **activos** para emitir están en `include/captured_signals.h` + `src/emit/signals_data.cpp` (solo los que probamos en Fase 3).

## Botones capturados

| ID | Botón | Protocolo | Código | ¿En emisor? |
| --- | --- | --- | --- | --- |
| `power-off` | Apagar | COOLIX (24b) | `0xB27BE0` | Sí (tecla `1`) |
| `power-on` | Encender | BOSCH144 (144b) | RAW recaptura | Sí (tecla `2`) |
| `temp-up` | Subir temperatura | COOLIX (24b) | `0xB2BF50` | Sí (tecla `3`) — recaptura 2026-08-23 |
| `temp-down` | Bajar temperatura | BOSCH144 (144b) | RAW recaptura | Sí (tecla `4`) — recaptura 2026-08-23 |

---

## Cómo añadir un botón nuevo (futuro)

### 1. Capturar (Fase 1)

1. Firmware `esp32dev` + monitor o `tools/capture_monitor.py`.
2. Pulsa **un solo** botón del mando.
3. Guarda el bloque `--- Señal recibida ---` … `--- Fin captura ---`.

### 2. Documentar

1. Crea `captures/<id>.txt` (ej. `mode-cool.txt`).
   - `id` en kebab-case, inglés corto: `fan-speed`, `swing-on`.
2. Añade entrada en `captures/manifest.json`:

```json
{
  "id": "mode-cool",
  "label": "Modo frío (COOL)",
  "protocol": "COOLIX",
  "code": "0x........",
  "bits": 24,
  "file": "mode-cool.txt"
}
```

3. Actualiza la tabla de este README.

### 3. Elegir estrategia de emisión

| Si en captura ves… | Estrategia | En código |
| --- | --- | --- |
| `Protocolo: COOLIX` + `Codigo: 0xXXXXXX` (24 bits) | `EmitStrategy::Coolix24` | `coolixCode = 0x…` |
| `Protocolo: BOSCH144` o trama larga / 144 bits | `EmitStrategy::RawReplay` | Copia el array RAW a `signals_data.cpp` |
| `Protocolo: UNKNOWN` o emisión COOLIX no mueve el aire | `EmitStrategy::RawReplay` | Siempre funciona si el RAW es bueno |

Regla práctica: **empieza por COOLIX si es 24 bits**; si el aire no reacciona, pasa a **RAW replay**.

### 4. Mapear en firmware

Edita `src/emit/signals_data.cpp`:

```cpp
{"mode-cool", "Modo frio", EmitStrategy::Coolix24, 0x........, nullptr, 0},
```

Si usas RAW, añade `const uint16_t kModeCoolRaw[] = { ... };` y referencia en la entrada.

Edita `src/emit/main.cpp`: añade tecla en el menú (ej. `5`) que llame a `emitByIndex(4)` o `emitSignal(*findSignalById("mode-cool"))`.

### 5. Probar

1. Monta LED IR en **GPIO 4** (ver `docs/MATERIALS.md`).
2. `pio run -e esp32dev-emit -t upload`
3. Monitor 115200 → pulsa la tecla → mira si el aire responde.
4. Si no: acerca el LED, comprueba polaridad, prueba RAW en lugar de COOLIX.

### 6. Mantener alineados

Siempre **tres sitios** con el mismo `id`:

- `captures/<id>.txt`
- `manifest.json`
- `signals_data.cpp` (+ menú en `main.cpp`)

---

## Notas del mando actual (Johnson)

- Marca **Johnson** en aires y mando original; los nombres **COOLIX** / **BOSCH144** vienen del decoder IRremoteESP8266, no de la marca.
- Cada pulsación manda **estado completo** (encendido, modo, temp, etc.), no un “+1°C” genérico reutilizable.
- **Temp+** suele salir **COOLIX 24b** (ej. `0xB2BF50` en una captura concreta).
- **Temp−** puede salir **BOSCH144** en la *primera* pulsación desde un estado dado, y **COOLIX** en la siguiente (ej. `0xB2BF60` tras bajar ya 1°C). Ver `temp-down-step2-coolix.txt`.
- Los códigos COOLIX cambian con la temperatura: `0xB2BF50` → `0xB2BF60` (+`0x10` en el último byte en un ejemplo) no es el mismo botón “fijo”.
- **Consecuencia para Fase 3 (replay RAW):** una captura por botón solo funciona **mientras el aire siga en el mismo estado** que cuando capturaste. Tras cambiar temp con el mando o con el ESP32, hay que **recapturar** o pasar a **generar tramas** (seguir estado en firmware / `IRMideaAC` en IRremoteESP8266).
- ON/OFF recapturados con el aire en el estado correcto suelen ser más estables que temp± repetidos.
- Generación COOLIX con estado en ESP32 (no más recapturas por grado): [`docs/IR-JOHNSON.md`](../../docs/IR-JOHNSON.md).

## Añadir capturas rápido

Pega en el chat: **nombre del botón** + bloque de consola. Se crean/actualizan `.txt`, `manifest.json` y (cuando toque) el mapeo en firmware.
