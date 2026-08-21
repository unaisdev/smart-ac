# Especificación — Smart AC

Documento de **qué** y **por qué**. El orden de implementación está en [`PLAN.md`](PLAN.md). Los componentes físicos están en [`MATERIALS.md`](MATERIALS.md).

Estado: **borrador para construir**. Aún no hay código.

---

## 1. Objetivo

Crear un sistema open source para controlar **dos unidades de aire acondicionado Midea** desde:

1. Un bot de Telegram.
2. Una aplicación móvil React Native con Expo.
3. Opcionalmente, más adelante, una API/web.

Los aires usan mando IR de la familia **RG10**, con funciones como Power, Mode (Cool, Heat, Dry, Fan, Auto), temperatura, velocidad de ventilador, Swing, Turbo, Eco/Gear, Timer, LED, Clean y otras vía SET.

El sistema inicial usa **solo infrarrojos**. No se modifica eléctricamente el aire.

Cualquiera con un ESP32, un VS1838B y un LED IR 940 nm debe poder reproducir el montaje.

---

## 2. Fuera de alcance (MVP)

- Abrir el aire, soldar UART o sustituir la placa.
- Afirmar estado real del aparato solo con IR.
- Home Assistant, escenas, estadísticas y sensores de ambiente.
- Exponer MQTT a Internet sin autenticación.
- Expo Router, salvo que más adelante sea necesario.
- Hablar MQTT desde la app móvil.

---

## 3. Arquitectura

La arquitectura debe permitir control **en casa y en remoto**, sin abrir puertos del router. El ESP32 mantiene una conexión **saliente** MQTT.

```text
                         INTERNET
                            │
              ┌─────────────┴─────────────┐
              │                           │
         Telegram Bot                Expo App
              │                           │
              └─────────────┬─────────────┘
                            │
                       Backend API
                            │
                           MQTT
                            │
                      ┌─────┴─────┐
                      │   ESP32   │
                      └─────┬─────┘
                            │
                     IR transmitter
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
             AC #1                   AC #2
             Midea                   Midea
```

### Regla de desacoplamiento

Nunca acoplar Telegram (ni Expo) al código IR.

```text
Incorrecto:  Telegram → IR

Correcto:    Telegram / Expo
                 ↓
           AirConditionerService
                 ↓
              Transport
                 ↓
               MQTT
                 ↓
              ESP32
                 ↓
                IR
```

Telegram y la app usan exactamente la misma lógica de negocio.

### Transporte sustituible

IR no es la solución definitiva. El backend no debe saber qué transporte hay detrás:

```ts
interface AirConditionerTransport {
  connect(): Promise<void>;
  setState(deviceId: string, state: AirState): Promise<void>;
  getState(deviceId: string): Promise<AirState | undefined>;
}
```

Implementaciones previstas:

| Transporte | Cuándo |
| --- | --- |
| `MockAirConditionerTransport` | Desarrollo sin hardware |
| `IrTransport` | MVP (MQTT → ESP32 → IR) |
| `MideaLocalTransport` | Futuro (dongle WiFi / protocolo local / UART) |

Investigar más adelante: WiFi dongle Midea, protocolo local, UART/bus interno, ESPHome Midea.

---

## 4. Hardware

Ver lista completa, pines y presupuesto en [`MATERIALS.md`](MATERIALS.md).

### Obligatorio

| Pieza | Uso |
| --- | --- |
| ESP32-WROOM-32 / DevKit V1 | Controlador. No hace falta ESP32-S3 al inicio. |
| VS1838B (~38 kHz) | Escuchar el mando original. |
| LED IR 940 nm | Enviar órdenes al aire. |

El usuario dispone de un kit con VS1838B, otros receptores IR y LEDs 940 nm: **ese kit es válido** para el prototipo.

### Prototipado

Breadboard, cables Dupont, USB para alimentar y programar el ESP32.

### Etapa de emisión

- Primera prueba: LED IR + resistencia.
- Versión definitiva: transistor NPN (2N2222 o BC337) + resistencia de base + resistencia limitadora del LED.

El transistor aumenta potencia y alcance.

---

## 5. Protocolo IR

### Primer objetivo técnico (antes de Telegram o Expo)

