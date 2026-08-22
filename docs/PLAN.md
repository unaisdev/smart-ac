# Plan de desarrollo — Smart AC

Documento de **cómo** y **en qué orden**. El qué está en [`SPECS.md`](SPECS.md). Los componentes en [`MATERIALS.md`](MATERIALS.md).

Regla: **no construir todo de golpe**. Cada fase debe ser usable sola antes de pasar a la siguiente. Si el protocolo Midea de una librería existente funciona, reutilizarlo. Si no, captura RAW. No inventar el protocolo.

Mientras el hardware no esté listo, las fases 5–7 pueden avanzar en paralelo usando `MockAirConditionerTransport`.

```text
1. ESP32 + IR receiver
2. Captura IR
3. IR transmitter
4. Control real del aire
5. WiFi
6. MQTT
7. Backend
8. Telegram
9. Expo
```

---

## Fase 0 — Repositorio y docs

**Objetivo:** este estado. Monorepo vacío + especificación pública.

**Hecho cuando:**

- [x] README, CONTRIBUTING, LICENSE
- [x] SPECS, PLAN, MATERIALS
- [x] BACKEND, DEPLOY (stack Fastify, Oracle Always Free)
- [x] Estructura `apps/`, `packages/`, `firmware/`, `docker/`
- [x] `.env.example` sin secretos

**No hacer:** instalar pnpm, escribir firmware, crear bots, inicializar Expo.

---

## Fase 1 — Hardware: escuchar el mando

```text
Mando original → IR → VS1838B → ESP32
```

**Objetivo:** el ESP32 imprime (serial) que ha recibido una señal IR al pulsar el mando Midea.

**Tareas:**

1. Montar ESP32 + VS1838B según [`MATERIALS.md`](MATERIALS.md).
2. Elegir entorno de firmware (PlatformIO / Arduino IDE) y documentarlo en `firmware/esp32/`.
3. Sketch mínimo: receptor IR, log de RAW (duraciones + frecuencia).
4. Pulsar POWER, MODE, temperatura, FAN, SWING y guardar capturas de ejemplo en `docs/` o `firmware/esp32/captures/` (sin datos personales).

**Salida:**

- [ ] Señal recibida de forma repetible
- [ ] Log RAW de al menos power on/off y un cambio de temperatura
- [ ] Foto o esquema del montaje actualizado si los pines reales difieren del doc

**No hacer todavía:** Telegram, WiFi, MQTT, emisor.

---

## Fase 2 — Identificar el protocolo

**Objetivo:** saber si las tramas son Midea conocido o hay que reproducir RAW.

**Tareas:**

1. Probar decoders existentes (IRremoteESP8266 Midea / ESPHome Midea IR).
2. Comparar con familia RG10.
3. Decidir: encoder de librería **o** almacén RAW + replay.
4. Confirmar si cada pulsación envía **estado completo** (hipótesis de la spec).

**Salida:**

- [ ] Decisión documentada en `docs/` (una página corta: “usamos librería X” o “replay RAW”)
- [ ] Si hay estado completo: mapa campo ↔ bits / o evidencia de que no

**No hacer:** implementar un protocolo de memoria.

---

## Fase 3 — Emitir IR y mover el aire

```text
ESP32 → LED IR (+ transistor) → Aire
```

**Objetivo:** encender/apagar y cambiar temperatura **de verdad**.

**Tareas:**

1. Montar etapa de emisión (resistencia sola primero; transistor después).
2. Replay de POWER y de un setpoint (p. ej. COOL 24 °C).
3. Ajustar alcance, ángulo y alimentación del LED.
4. Repetir con el segundo aire, o con el segundo emisor si hace falta.

**Salida:**

- [ ] AC #1 responde
- [ ] AC #2 responde (mismo emisor o segundo LED)
- [ ] Lista de órdenes verificadas (power, mode, temp, fan, swing, …)

**No hacer:** app ni bot. Un botón en serial / GPIO basta.

---

## Fase 4 — WiFi

**Objetivo:** el ESP32 se une a la red y reconecta solo si cae.

**Tareas:**

1. Credenciales por `secrets` / NVS / compile flags, **nunca** en Git.
2. Reconexión no bloqueante.
3. LED o log de “conectado / reconectando”.

**Salida:**

- [ ] Conexión estable
- [ ] Reconexión tras apagar el router unos segundos

---

## Fase 5 — MQTT

**Objetivo:** el ESP32 recibe un `setState` por MQTT y dispara el IR.

```text
subscribe: smartac/device/+/command
publish:   smartac/device/+/state
           smartac/device/+/status
```

**Tareas:**

1. Broker Mosquitto local (más adelante en `docker/`).
2. Usuario/contraseña.
3. Payload JSON de la spec (`requestId`, `deviceId`, `state`).
4. Publicar `success` + `desiredState` (no fingir estado real).
5. Reconexión MQTT no bloqueante.

**Salida:**

- [ ] Un `mosquitto_pub` enciende o cambia un aire
- [ ] El dispositivo publica estado / online

