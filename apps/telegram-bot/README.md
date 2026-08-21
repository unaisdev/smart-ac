# `apps/telegram-bot`

Bot de Telegram: botones inline para los dos aires.

El MVP **no** usa esta carpeta: el bot corre **dentro de** [`apps/backend`](../backend/README.md) (un proceso, un contenedor). Spec: [`docs/BACKEND.md`](../../docs/BACKEND.md).

Aún **no hay código**. Cuando se abra la [fase 7](../../docs/PLAN.md), implementar en el backend:

- Misma `AirConditionerService` (no IR directo)
- Whitelist por **Telegram user ID**
- Copy de “estado deseado”, no de estado real confirmado

Esta carpeta queda reservada por si un día se separa el bot. No duplicar lógica aquí en el MVP.