```text
Mando Midea  →  IR  →  VS1838B  →  ESP32
```

El ESP32 debe recibir las órdenes reales. No asumir que se detectan de golpe propiedades como POWER, MODE=COOL, TEMP=24, FAN=AUTO, SWING=ON, TURBO=OFF. Primero hay que **capturar**.

### Identificación

El mando parece familia **Midea RG10**.

Prioridad:

1. Usar una implementación Midea existente si es compatible (ESPHome Midea IR, IRremote / IRremoteESP8266).
2. Si no es compatible, capturar las señales del mando.
3. Analizarlas.
4. Crear encoder/decoder propio solo si hace falta.

No implementar un protocolo desde cero si ya hay soporte. No inventar la trama. No asumir que una señal recibida es “un botón”: analizar la estructura real.

### Estado completo, no teclas sueltas

Muchos mandos de AC envían una **trama con el estado entero**, no un comando aislado. Pulsar “24 °C / COOL / FAN AUTO / SWING ON” puede emitir todo eso a la vez.

El sistema mantiene internamente:

```ts
interface AirState {
  power: boolean;
  mode: AirMode;
  temperature: number;
  fan: FanSpeed;
  swing: boolean;
  turbo: boolean;
  eco: boolean;
  clean: boolean;
  led: boolean;
}

type AirMode = 'auto' | 'cool' | 'dry' | 'heat' | 'fan';
type FanSpeed = 'auto' | 'low' | 'medium' | 'high';
```

No implementar comandos aislados si el protocolo exige construir la trama completa.

### Modo aprendizaje

Flujo:

1. El sistema pide pulsar un botón del mando original.
2. El VS1838B recibe la señal.
3. El ESP32 la captura.
4. Se almacena e identifica.
5. Se puede reproducir después.

Almacenamiento inicial RAW:

```ts
interface RawIrCommand {
  deviceId: string;
  name: string;
  data: number[];
  frequency: number;
}
```

Ejemplos de etiquetas: `LEARN POWER`, `LEARN COOL`, `LEARN HEAT`, `LEARN TEMP_24`, `LEARN FAN_AUTO`.

---

## 6. Dos aires

Dispositivos iniciales:

```text
ac-salon        nombre: Salón         ubicación: Salón
ac-dormitorio   nombre: Dormitorio    ubicación: Dormitorio
```

```ts
interface AirConditioner {
  id: string;
  name: string;
  location: string;
}
```

El ESP32 puede tener:

- **Dos emisores IR** (uno hacia cada aparato), si están en posiciones distintas.
- **Un solo emisor**, si ambos reciben bien desde el mismo sitio.

La arquitectura debe permitir las dos opciones.

---

## 7. Firmware ESP32

Responsabilidades:

- Conectarse a WiFi y a MQTT.
- Recibir comandos y ejecutar IR.
- Mantener configuración local.
- Publicar estado.
- Modo aprendizaje.
- Registrar errores.
- Reconectar WiFi/MQTT automáticamente.
- **No bloquear** el loop principal.

Configuración (nunca en el repositorio):

```env
WIFI_SSID=
WIFI_PASSWORD=
MQTT_HOST=
MQTT_PORT=
MQTT_USERNAME=
MQTT_PASSWORD=
DEVICE_ID=
```

---

## 8. MQTT

Comunicación backend ↔ ESP32. El broker preferente es **Mosquitto**.

Temas de ejemplo:

```text
smartac/device/ac-controller/command
smartac/device/ac-controller/state
smartac/device/ac-controller/status
```

Comando:

```json
{
  "deviceId": "ac-salon",
  "command": "setState",
  "state": {
    "power": true,
    "mode": "cool",
    "temperature": 24,
    "fan": "auto",
    "swing": false,
    "turbo": false,
    "eco": true
  },
  "requestId": "uuid"
}
```

Respuesta:

```json
{
  "deviceId": "ac-salon",
  "requestId": "uuid",
  "success": true,
  "state": {
    "power": true,
    "mode": "cool",
    "temperature": 24,
    "fan": "auto",
    "swing": false,
    "turbo": false,
    "eco": true
  }
}
```

Nunca exponer el broker a Internet sin autenticación.

---

## 9. Estado deseado vs estado real

Con IR **no sabemos** si el aire ejecutó la orden.

