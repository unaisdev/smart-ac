# `docker`

Compose **local**: Fastify + Mosquitto, SQLite en volumen. El YAML de producción (Caddy, MQTTS 8883) llega cuando se suba a Oracle; ver [`docs/DEPLOY.md`](../docs/DEPLOY.md).

```bash
# desde la raíz del repo
pnpm compose:up
```

| Servicio | Puerto en el host |
| --- | --- |
| backend | `3000` |
| mosquitto | `127.0.0.1:1883` (no publicado a la LAN) |

Credenciales MQTT locales (solo Compose de desarrollo): usuario `smartac`, contraseña `smartac`. Cámbialas antes de cualquier exposición.

El ESP32 no va en Docker: se conecta al broker por WiFi.
