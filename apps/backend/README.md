# `apps/backend`

API REST y dominio de Smart AC. Única pieza que conoce dispositivos, MQTT y SQLite. Telegram se añadirá **en este mismo proceso** en la [fase 7](../../docs/PLAN.md).

Spec: [`docs/BACKEND.md`](../../docs/BACKEND.md). Despliegue: [`docs/DEPLOY.md`](../../docs/DEPLOY.md).

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

Mosquitto queda en `127.0.0.1:1883` (usuario local `smartac` / `smartac`). Para hablar con un ESP32 real: `TRANSPORT=mqtt` en `.env`.

## Tests

```bash
pnpm test
```
