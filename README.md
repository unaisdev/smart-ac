# Smart AC

Control remoto de aires acondicionados **Johnson** (mando familia **Midea RG10**) por infrarrojos, desde **Telegram**.

**V1:** encender y apagar. El backend corre en casa. No hace falta servidor público ni abrir puertos del router.

Proyecto **open source**: cualquiera puede montarlo con un ESP32, un receptor IR y un LED infrarrojo. No hay que abrir el aire ni modificar su electrónica.

> Empieza por [`docs/SPECS.md`](docs/SPECS.md), [`docs/BACKEND.md`](docs/BACKEND.md), [`docs/DEPLOY.md`](docs/DEPLOY.md), [`docs/PLAN.md`](docs/PLAN.md) y [`docs/MATERIALS.md`](docs/MATERIALS.md).

```text
                    Telegram Cloud
                          ▲
                   long polling
                          │
                    Backend API
                      (casa)
                          │
                         MQTT
                          │
                        ESP32
                          │
                          IR
                ┌─────────┴─────────┐
                ▼                   ▼
             Aire #1             Aire #2
            (Johnson)           (Johnson)
```

## Qué hace (V1)

- Controla **dos (o más) aires** Johnson / RG10: **encender y apagar**.
- Funciona **desde casa y fuera de casa** vía Telegram (la nube de Telegram es el puente). El ESP32 y el backend salen hacia MQTT / Telegram; no hay que abrir NAT.
- Distingue **estado deseado** (última orden) de **estado real** (desconocido con IR puro).
- Está pensado para añadir modo, temperatura y una app más adelante, sin cambiar esa arquitectura.

## Qué no hace (V1)

- No cambia modo, temperatura, ventilador ni swing.
- No hay programas horarios.
- No hay app Expo como cliente soportado (el teléfono tendría que alcanzar tu API).
- No modifica el aire acondicionado.
- No afirma que el aire “está encendido” solo porque se haya enviado IR.
- No expone MQTT a Internet sin autenticación.
- No exige VM en la nube ni webhook.

## Documentación

| Documento | Contenido |
| --- | --- |
| [`docs/SPECS.md`](docs/SPECS.md) | Qué construir: arquitectura, contratos, V1 |
| [`docs/BACKEND.md`](docs/BACKEND.md) | Backend: Fastify, SQLite, Telegram en el mismo proceso |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | V1 en casa (0 €) y opción nube post-V1 |
| [`docs/PLAN.md`](docs/PLAN.md) | Fases y criterios de salida |
| [`docs/MATERIALS.md`](docs/MATERIALS.md) | Lista de materiales, cableado, pines |
| [`docs/IR-JOHNSON.md`](docs/IR-JOHNSON.md) | Protocolo IR (investigación; temp± es post-V1) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Cómo contribuir |

## Estructura del repositorio

```text
smart-ac/
├── apps/
│   ├── backend/          # API REST + Telegram (un proceso) — cliente V1
│   ├── telegram-bot/     # Reservado; el bot vive en backend
│   └── mobile/           # Expo; fuera de V1 (compile-fix)
├── packages/
│   ├── shared/           # Tipos (V1: AirState.power)
│   └── api-client/       # Cliente HTTP
├── firmware/
│   └── esp32/            # WiFi, MQTT, IR power on/off
├── docker/               # Compose: backend + Mosquitto
├── docs/
└── README.md
```

## Hardware mínimo

- ESP32-WROOM-32 (DevKit V1)
- Receptor IR VS1838B (~38 kHz)
- LED IR 940 nm (mejor con transistor NPN)
- Breadboard, cables Dupont y USB

Detalle: [`docs/MATERIALS.md`](docs/MATERIALS.md).

## Cómo se desarrolla

1. ESP32 + receptor IR (captura del mando)
2. Identificar protocolo (RG10 / COOLIX / BOSCH144)
3. Emisor IR → power on/off
4. WiFi
5. MQTT (`state.power`)
6. Backend
7. Telegram (long polling)

Mientras no haya hardware, el backend usa un **transporte mock**.

## Seguridad

- Whitelist de Telegram **user IDs** (nunca el username).
- Secretos solo en variables de entorno (ver [`.env.example`](.env.example)).
- MQTT con usuario/contraseña; no publicar el broker a Internet abierto.
- El ESP32 **sale** hacia MQTT. No hay que abrir puertos NAT.

## Licencia

[MIT](LICENSE).

## Contribuir

Lee [`CONTRIBUTING.md`](CONTRIBUTING.md).
