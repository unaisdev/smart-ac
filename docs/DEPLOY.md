# Despliegue — Smart AC

Cómo corre el sistema **24/7 con coste 0 €/mes**. Qué construye el backend está en [`BACKEND.md`](BACKEND.md). El producto está en [`SPECS.md`](SPECS.md).

El YAML de Compose de producción se añade en la [fase 6](PLAN.md). Este documento fija **qué** se despliega y **dónde**, para no improvisar servicios de pago.

Coste objetivo: **0 €/mes** (Oracle Cloud Always Free). Fallback: Hetzner CX22 (~4 €/mes) si no hay capacidad A1 o si Oracle reclama la VM.

---

## 1. Qué se despliega (y qué no)

En una **sola VM**:

| Servicio | Rol |
| --- | --- |
| Caddy | TLS (Let’s Encrypt), proxy a Fastify |
| Backend | API REST + bot de Telegram, **un proceso Node** |
| Mosquitto | Broker MQTT, TLS en **8883** |
| SQLite | Fichero en volumen; no es un contenedor aparte |

```text
Internet
   │
   ├─ :443  Expo / Telegram webhook  → Caddy → Fastify :3000
   └─ :8883 MQTTS                    → Mosquitto
                                         ↑
                                    ESP32 (salida desde casa)
```

**No se despliega:**

- Firmware ESP32: se flashea en casa. El chip **sale** hacia MQTT; no hay que abrir puertos del router.
- App Expo: vive en el móvil (EAS / dev client). Solo necesita `PUBLIC_BASE_URL`.
- Postgres, Redis, Kubernetes, HiveMQ Cloud, Railway, Fly.

Compose local (portátil de desarrollo): backend + Mosquitto **sin** Caddy ni TLS, puerto MQTT 1883 en la red Docker. Ver [`docker/README.md`](../docker/README.md).

---

## 2. Forma de la VM (Always Free)

Límites Always Free (ago 2026): **2 OCPU / 12 GB** Ampere A1 por tenancy, más 2 micros AMD. Boot mínimo ~47 GB (dentro de 200 GB de block volume).

| Parámetro | Valor | Motivo |
| --- | --- | --- |
| Shape | `VM.Standard.A1.Flex` | ARM, Always Free |
| Tamaño | **1 OCPU / 2 GB RAM** | Cabe Caddy + Node + Mosquitto. **No** usar 12 GB |
| Imagen | Ubuntu 22.04 o 24.04 **aarch64** | Imágenes Docker `linux/arm64` |
| Disco | boot ~47 GB | Mínimo Always Free |

**Por qué 2 GB y no 12 GB.** Oracle puede reclamar instancias Always Free si, durante **7 días**, CPU (p95) < 20 %, red < 20 % **y** (solo A1) memoria < 20 %. Un hobby con 12 GB parece idle. Con 2 GB, Docker suele mantener la memoria por encima del umbral. Sigue habiendo riesgo: por eso hay backup y fallback.

Alta de cuenta: elegir **home region** con cuidado (no se cambia). Oracle pide tarjeta al registrarse; no implica cobro si no sales del Always Free. **No** subir de 1 OCPU / 2 GB.

Si la consola dice *Out of capacity* para A1: otra AD de la misma región, esperar, o ir al fallback Hetzner. No abrir un Ampere de pago “un momento”.

---

## 3. Red

VCN con subnet pública e IP pública.

Security list / NSG (y **también** `iptables` de las imágenes Ubuntu de OCI; abrir los dos):

| Puerto | Origen | Uso |
| --- | --- | --- |
| 22 | tu IP | SSH |
| 80 | `0.0.0.0/0` | ACME HTTP-01 |
| 443 | `0.0.0.0/0` | API + webhook |
| **8883** | `0.0.0.0/0` | MQTTS (usuario/contraseña **y** TLS) |
| 1883 | **cerrado** a Internet | Solo red Docker interna, si acaso |

Hostname: **DuckDNS** (gratis) o un dominio que ya tengas. Hace falta un nombre para Let’s Encrypt y para que el ESP32 tenga `MQTT_HOST` estable. La IP pública de Oracle puede cambiar si se recrea la VM: actualiza DuckDNS.

SSH por clave; desactivar password login.

---

## 4. Compose de producción (fase 6)

Tres servicios, imágenes **linux/arm64**, `restart: unless-stopped`:

```text
caddy        :80, :443
backend      Fastify + Telegram; volumen ./data (SQLite)
mosquitto    :8883 publicado; :1883 solo interno
```

