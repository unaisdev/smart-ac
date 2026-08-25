# Especificación — Smart AC

Documento de **qué** y **por qué**. El orden de implementación está en [`PLAN.md`](PLAN.md). Los componentes físicos están en [`MATERIALS.md`](MATERIALS.md).

Estado: **V1** — encender y apagar dos aires Johnson (familia Midea RG10) desde Telegram. Sin servidor público. Expo no es cliente V1.

---

## 1. Objetivo (V1)

Sistema open source para **encender y apagar** dos unidades de aire acondicionado (mando IR Johnson / familia **RG10**) desde un bot de Telegram.

El sistema usa **solo infrarrojos**. No se modifica eléctricamente el aire.

Cualquiera con un ESP32, un VS1838B y un LED IR 940 nm debe poder reproducir el montaje.

El backend corre **en casa**. Telegram usa **long polling** (el proceso llama hacia `api.telegram.org`). El ESP32 sale hacia MQTT. No hace falta IP pública, webhook ni VM en la nube.

---

## 2. Fuera de alcance (V1)

- Modo, temperatura, ventilador, swing, turbo, eco, LED, clean.
- Programas horarios.
- App Expo como cliente soportado (el código puede existir para más adelante; no es camino de producto).
- Webhook de Telegram, túneles, Oracle Always Free.
- Abrir el aire, soldar UART o sustituir la placa.
- Afirmar estado real del aparato solo con IR.
- Home Assistant, escenas, estadísticas y sensores de ambiente.
- Exponer MQTT a Internet sin autenticación.
- Hablar MQTT desde la app móvil.

Esas piezas van a **post-V1**.

---

## 3. Arquitectura

Control **en casa y en remoto** (Telegram llega al móvil por la nube de Telegram). El backend y el broker MQTT viven en la LAN. El ESP32 mantiene una conexión **saliente** MQTT. El bot mantiene una conexión **saliente** a Telegram.

```text
                    Telegram Cloud
                          ▲
                   long polling
                          │
                    Backend API
                    (casa, Fastify)
                          │
                         MQTT
                          │
                        ESP32
                          │
                          IR
                ┌─────────┴─────────┐
                ▼                   ▼
             AC #1               AC #2
            Johnson             Johnson
```

### Regla de desacoplamiento

Nunca acoplar Telegram al código IR.

