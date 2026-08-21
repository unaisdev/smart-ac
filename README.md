# Smart AC

Control remoto de aires acondicionados **Midea** por infrarrojos, desde Telegram y desde una app móvil.

Proyecto **open source**: cualquiera puede montarlo en casa con un ESP32, un receptor IR y un LED infrarrojo. No hay que abrir el aire ni modificar su electrónica.

> Estado actual: **solo especificación**. No hay código todavía. Empieza por [`docs/SPECS.md`](docs/SPECS.md), [`docs/BACKEND.md`](docs/BACKEND.md), [`docs/DEPLOY.md`](docs/DEPLOY.md), [`docs/PLAN.md`](docs/PLAN.md) y [`docs/MATERIALS.md`](docs/MATERIALS.md).

```text
                         INTERNET
                            │
              ┌─────────────┴─────────────┐
              │                           │
         Telegram Bot                App Expo
              │                           │
              └─────────────┬─────────────┘
                            │
                       Backend API
                            │
                           MQTT
                            │
                         ESP32
                            │
                            IR
                  ┌─────────┴─────────┐
                  ▼                   ▼
               Aire #1             Aire #2
               (Midea)             (Midea)
```

## Qué hace

- Controla **dos (o más) aires** Midea con mando IR de la familia **RG10**.
- Funciona desde **casa y fuera de casa**, sin abrir puertos del router: el ESP32 sale hacia MQTT.
- El bot de Telegram y la app Expo usan **la misma API**. Ninguno habla IR ni MQTT directamente.
- Distingue **estado deseado** (última orden enviada) de **estado real** (desconocido con IR puro).
- Está pensado para sustituir IR por WiFi/protocolo local Midea más adelante, sin cambiar Telegram ni la app.

## Qué no hace (de momento)

- No modifica el aire acondicionado.
- No afirma que el aire “está encendido” solo porque se haya enviado IR.
- No expone MQTT a Internet sin autenticación.
- No implementa Home Assistant, escenas ni timers en el MVP.

## Documentación

| Documento | Contenido |
| --- | --- |
| [`docs/SPECS.md`](docs/SPECS.md) | Qué construir y por qué: arquitectura, contratos, seguridad, MVP |
| [`docs/BACKEND.md`](docs/BACKEND.md) | Backend: Fastify, SQLite, Telegram en el mismo proceso |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Qué se despliega 24/7 y cómo (Oracle Always Free, 0 €/mes) |
| [`docs/PLAN.md`](docs/PLAN.md) | En qué orden: fases incrementales y criterios de salida |
| [`docs/MATERIALS.md`](docs/MATERIALS.md) | Lista de materiales, cableado, pines y presupuesto |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Cómo contribuir (docs, hardware, firmware, apps) |

## Estructura del repositorio

```text
smart-ac/
├── apps/
│   ├── backend/          # API REST + Telegram (un proceso)
│   ├── telegram-bot/     # Reservado; el MVP no lo usa
│   └── mobile/           # App React Native + Expo
├── packages/
│   ├── shared/           # Tipos y contratos compartidos
│   └── api-client/       # Cliente HTTP para la API
├── firmware/
│   └── esp32/            # Firmware ESP32 (WiFi, MQTT, IR)
├── docker/               # Compose: backend + Mosquitto
├── docs/                 # Specs, backend, deploy, plan, materiales
├── .env.example
├── CONTRIBUTING.md
└── README.md
```

Las carpetas de `apps/`, `packages/`, `firmware/` y `docker/` están vacías a propósito. El código llegará fase a fase, según el [plan](docs/PLAN.md).

## Hardware mínimo

Para el prototipo hace falta:

- ESP32-WROOM-32 (DevKit V1)
- Receptor IR VS1838B (~38 kHz)
- LED IR 940 nm (mejor con transistor NPN)
- Breadboard, cables Dupont y USB

Detalle, cantidades, resistencias y esquema de conexionado: [`docs/MATERIALS.md`](docs/MATERIALS.md).

## Cómo se desarrolla

No se construye todo de golpe. Cada fase tiene que funcionar antes de pasar a la siguiente:

1. ESP32 + receptor IR (captura del mando original)
2. Identificar protocolo Midea (librería existente o RAW)
3. Emisor IR → el aire responde
4. WiFi
5. MQTT
6. Backend
7. Telegram
8. Expo

Mientras no haya hardware, el backend usará un **transporte mock** para poder desarrollar Telegram y la app.

## Seguridad

- Whitelist de Telegram **user IDs** (nunca el username).
- Secretos solo en variables de entorno (ver [`.env.example`](.env.example)).
- MQTT con usuario/contraseña; no publicar el broker a Internet abierto.
- El ESP32 **sale** hacia MQTT. No hay que abrir puertos NAT.

## Licencia

[MIT](LICENSE). Hardware de referencia, firmware y software se publican para que cualquiera pueda reproducir el montaje.

## Contribuir

Lee [`CONTRIBUTING.md`](CONTRIBUTING.md). Issues y PRs son bienvenidos: captura de protocolos, modelos Midea distintos, traducciones, hardware y código.
