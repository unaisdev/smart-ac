# `apps/telegram-bot`

Bot de Telegram: botones inline para los dos aires.

El MVP **no** usa esta carpeta: el bot corre **dentro de** [`apps/backend`](../backend/README.md) (un proceso, un contenedor). Spec: [`docs/BACKEND.md`](../../docs/BACKEND.md).

El bot corre **dentro de** [`apps/backend`](../backend/README.md) (grammY, long polling, mismo proceso). No hay código aquí.

Esta carpeta queda reservada por si un día se separa el bot. No duplicar lógica aquí en el MVP.