```text
Incorrecto:  Telegram → IR

Correcto:    Telegram
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

### Transporte sustituible

IR no es la solución definitiva. El backend no debe saber qué transporte hay detrás:

```ts
interface AirConditionerTransport {
  connect(): Promise<void>;
  setState(deviceId: string, state: AirState): Promise<void>;
  getState(deviceId: string): Promise<AirState | undefined>;
}
```

Implementaciones:

| Transporte | Cuándo |
| --- | --- |
| `MockAirConditionerTransport` | Desarrollo sin hardware |
| `IrTransport` | V1 (MQTT → ESP32 → IR) |
| `MideaLocalTransport` | Futuro |

---

## 4. Hardware

Ver lista completa, pines y presupuesto en [`MATERIALS.md`](MATERIALS.md).

| Pieza | Uso |
| --- | --- |
| ESP32-WROOM-32 / DevKit V1 | Controlador |
| VS1838B (~38 kHz) | Escuchar el mando original (captura) |
| LED IR 940 nm | Enviar órdenes al aire |

Etapa de emisión: resistencia primero; transistor NPN para alcance.

---

## 5. Protocolo IR

El mando es familia **Midea RG10** (Johnson). Cada pulsación envía **estado completo**, no un comando abstracto.

**V1 no elige** modo ni temperatura. Encender reproduce la captura `power-on`; apagar reproduce `power-off`. El aire queda en el setpoint que tenía esa captura. Detalle de protocolo: [`IR-JOHNSON.md`](IR-JOHNSON.md).

Prioridad: librería existente (IRremoteESP8266) o replay RAW. No inventar la trama.

Estado de producto V1:

```ts
interface AirState {
  power: boolean;
}
```

MQTT y la API solo transportan `power`. El frame IR completo vive en las capturas RAW del firmware.

---

## 6. Dos aires

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

Un emisor o dos, según alcance.

---

## 7. Firmware ESP32

Responsabilidades V1:

- WiFi y MQTT, reconexión no bloqueante.
- Recibir `setState` y emitir IR de **power on/off** (RAW).
- Publicar ack / status. No fingir `reportedState`.
- No bloquear el loop principal.

Credenciales **nunca** en Git (`secrets.h` ignorado).

---

## 8. MQTT

Broker **Mosquitto**, en la red local (Compose). No exponer 1883 a Internet.

```text
smartac/device/ac-controller/command
smartac/device/ac-controller/state
smartac/device/ac-controller/status
```

Comando V1:

```json
{
  "deviceId": "ac-salon",
  "command": "setState",
  "state": { "power": true },
  "requestId": "uuid"
}
```

`success: true` significa **comando enviado**, no “el aire ejecutó la orden”. El firmware **solo lee `state.power`**.

---

## 9. Estado deseado vs estado real

Con IR **no sabemos** si el aire ejecutó la orden.

| Campo | Significado |
| --- | --- |
| `desiredState` | Última orden que el sistema envió (`{ power }`) |
| `reportedState` | Confirmado por el aparato. Con IR puro: `null` |

Copy: `Última orden: ON` / `Última orden: OFF`. Nunca “el aire está encendido” solo porque se envió IR.

---

## 10. Backend

Única pieza que conoce Telegram, MQTT, dispositivos y estado.

Stack: Node.js 22 LTS, TypeScript, Fastify, `mqtt.js`, SQLite, grammY **en el mismo proceso**. Detalle: [`BACKEND.md`](BACKEND.md). Camino 0 € en casa: [`DEPLOY.md`](DEPLOY.md).

### API REST V1

```http
GET  /health
GET  /api/air-conditioners
GET  /api/air-conditioners/:id
POST /api/air-conditioners/:id/power
GET  /api/events
```

`POST /api/air-conditioners/:id/power`:

```json
{ "power": true }
```

`GET /health` no exige secreto. El resto de `/api/*` usa `Authorization: Bearer <API_SECRET>`.

Antes del ESP32: `MockAirConditionerTransport`.

---

## 11. Bot de Telegram (cliente V1)

Long polling. Comandos: `/start` `/help` `/airs` `/status`. UI con **botones inline**.

```text
🏠 Smart AC

Selecciona un aire:

[ 🛋 Salón ]
[ 🛏 Dormitorio ]
```

```text
🛋 Salón

Última orden: ON

[ 🔴 Apagar ]
[ 🔄 Actualizar ]
[ ⬅️ Aires ]
```

### Seguridad

```env
TELEGRAM_ALLOWED_USER_IDS=123456789,987654321
```

Autorización **solo por Telegram user ID**. Usuario no autorizado:

```text
⛔ No tienes permiso para controlar estos dispositivos.
```

---

## 12. App React Native + Expo (fuera de V1)

El código puede vivir en `apps/mobile` para no romper el monorepo. **No es cliente soportado** en V1: el teléfono tendría que alcanzar la API (LAN o URL pública). Telegram sí funciona desde fuera de casa sin IP pública.

Post-V1: misma API, mismo `AirState`.

---

## 13. Tipos compartidos

Viven en `packages/shared`. Canónico V1: `AirState { power: boolean }`.

---

## 14. Docker

Compose local: backend + Mosquitto (1883 en la red Docker). El ESP32 no va en Docker.

---

## 15. Seguridad

Nunca:

- exponer MQTT a Internet sin autenticación
- guardar contraseñas, tokens o IDs reales en Git
- permitir que cualquier usuario de Telegram controle los dispositivos
- abrir puertos innecesarios del router

Variables: [`.env.example`](../.env.example) y [`BACKEND.md` §7](BACKEND.md).

---

## 16. V1 está terminada cuando

- [ ] ESP32 conectado a WiFi y MQTT (o mock para desarrollar el bot)
- [ ] Replay IR de power on/off; el aire responde
- [ ] Backend + `POST .../power`
- [ ] Telegram (long polling) enciende y apaga AC #1 y #2, con whitelist
- [ ] Copy de “última orden”, nunca estado confirmado sin `reportedState`
- [ ] El proyecto funciona con `MockTransport` sin hardware

---

## 17. Post-V1

Temperatura, modo, ventilador, swing, programas, Expo como producto, webhook, hosting público, encoder COOLIX con estado, transporte Midea local.

---

## 18. Resultado esperado

El usuario abre Telegram (en casa o fuera) y enciende o apaga los dos aires. El backend y el ESP32 están en casa. **No hay que abrir puertos** ni alquilar un servidor.