| Campo | Significado |
| --- | --- |
| `desiredState` | Última orden que el sistema envió |
| `reportedState` | Estado confirmado por el aparato (al inicio: desconocido) |

```text
Orden enviada:  AC Salón → COOL 24 °C
Resultado:      commandSent = true
                actualState = unknown
```

No decirle al usuario que el aire está encendido solo porque se envió IR.

Si más adelante hay feedback por protocolo Midea interno/WiFi, entonces sí se puede rellenar `reportedState`.

En la UI, un indicador verde **no** significa “confirmado por el aire”. Si solo hay estado deseado, mostrar algo como: `Última orden: COOL · 24 °C`.

---

## 10. Backend

Única pieza que conoce Telegram, MQTT, dispositivos, usuarios, estados y configuración.

Implementación (módulos, env, qué no entra en el MVP): [`BACKEND.md`](BACKEND.md). Dónde corre 24/7: [`DEPLOY.md`](DEPLOY.md).

Stack:

- Node.js 22 LTS + TypeScript
- Fastify (API REST + webhook de Telegram, **un proceso**)
- MQTT (`mqtt.js`) + SQLite
- Telegram Bot API (grammY o Telegraf, mismo proceso)

### Base de datos (prototipo)

SQLite es suficiente. Tablas previstas:

```text
air_conditioners
users
telegram_users
commands
device_status
ir_commands
```

No hace falta un esquema complejo al inicio.

### API REST mínima

```http
GET  /api/air-conditioners
GET  /api/air-conditioners/:id
POST /api/air-conditioners/:id/power
POST /api/air-conditioners/:id/state
POST /api/air-conditioners/:id/temperature
POST /api/air-conditioners/:id/mode
POST /api/air-conditioners/:id/fan
POST /api/air-conditioners/:id/swing
```

Ejemplo `POST /api/air-conditioners/ac-salon/state`:

```json
{
  "power": true,
  "mode": "cool",
  "temperature": 24,
  "fan": "auto",
  "swing": true,
  "turbo": false,
  "eco": true
}
```

### Mock

Antes de tener el ESP32, existe `MockAirConditionerTransport` para probar Telegram, Expo, API y base de datos sin hardware.

---

## 11. Bot de Telegram

Comandos mínimos (pero la UI preferida son **botones inline**, no teclear):

```text
/start  /help  /airs  /status
/on     /off   /cool  /heat
/temp   /fan   /swing /turbo  /eco
```

### Interfaz

Pantalla de selección:

```text
🏠 Smart AC

Selecciona un aire:

[ 🛋 Salón ]
[ 🛏 Dormitorio ]
```

Control de un aire:

```text
🛋 Salón

Estado deseado:
❄️ COOL
🌡 24°C
🌀 AUTO
↕️ SWING OFF

[ 🔴 Apagar ]

[ ❄️ Frío ] [ 🔥 Calor ]
[ ➕ ] [ 24°C ] [ ➖ ]

[ 🌀 Ventilador ]
[ ↕️ Swing ]
[ ⚡ Turbo ]
[ 🌱 Eco ]

[ 🔄 Actualizar ]
```

Resultado esperado al abrir el bot:

```text
🏠 Mis aires

🛋 Salón
❄️ COOL · 24°C

🛏 Dormitorio
⏻ OFF
```

Y poder controlar: ON/OFF, COOL, HEAT, DRY, AUTO, FAN, 16–30 °C, FAN AUTO/LOW/MED/HIGH, SWING, TURBO, ECO, LED, CLEAN.

### Seguridad

Cualquiera no puede controlar los aires.

```env
TELEGRAM_ALLOWED_USER_IDS=123456789,987654321
```

Middleware `isAuthorizedTelegramUser()`. Autorización **solo por Telegram user ID**, nunca por username.

Usuario no autorizado:

```text
⛔ No tienes permiso para controlar estos dispositivos.
```

---

## 12. App React Native + Expo

App independiente, TypeScript. Consume **la misma API** que Telegram. No habla MQTT.

```text
Expo → REST API → Backend → MQTT → ESP32
```

No usar Expo Router salvo que sea necesario.

### Pantallas

**Selección**

```text
Mis aires

🟢 Salón
   Última orden: COOL · 24°C

🟢 Dormitorio
   Última orden: OFF
```

