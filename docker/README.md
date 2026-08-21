# `docker`

Compose local previsto: backend (Fastify + Telegram) y Mosquitto, con volumen SQLite.

Aún **no hay** `docker-compose.yml`. Se añade en la [fase 6](../../docs/PLAN.md). Producción (Caddy, MQTTS 8883, Oracle Always Free): [`docs/DEPLOY.md`](../../docs/DEPLOY.md).

El ESP32 no va en Docker: se conecta al broker por WiFi.
