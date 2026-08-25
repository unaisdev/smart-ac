# Backend — Smart AC

Documento de **qué es** el backend y **cómo se implementa**. El contrato de producto está en [`SPECS.md`](SPECS.md). El orden de fases está en [`PLAN.md`](PLAN.md). Dónde corre 24/7 está en [`DEPLOY.md`](DEPLOY.md).

Estado: **V1** — `POST .../power`, Telegram long polling (encender/apagar), mock o MQTT. Sin programas, sin webhook, sin Expo como cliente.

---

## 1. Responsabilidad

Única pieza que conoce dispositivos, MQTT, SQLite y Telegram.

Telegram **no** habla IR ni MQTT. Pasa por `AirConditionerService` → transporte → (MQTT) → ESP32.

```text
Telegram (long polling)
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
| Runtime | Node.js 22 LTS | Imagen oficial; cabe en una máquina de casa |
| Lenguaje | TypeScript | Igual que `packages/shared` |
| HTTP | **Fastify** | Un proceso, poco RAM |
| Bot | grammY **en el mismo proceso** | Un puerto, long polling |
| MQTT cliente | `mqtt` (`mqtt.js`) | Cliente Node estándar |
| DB | SQLite vía `better-sqlite3` | Un fichero |
| Paquetes | `packages/shared` | `AirState { power }` |

**No** NestJS, Postgres, Redis ni un servicio aparte para el bot. `apps/telegram-bot/` queda reservada.

---

## 3. Módulos

```text
apps/backend/
  src/
    server.ts
    config.ts
    db/
    domain/
      AirConditionerService.ts
    transport/
      AirConditionerTransport.ts
      MockAirConditionerTransport.ts
      IrTransport.ts
    http/
      airConditioners.ts      # GET list/get, POST .../power
      health.ts
      events.ts               # SSE (compile-fix Expo; no es cliente V1)
      auth.ts
    telegram/
      bot.ts
      auth.ts
      keyboards.ts
```

### `AirConditionerService`

Única API de dominio. Persiste comandos y `desiredState`. **Nunca** rellena `reportedState` con el último comando enviado.

```ts
interface AirConditionerTransport {
  connect(): Promise<void>;
  setState(deviceId: string, state: AirState): Promise<void>;
  getState(deviceId: string): Promise<AirState | undefined>;
}
```

`AirState` V1: `{ power: boolean }`. Tipado: [`SPECS.md` §5](SPECS.md).

### Auth

| Cliente | Cómo |
| --- | --- |
| `curl` / compile-fix Expo | Header `Authorization: Bearer <API_SECRET>` |
| Telegram | `isAuthorizedTelegramUser()` por **user ID** numérico |

Usuario de Telegram no autorizado: *«⛔ No tienes permiso para controlar estos dispositivos.»*

---

## 4. SQLite

Un fichero (`DATABASE_URL=file:./data/smart-ac.sqlite`). Tablas V1:

```text
air_conditioners   id, name, location
telegram_users     telegram_user_id, created_at
commands           id, air_conditioner_id, request_id, payload_json, created_at, success
device_status      air_conditioner_id, desired_state_json, reported_state_json, online, updated_at
```

Semilla: `ac-salon`, `ac-dormitorio`. No hace falta `users` genérico: Expo (si se usa en LAN más adelante) comparte `API_SECRET`; Telegram usa la whitelist.

---

## 5. HTTP

```http
GET  /health
GET  /api/air-conditioners
GET  /api/air-conditioners/:id
POST /api/air-conditioners/:id/power
GET  /api/events
```

`GET /health` no exige secreto. El resto de `/api/*` sí.

Payloads MQTT: [`SPECS.md` §8](SPECS.md). `success: true` = **comando enviado**.

---

## 6. Estado deseado vs real

| Campo | Significado |
| --- | --- |
| `desiredState` | Última orden (`{ power }`) |
| `reportedState` | Confirmado por el aparato. Con IR puro: `null` |

La API y Telegram dicen “última orden”, no “el aire está encendido”, mientras `reportedState` no exista.

---

## 7. Variables de entorno

Ver [`.env.example`](../.env.example).

```env
PORT=3000
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

- V1 en casa: `MQTT_HOST=mosquitto` (Compose) o el hostname LAN, puerto **1883**. No hace falta TLS entre procesos locales. No hace falta `PUBLIC_BASE_URL` (eso es webhook / post-V1).
- Nunca commitear valores reales.

---

## 8. Telegram: long polling (V1)

**Un solo consumidor** de updates por bot token. Si dos procesos hacen `getUpdates` con el mismo token, Telegram responde **409 Conflict**.

Mitigación: un fallo del long polling **no debe tumbar** la API REST. En local, si el bot ya corre en otra máquina: deja `TELEGRAM_BOT_TOKEN` vacío.

**Webhook:** post-V1. No combinar webhook y long polling.

---

## 9. Fuera de V1

- Rutas `/temperature` `/mode` `/fan` `/swing` `/state` `/schedules`
- Wizard `/schedule`
- NestJS, Postgres, Redis
- Login social / JWT por usuario
- Hablar MQTT desde la app móvil
- Contenedor aparte para Telegram
- Webhook y hosting público
