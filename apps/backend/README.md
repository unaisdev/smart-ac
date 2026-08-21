# `apps/backend`

API REST y dominio de Smart AC (TypeScript). Única pieza que conoce dispositivos, usuarios, MQTT, SQLite y Telegram.

Aún **no hay código**. Spec: [`docs/BACKEND.md`](../../docs/BACKEND.md). Despliegue: [`docs/DEPLOY.md`](../../docs/DEPLOY.md). Cuando se abra la [fase 6](../../docs/PLAN.md):

- Fastify + SQLite + `AirConditionerService`
- Transportes `Mock` / `Ir` (MQTT)
- Bot de Telegram **en este mismo proceso** ([fase 7](../../docs/PLAN.md))
- Endpoints de [`SPECS.md`](../../docs/SPECS.md)

Telegram y Expo no deben duplicar esta lógica.