---

## Fase 6 — Backend

**Objetivo:** API REST + `AirConditionerService` + transporte MQTT (y mock). Spec: [`BACKEND.md`](BACKEND.md).

**Tareas:**

1. App TypeScript (`apps/backend`), tipos en `packages/shared`.
2. SQLite: aires, comandos, estado.
3. Endpoints mínimos de la spec, más `GET /health`.
4. `IrTransport` (MQTT) y `MockAirConditionerTransport`.
5. Docker Compose local: backend + Mosquitto (+ volumen SQLite).
6. Compose de producción según [`DEPLOY.md`](DEPLOY.md) (Caddy + MQTTS 8883), cuando toque subir a Oracle.

**Salida:**

- [x] `curl` cambia estado vía mock sin ESP32
- [ ] `curl` cambia un aire real si el ESP32 está en MQTT
- [x] Secretos solo por entorno
- [x] `GET /health` responde sin secreto

**Paralelo permitido:** empezar Telegram/Expo contra mock.

---

## Fase 7 — Telegram

**Objetivo:** controlar los dos aires con botones inline, solo usuarios de la whitelist.

**Tareas:**

1. Bot **en el mismo proceso** que Fastify (`apps/backend/src/telegram/`). No un contenedor extra.
2. `isAuthorizedTelegramUser()` por **user ID**.
3. Selección de aire + power, mode, temp, fan, swing, turbo, eco.
4. Copy de “estado deseado / última orden”, nunca “el aire está en X” sin `reportedState`.
5. Webhook `POST /telegram/webhook` (producción) o long polling (local). **Pendiente:** montar webhook + `setWebhook` en deploy; ver [`BACKEND.md` §8](BACKEND.md) (409, un solo consumidor, no separar contenedor sin bus).

**Salida:**

- [x] Usuario autorizado controla AC #1 y #2
- [x] Usuario no autorizado recibe el mensaje de permiso denegado
- [x] Funciona contra mock
- [ ] Funciona contra ESP32

Wizard `/schedule`: aire → hora (p. ej. 08:00) → antelación (p. ej. 1 h antes) → una vez / diario → estado deseado. El proceso Node dispara la orden en hora de Madrid.

---

## Fase 8 — Expo

**Objetivo:** la misma API, UI tipo mando.

**Tareas:**

1. App `apps/mobile` (React Native, Expo, TypeScript).
2. `packages/api-client` (nada de `fetch` en componentes).
3. Pantalla de lista + pantalla de mando.
4. Componentes de la spec.
5. Zustand o Context.
6. Pull to refresh / botón actualizar.
7. Programas: REST `/api/schedules` + pantallas lista/wizard (paridad Telegram).

**Salida:**

- [x] Scaffold Expo + navegación + store (mock API)
- [ ] Control de ambos aires verificado en dispositivo / simulador
- [x] Misma semántica de estado que Telegram (`desiredState` / última orden)
- [ ] Funciona contra mock y contra API real en red local
- [x] REST de schedules + UI Programas / wizard en Expo

**No hacer en el MVP:** Expo Router, WebSocket, login social.

---

## Fase 9 — Mejoras (post-MVP)

Solo cuando el MVP de la spec esté tildado.

- WebSocket hacia la app
- Escenas, favoritos, historial
- Temperatura ambiente / sensores
- Integración Home Assistant
- `MideaLocalTransport` si el modelo concreto lo permite

---

## Trabajo en paralelo

| Carril | Puede empezar en |
| --- | --- |
| Captura IR + firmware | Fase 1 |
| Mock + API + tipos shared | En cuanto exista el repo (hoy: no código; cuando se abra la fase 6) |
| Telegram contra mock | Tras el esqueleto de la fase 6 |
| Expo contra mock | Tras el esqueleto de la fase 6 |
| MQTT real | Tras fases 3–4 |

El carril mock **no** desbloquea dar por cerrado el MVP: el MVP exige el aire respondiendo.

---

## Stack previsto (cuando haya código)

| Pieza | Elección |
| --- | --- |
| Monorepo | pnpm workspaces |
| Apps JS | TypeScript |
| Backend | Node.js 22 + **Fastify** (API + Telegram, un proceso) |
| Bot | Telegram Bot API (grammY o Telegraf, dentro de `apps/backend`) |
| Móvil | React Native + Expo |
| Estado app | Zustand (o Context si sigue pequeño) |
| Firmware | A decidir en fase 1 (PlatformIO recomendado) |
| Broker | Mosquitto (1883 local; 8883 TLS en producción) |
| DB prototipo | SQLite |
| Contenedores | Docker Compose |
| Producción | Oracle Always Free — [`DEPLOY.md`](DEPLOY.md) |

No instalar nada en fase 0.

---

## Criterio para Cursor / agentes

Implementar **una fase**. Abrir PR de esa fase. No mezclar Expo con captura IR. No rellenar `reportedState` con el último comando enviado.
