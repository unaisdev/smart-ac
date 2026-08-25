# `apps/backend`

API REST, dominio y **bot de Telegram** (mismo proceso). Cliente **V1**. Spec: [`docs/BACKEND.md`](../../docs/BACKEND.md). Despliegue en casa: [`docs/DEPLOY.md`](../../docs/DEPLOY.md).

V1: **encender y apagar**. Long polling local: no hace falta URL pública.

```env
TELEGRAM_BOT_TOKEN=...          # @BotFather
TELEGRAM_ALLOWED_USER_IDS=123456789
```

El ID es el número de Telegram (`@userinfobot`), nunca el username. Luego `pnpm --filter @smart-ac/backend dev`.

`/start` lista los aires. Los botones **Encender** / **Apagar** envían la última orden deseada (mock o MQTT/IR); no confirman que el aparato esté realmente encendido. Un usuario fuera de la whitelist recibe el mensaje de permiso denegado.

## Arranque local (sin Docker)

Desde la raíz del repo:

```bash
cp .env.example .env
pnpm install
pnpm --filter @smart-ac/backend dev
```

`GET /health` no lleva secreto. El resto de `/api/*` usa `Authorization: Bearer <API_SECRET>`.

```bash
curl -s http://127.0.0.1:3000/health

curl -s -H "Authorization: Bearer dev-secret-change-me" \
  http://127.0.0.1:3000/api/air-conditioners

curl -s -X POST -H "Authorization: Bearer dev-secret-change-me" \
  -H "Content-Type: application/json" \
  -d '{"power":true}' \
  http://127.0.0.1:3000/api/air-conditioners/ac-salon/power
```

`TRANSPORT=mock` (por defecto) no necesita ESP32. `reportedState` queda `null`: IR no confirma el aparato.

## Docker Compose

```bash
pnpm compose:up
```

Mosquitto queda en `127.0.0.1:1883`. Para hablar con un ESP32 real: `TRANSPORT=mqtt` en `.env`.

## Tests

```bash
pnpm test
```
