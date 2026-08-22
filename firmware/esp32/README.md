# `firmware/esp32`

Firmware del ESP32-WROOM-32 (DevKit V1): captura IR (Fase 1), luego WiFi, MQTT y emisión IR.

Conexionado: [`MATERIALS.md`](../../docs/MATERIALS.md). Plan: [`PLAN.md`](../../docs/PLAN.md).

Credenciales WiFi/MQTT **nunca** se suben a Git.

## Fase 1 — Capturar el mando

### Subir firmware

1. Abre esta carpeta en Cursor con PlatformIO.
2. **Cierra el Monitor serial** antes de subir.
3. Si ves basura repetida (`xxx`, `␀`), **borra la flash una vez**:
   ```bash
   pio run -t erase
   pio run -t upload
   ```
4. Pulsa **Upload** (si no acabas de borrar flash).
5. Abre **Monitor** (115200 baud) o usa el script de abajo.
6. Debes ver `=== BOOT OK ===`. Si no, pulsa **RST** en el ESP32.

### Guardado automatico

| Donde | Como |
| --- | --- |
| Mac (`captures/`) | Script Python mientras lees el serial (recomendado) |

El ESP32 **no puede** escribir directamente en tu carpeta del Mac.

#### Opcion recomendada — archivos en `captures/`

```bash
cd firmware/esp32
pip install pyserial
python tools/capture_monitor.py --port /dev/cu.usbserial-0001
```

Sustituye el puerto por el tuyo (el mismo que usa PlatformIO Monitor).

Cada captura se guarda sola en `captures/capture-YYYYMMDD-HHMMSS-01.txt`.

### Si ves simbolos raros (`xxx`, `␀`) que no paran

Eso casi siempre es **flash corrupta** o firmware reiniciando en bucle:

1. Cierra Monitor.
2. Terminal en `firmware/esp32`:
   ```bash
   pio run -t erase
   pio run -t upload
   ```
3. Abre Monitor y busca `=== BOOT OK ===`.
4. Comprueba baudios **115200**.
5. Prueba otro cable USB (con datos, no solo carga).

Si antes veias `COOLIX` y ahora solo basura, el **erase + upload** suele arreglarlo.

---

## Fase 3 — Probar emisor IR (4 botones actuales)

Capturas en [`captures/`](captures/). Como añadir más botones: [`captures/README.md`](captures/README.md).

### Cableado mínimo del LED IR

GPIO **4** → resistencia **220 Ω** → ánodo LED IR → cátodo → **GND**.

(Opcional mejor: transistor según [`MATERIALS.md`](../../docs/MATERIALS.md).) Apunta el LED al aire a 1–3 m.

**Quita el cable amarillo del receptor (GPIO 15)** si molesta; no hace falta para emitir.

### Subir firmware de emisión

1. Cierra Monitor.
2. En PlatformIO elige entorno **`esp32dev-emit`** (barra inferior).
3. Upload:
   ```bash
   pio run -e esp32dev-emit -t upload
   ```
4. Monitor 115200 → menú con teclas `1`–`4`.

| Tecla | Acción |
| --- | --- |
| `1` | Apagar |
| `2` | Encender |
| `3` | Subir temp |
| `4` | Bajar temp (RAW) |

Power (`1`/`2`): **3** envíos RAW. Temp (`3`/`4`): **1** envío (un clic del mando).

**Límite:** replay RAW solo sirve mientras el aire esté en el mismo estado que al capturar. Temp± repetidas requieren **generación COOLIX con estado** en el ESP32 — ver [`docs/IR-JOHNSON.md`](../../docs/IR-JOHNSON.md).

Regenerar `signals_data.cpp` tras cambiar capturas:

```bash
python3 tools/regenerate_signals.py
```

### Volver a capturar

Entorno **`esp32dev`** + upload (firmware de recepción).

