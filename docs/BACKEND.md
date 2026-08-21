# Backend — Smart AC

Documento de **qué es** el backend y **cómo se implementa**. El contrato de producto está en [`SPECS.md`](SPECS.md). El orden de fases está en [`PLAN.md`](PLAN.md). Dónde corre 24/7 está en [`DEPLOY.md`](DEPLOY.md).

Estado: **fase 7 en curso**. API + mock + bot Telegram (long polling). Expo y firmware aún no.

---

## 1. Responsabilidad

Única pieza que conoce dispositivos, usuarios, MQTT, SQLite y Telegram.

Telegram y Expo **no** hablan IR ni MQTT. Pasan por `AirConditionerService` → transporte → (MQTT) → ESP32.

```text
Telegram / Expo
       ↓
  HTTP (REST) + webhook Telegram
       ↓
     Fastify
       ↓
AirConditionerService
       ↓
   Transport
   ├── MockAirConditionerTransport   (dev, sin hardware)
   └── IrTransport                   (MQTT → ESP32 → IR)
       ↓
     SQLite
```

---

## 2. Stack (fijado)

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Runtime | Node.js 22 LTS | Imagen oficial ARM64 para Oracle A1 |
| Lenguaje | TypeScript | Igual que Expo y `packages/shared` |
| HTTP | **Fastify** | Menos RAM que NestJS; cabe en 2 GB con Mosquitto y Caddy |
| Bot | grammY (o Telegraf) **en el mismo proceso** | Un contenedor, un puerto |
| MQTT cliente | `mqtt` (`mqtt.js`) | Cliente Node estándar |
| DB | SQLite vía `better-sqlite3` | Cero coste, un fichero, backup trivial. Drizzle encima solo si el SQL se vuelve feo |
| Paquetes | `packages/shared` | `AirState`, `AirMode`, `FanSpeed`, IDs |

**No** NestJS, Postgres, Redis ni un servicio aparte para el bot. `apps/telegram-bot/` queda como carpeta reservada por si un día se separa; el MVP vive en `apps/backend`.

---

## 3. Módulos

```text
apps/backend/
  src/
    server.ts                 # Fastify + registro de plugins
    config.ts                 # env tipado
    db/                       # SQLite, migraciones mínimas
    domain/
      AirConditionerService.ts
      schedule-service.ts     # programas horarios (SQLite)
      schedule-runner.ts      # tick; dispara setState
    transport/
      AirConditionerTransport.ts   # interfaz
      MockAirConditionerTransport.ts
      IrTransport.ts               # MQTT
    http/
      airConditioners.ts      # rutas REST
      health.ts
      auth.ts                 # bearer API_SECRET (Expo)
    telegram/
      bot.ts
      auth.ts                 # isAuthorizedTelegramUser()
      keyboards.ts
      schedule-bot.ts         # wizard /schedule
```

### `AirConditionerService`

Única API de dominio. Recibe un `AirConditionerTransport`. Persiste comandos y `desiredState`. **Nunca** rellena `reportedState` con el último comando enviado.

```ts
interface AirConditionerTransport {
  connect(): Promise<void>;
  setState(deviceId: string, state: AirState): Promise<void>;
  getState(deviceId: string): Promise<AirState | undefined>;
}
```

Tipos canónicos: [`SPECS.md` §5](SPECS.md).

### Auth

| Cliente | Cómo |
| --- | --- |
| Expo / `curl` | Header `Authorization: Bearer <API_SECRET>` |
| Telegram | `isAuthorizedTelegramUser()`: el **user ID numérico** debe estar en `TELEGRAM_ALLOWED_USER_IDS`. Nunca el username |

Usuario de Telegram no autorizado: *«⛔ No tienes permiso para controlar estos dispositivos.»*

---

## 4. SQLite

Un fichero (`DATABASE_URL=file:./data/smart-ac.sqlite`). Tablas del MVP:

```text
air_conditioners   id, name, location
telegram_users     telegram_user_id, created_at
commands           id, air_conditioner_id, request_id, payload_json, created_at, success
device_status      air_conditioner_id, desired_state_json, reported_state_json, online, updated_at
ir_commands        device_id, name, data_json, frequency   # captura RAW, fase 2+
schedules          id, air_conditioner_id, repeat, hora local, lead, next_execute_at, state_json
```

Semilla inicial:

```text
ac-salon        Salón         Salón
ac-dormitorio   Dormitorio    Dormitorio
```

No hace falta `users` genérico en el MVP: la app Expo comparte `API_SECRET`; Telegram usa la whitelist de IDs.

---

## 5. HTTP

Contratos REST: [`SPECS.md` §10](SPECS.md). Añadir:

```http
GET  /health
POST /telegram/webhook
```

`GET /health` no exige secreto (Caddy / Oracle lo usan para saber que el proceso vive). El resto de `/api/*` sí.

El webhook de Telegram es la misma app Fastify. grammY se monta en `POST /telegram/webhook`. En local, long polling vale para desarrollar sin TLS.

Payloads MQTT: [`SPECS.md` §8](SPECS.md). El backend publica `command` y escucha `state` / `status`. `success: true` significa **comando enviado**, no “el aire ejecutó la orden”.

---

## 6. Estado deseado vs real

| Campo | Significado |
| --- | --- |
| `desiredState` | Última orden que el sistema envió |
| `reportedState` | Confirmado por el aparato. Con IR puro: `null` / ausente |

La API y Telegram dicen “última orden”, no “el aire está en COOL 24 °C”, mientras `reportedState` no exista. Detalle: [`SPECS.md` §9](SPECS.md).

---

## 7. Variables de entorno

Ver [`.env.example`](../.env.example). Las que usa el proceso Node:

```env
PORT=3000
PUBLIC_BASE_URL=https://smart-ac.example.duckdns.org
DATABASE_URL=file:./data/smart-ac.sqlite
API_SECRET=

TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USER_IDS=

MQTT_HOST=
MQTT_PORT=1883
MQTT_URL=
MQTT_USERNAME=
MQTT_PASSWORD=
```

- Local: `MQTT_HOST=mosquitto` (Compose) y puerto **1883** en la red Docker. No hace falta TLS entre contenedores.
- Producción: `MQTT_URL=mqtts://127.0.0.1:8883` (o el hostname) y puerto **8883**. El ESP32 usa el mismo host público. Guía: [`DEPLOY.md`](DEPLOY.md).
- `PUBLIC_BASE_URL` sirve para registrar el webhook de Telegram (`${PUBLIC_BASE_URL}/telegram/webhook`).

Nunca commitear valores reales.

---

## 8. Fuera del MVP

No implementar ahora:

- REST de timers (el wizard de Telegram ya persiste y el backend ejecuta)
- WebSocket hacia Expo
- NestJS, Postgres, Redis
- Login social / JWT por usuario
- Hablar MQTT desde la app móvil
- Un contenedor o proceso aparte para Telegram
