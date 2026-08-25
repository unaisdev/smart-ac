# Plan de desarrollo — Smart AC

Documento de **cómo** y **en qué orden**. El qué está en [`SPECS.md`](SPECS.md). Los componentes en [`MATERIALS.md`](MATERIALS.md).

**V1:** encender/apagar desde Telegram (long polling), backend en casa, ESP32 → IR RAW de power. Sin servidor público. Expo no es cliente V1.

Regla: **no construir todo de golpe**. Si un decoder existente funciona con el mando Johnson, reutilizarlo. Si no, captura RAW. No inventar el protocolo.

```text
1. ESP32 + IR receiver
2. Captura IR
3. IR transmitter (power on/off)
4. WiFi
5. MQTT (solo state.power)
6. Backend (POST .../power)
7. Telegram (long polling, encender/apagar)
```

---

## Fase 0 — Repositorio y docs

**Hecho cuando:**

- [x] README, CONTRIBUTING, LICENSE
- [x] SPECS, PLAN, MATERIALS, BACKEND, DEPLOY
- [x] Estructura `apps/`, `packages/`, `firmware/`, `docker/`
- [x] `.env.example` sin secretos
- [x] Docs alineadas con V1 (solo power + Telegram; Expo fuera)

---

## Fase 1 — Hardware: escuchar el mando

**Objetivo:** el ESP32 imprime (serial) que ha recibido una señal IR al pulsar el mando Johnson.

**Salida V1:** log RAW de power on/off de forma repetible.

---

## Fase 2 — Identificar el protocolo

**Hecho:** decisión en [`IR-JOHNSON.md`](IR-JOHNSON.md) (replay RAW en POC; encoder con estado pendiente / post-V1).

---

## Fase 3 — Emitir IR y mover el aire

**Objetivo V1:** encender y apagar **de verdad** (replay `power-on` / `power-off`).

Temp± y encoder COOLIX **no** entran en V1. Ver pendiente en [`IR-JOHNSON.md`](IR-JOHNSON.md).

**Salida:**

- [x] AC #1 responde (ON/OFF verificados)
- [ ] AC #2 responde
- [ ] Lista V1: solo power on/off verificado

---

## Fase 4 — WiFi

**Objetivo:** el ESP32 se une a la red y reconecta solo si cae. Credenciales nunca en Git.

---

## Fase 5 — MQTT

**Objetivo:** el ESP32 recibe `setState` con `{ power }` y dispara IR on/off.

```text
subscribe: smartac/device/+/command
publish:   smartac/device/+/state
           smartac/device/+/status
```

**Salida:** un `mosquitto_pub` enciende o apaga un aire. Publicar `success` + desired power (no fingir estado real).

---

## Fase 6 — Backend

**Objetivo:** API REST + `AirConditionerService` + transporte MQTT (y mock). Spec: [`BACKEND.md`](BACKEND.md).

**Salida V1:**

- [x] `curl` cambia power vía mock
- [ ] `curl` cambia un aire real si el ESP32 está en MQTT
- [x] Secretos solo por entorno
- [x] `GET /health` sin secreto

Endpoints V1: list/get + `POST .../power` + SSE. Sin temperature/mode/fan/swing/schedules.

---

## Fase 7 — Telegram (cliente V1)

**Objetivo:** encender y apagar los dos aires con botones inline, whitelist por user ID, **long polling**.

**Salida:**

- [x] Usuario autorizado controla AC #1 y #2 (mock; mando completo histórico — recortar a power)
- [x] Usuario no autorizado recibe el mensaje de permiso denegado
- [ ] Solo botones Encender/Apagar (quitar modo/temp/programas)
- [ ] Funciona contra ESP32

No webhook en V1.

---

## Fase 8 — Expo (fuera de V1)

El scaffold existe. **No es producto V1.** El teléfono tiene que alcanzar la API (LAN o URL pública). Telegram no.

Mantener el paquete compilando contra `AirState { power }`. Documentar como post-V1.

---

## Post-V1

- Temperatura, modo, fan, swing, turbo, eco, LED
- Programas horarios
- Expo como cliente (LAN o hosting público)
- Webhook Telegram, Oracle Always Free
- Encoder COOLIX / estado interno
- WebSocket, Home Assistant, `JohnsonLocalTransport`

---

## Trabajo en paralelo

| Carril | Puede empezar |
| --- | --- |
| Captura IR + firmware MQTT power | Fases 1–5 |
| Mock + API + Telegram long polling | En casa, sin IP pública |
| Encoder temp± | Post-V1 |
| Expo producto | Post-V1 |

---

## Stack

| Pieza | Elección |
| --- | --- |
| Monorepo | pnpm workspaces |
| Backend | Node.js 22 + Fastify (API + Telegram, un proceso) |
| Bot | grammY, long polling, mismo proceso |
| Móvil | Expo (código aparcado; no cliente V1) |
| Firmware | PlatformIO |
| Broker | Mosquitto 1883 local |
| DB | SQLite |
| V1 24/7 | Backend + Mosquitto **en casa** |

---

## Criterio para Cursor / agentes

Una fase o un recorte V1 por PR. No mezclar Expo producto con captura IR. No rellenar `reportedState` con el último comando enviado. No tratar Expo como cliente soportado en V1.