Volúmenes:

- `./data/smart-ac.sqlite` — estado
- datos + passwd de Mosquitto
- certs (Caddy) y, si Mosquitto no comparte el store de Caddy, copia o certbot para 8883

Variables: [`.env.example`](../.env.example) y [`BACKEND.md` §7](BACKEND.md). En producción:

```env
PUBLIC_BASE_URL=https://<tu-duckdns>
MQTT_HOST=<tu-duckdns>
MQTT_PORT=8883
MQTT_URL=mqtts://127.0.0.1:8883
```

El ESP32 usa el mismo `MQTT_HOST` / `MQTT_PORT` / usuario / contraseña, con TLS.

El YAML concreto no está en el repo hasta la fase 6.

---

## 5. MQTT y Telegram

**MQTT**

- Usuario y contraseña. Nunca anónimo.
- TLS en 8883 hacia Internet. 1883, si existe, solo entre contenedores.
- El ESP32 mantiene conexión **saliente**. Si cae WiFi o el broker, reconecta (firmware, fase 4–5).

**Telegram**

- **Producción (objetivo):** webhook `https://<host>/telegram/webhook` en la misma Fastify. Registrar con `setWebhook` usando `PUBLIC_BASE_URL`. No combinar webhook y long polling.
- **Local / MVP actual:** long polling (`bot.start`). Vale sin TLS.
- **409 Conflict:** dos procesos con el mismo `TELEGRAM_BOT_TOKEN` haciendo `getUpdates`. Solo uno puede long-pollear. Detalle y checklist de webhook: [`BACKEND.md` §8](BACKEND.md).
- Whitelist por user ID: [`SPECS.md` §11](SPECS.md).
- No hace falta un contenedor solo para el bot mientras el live update dependa de `onChanged` en proceso.
---

## 6. Backups

SQLite es un fichero. Una vez al día basta para dos aires:

1. `sqlite3 smart-ac.sqlite ".backup /tmp/smart-ac.sqlite"`
2. Subir a **Object Storage** Always Free (~20 GB) **o** `scp` a tu máquina.

Sin backup, un reclaim o un `terminate` de la VM borra `desiredState` y capturas IR. El firmware y el código están en Git; los datos no.

---

## 7. Checklist de humo

Cuando exista el Compose (fase 6):

- [ ] `curl -fsS https://<host>/health` → 200
- [ ] `curl` a `GET /api/air-conditioners` **sin** bearer → 401
- [ ] `curl` con `Authorization: Bearer <API_SECRET>` → lista `ac-salon`, `ac-dormitorio`
- [ ] `mosquitto_sub` con TLS al hostname:8883 (usuario/contraseña); sin credenciales, rechazo
- [ ] Puerto 1883 **no** accesible desde Internet
- [ ] Telegram: usuario de la whitelist controla un aire; otro usuario recibe el mensaje de permiso denegado
- [ ] Telegram producción: webhook registrado; **un** proceso recibe updates (sin 409 por segundo long poller)
- [ ] ESP32 en casa: `status` online en el broker **sin** abrir NAT

---

## 8. Riesgos Always Free

| Riesgo | Qué hacer |
| --- | --- |
| *Out of capacity* A1 | Otra AD, esperar, o Hetzner |
| Reclaim por idle (7 días, CPU/red/memoria bajos) | 1 OCPU / 2 GB; backup diario; ESP32 con keep-alive MQTT ayuda en red, no en CPU |
| Cuenta sin verificar / home region saturada | Terminar el alta con tarjeta; no crear shapes de pago |
| IP pública nueva al recrear la VM | Actualizar DuckDNS y, si hace falta, certs |

Si Oracle falla de forma repetida: **Hetzner CX22** (x86, ~4 €/mes, 2 vCPU / 4 GB). Mismo Compose; cambiar imágenes a `linux/amd64`. No cambia la API ni el firmware más que `MQTT_HOST`.

---

## 9. Qué no hacer

- Abrir 1883 a `0.0.0.0/0`
- Meter Postgres “por si acaso”
- Un container extra solo para el bot (sin bus de eventos compartido; ver [`BACKEND.md` §8](BACKEND.md))
- Long polling local **y** long polling/webhook remoto con el mismo token a la vez
- Ampliar la VM por encima de Always Free
- Abrir puertos en el router de casa
- Guardar tokens, WiFi o IDs de Telegram en Git