**Mando**

```text
Smart AC
┌─────────────────────────┐
│ 🛋 Salón                │
│        ❄️ COOL          │
│          24°C           │
│      −           +      │
│ AUTO   ❄️   🔥   💧    │
│ Fan: AUTO               │
│ [AUTO] [LOW] [MED] [HI] │
│ ↕ Swing       🌱 Eco    │
│ ⚡ Turbo       💡 LED   │
│       ⏻ OFF             │
└─────────────────────────┘
```

### Componentes reutilizables

```text
AirConditionerCard
TemperatureControl
ModeSelector
FanSelector
PowerButton
SwingButton
TurboButton
EcoButton
LedButton
AirConditionerSelector
ConnectionStatus
```

### Estado frontend

Zustand, o React Context si el proyecto sigue siendo pequeño.

```ts
interface AirConditionerViewModel {
  id: string;
  name: string;
  desiredState: AirState;
  reportedState?: AirState;
  online: boolean;
}
```

### Capa API

No hacer `fetch` desde componentes.

```text
src/api/client.ts
src/api/airConditioners.ts
```

```ts
getAirConditioners()
getAirConditioner(id)
setAirConditionerState(id, state)
setPower(id, power)
setTemperature(id, temperature)
```

### Actualización

La app consulta `GET /api/air-conditioners` y refresca manualmente.

Opcional posterior: WebSocket (ESP32 → MQTT → Backend → WebSocket → Expo) para cambios inmediatos.

---

## 13. Tipos compartidos

Viven en `packages/shared`. Backend, Telegram y Expo los reutilizan. Definición canónica: `AirState`, `AirMode`, `FanSpeed` (sección 5).

---

## 14. Docker

Compose local (desarrollo):

```text
docker compose
  ├── backend      # Fastify + Telegram, volumen SQLite
  └── mosquitto    # 1883 solo en la red Docker
```

Producción (Oracle Always Free): Caddy + backend + Mosquitto TLS 8883. Detalle en [`DEPLOY.md`](DEPLOY.md).

El ESP32 se conecta al broker por WiFi (red local o MQTT remoto autenticado). No va en Docker.

---

## 15. Temporizadores (posterior al MVP)

El **backend** ejecuta los timers. No depender del móvil.

```ts
interface AirConditionerTimer {
  id: string;
  airConditionerId: string;
  action: 'on' | 'off' | 'setState';
  executeAt: string;
  state?: AirState;
  enabled: boolean;
}
```

Ejemplos: Dormitorio apagar a las 01:30; Salón encender a las 18:00 en Cool 24 °C.

---

## 16. Seguridad

Nunca:

- exponer MQTT a Internet sin autenticación
- guardar contraseñas, tokens o IDs reales en Git
- permitir que cualquier usuario de Telegram controle los dispositivos
- abrir puertos innecesarios del router

Variables (ver [`.env.example`](../.env.example) y [`BACKEND.md` §7](BACKEND.md)):

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USER_IDS=
MQTT_USERNAME=
MQTT_PASSWORD=
DATABASE_URL=
API_SECRET=
PUBLIC_BASE_URL=
WIFI_SSID=
WIFI_PASSWORD=
```

---

## 17. MVP

El MVP está terminado cuando:

- [ ] ESP32 conectado a WiFi
- [ ] VS1838B recibe el mando original
- [ ] Se identifica el protocolo
- [ ] ESP32 puede enviar IR
- [ ] El aire responde
- [ ] ESP32 controla AC #1
- [ ] ESP32 controla AC #2
- [ ] MQTT funciona
- [ ] Backend funciona
- [ ] Telegram funciona, con autorización por usuario
- [ ] Telegram permite power, temperatura, modo, ventilador y swing
- [ ] Expo consume la misma API y controla ambos aires
- [ ] El proyecto funciona con `MockTransport` sin hardware

---

## 18. Resultado esperado

El usuario abre Telegram (o la app Expo, misma API) y controla los dos aires en local y en remoto, **sin abrir puertos**, gracias a la conexión MQTT saliente del ESP32.

IR es el transporte del MVP. La aplicación no debe enterarse si un día se sustituye por Midea local / WiFi / UART.
