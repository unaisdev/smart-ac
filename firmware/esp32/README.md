# `firmware/esp32`

Firmware del ESP32-WROOM-32 (DevKit V1).

**Camino V1 soportado:** capturar el mando → emitir **power on/off** por serial → WiFi + MQTT que solo dispara IR de **encender/apagar**.

Temp, modo y fan **no** forman parte de V1. El encoder COOLIX / protocolo Johnson es post-V1: [`docs/IR-JOHNSON.md`](../../docs/IR-JOHNSON.md).

Conexionado: [`MATERIALS.md`](../../docs/MATERIALS.md). Plan: [`PLAN.md`](../../docs/PLAN.md).

Credenciales WiFi/MQTT **nunca** se suben a Git (`include/secrets.h` está en `.gitignore`).

---

## 1. Capturar el mando (`esp32dev`)

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

## 2. Emisor serial (`esp32dev-emit`) — V1: power on/off

Capturas en [`captures/`](captures/). Las de **power-on** / **power-off** son el camino de producto V1. Los `temp-*.txt` se conservan para investigación post-V1; no los borres.

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
4. Monitor 115200.

| Tecla | Acción | V1 |
| --- | --- | --- |
| `1` | Apagar (`power-off`) | **Soportado** |
| `2` | Encender (`power-on`) | **Soportado** |
| `3` | Subir temp (`temp-up`) | Post-V1 (research) |
| `4` | Bajar temp (`temp-down`) | Post-V1 (research) |

Power (`1`/`2`): **3** envíos RAW. Temp (`3`/`4`): **1** envío — replay RAW de un clic; no es el camino de producto V1.

Protocolo / encoder de temperatura: [`docs/IR-JOHNSON.md`](../../docs/IR-JOHNSON.md) (post-V1).

Regenerar `signals_data.cpp` tras cambiar capturas:

```bash
python3 tools/regenerate_signals.py
```

### Volver a capturar

Entorno **`esp32dev`** + upload (firmware de recepción).

---

## 3. WiFi + MQTT (`esp32dev-mqtt`) — V1: solo power

Entorno **`esp32dev-mqtt`**: WiFi, broker MQTT y emisión IR de **encender/apagar**. `setState` **solo lee `state.power`**; el resto de campos se ignora.

### Credenciales locales

```bash
cp include/secrets.h.example include/secrets.h
# Edita include/secrets.h (no se sube a Git)
```

Debe coincidir con tu Mosquitto local (ver `.env.example` en la raíz del monorepo).

### Subir firmware MQTT

```bash
pio run -e esp32dev-mqtt -t upload
pio device monitor -b 115200
```

Monitor: `=== BOOT OK (mqtt) ===`, IP WiFi, `MQTT: connected`.

### Topics (controller `ac-controller`)

| Topic | Dirección |
| --- | --- |
| `smartac/device/ac-controller/command` | ESP32 subscribe |
| `smartac/device/ac-controller/state` | ESP32 publish respuesta |
| `smartac/device/ac-controller/status` | ESP32 publish `{"online":true}` (LWT offline) |

### Probar con Mosquitto

Con el broker en marcha (`docker compose` o Mosquitto local):

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 -u smartac -P smartac \
  -t smartac/device/ac-controller/command \
  -m '{"deviceId":"ac-salon","command":"setState","requestId":"test-1","state":{"power":true}}'
```

Apagar: mismo mensaje con `"power":false`.

Campos extra en `state` (mode, temperature, fan, …) se aceptan en el JSON y **se ignoran**. Temp/modo/fan por IR es post-V1: [`docs/IR-JOHNSON.md`](../../docs/IR-JOHNSON.md).

Payloads: [`docs/SPECS.md`](../../docs/SPECS.md) §8.
