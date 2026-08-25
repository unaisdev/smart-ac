# Contribuir a Smart AC

Gracias por querer montar, mejorar o documentar este proyecto. Es hardware + software de código abierto: lo útil es que otra persona pueda reproducirlo en su casa.

**V1** es encender y apagar desde Telegram (backend en casa, long polling). Expo no es cliente soportado. Las contribuciones más valiosas hoy:

- aclarar o corregir [`docs/SPECS.md`](docs/SPECS.md)
- firmware MQTT + replay IR de power on/off
- el bot de Telegram recortado a Encender/Apagar
- anotar mandos Johnson / RG10 reales (fotos, capturas IR, modelo del aire)

## Principios

1. **Incremental.** Una fase funcional antes de la siguiente. Ver el [plan](docs/PLAN.md).
2. **No inventar el protocolo IR.** Primero librerías existentes. Si no encajan, captura RAW.
3. **Los mandos de AC envían estado completo.** En V1 el producto solo expone `power`; el frame completo vive en las capturas RAW.
4. **IR no es verdad absoluta.** Distinguir `desiredState` y `reportedState`. No decir que el aire “está encendido” solo porque se envió IR.
5. **Telegram no habla con el ESP32.** Pasa por `AirConditionerService` → transporte → MQTT → firmware.
6. **El transporte es sustituible.** IR hoy; Midea local / WiFi / UART mañana.
7. **Nada de secretos en Git.** Ni tokens, ni WiFi, ni MQTT, ni IDs de Telegram reales.

## Cómo empezar

1. Lee [`README.md`](README.md), [`docs/SPECS.md`](docs/SPECS.md), [`docs/PLAN.md`](docs/PLAN.md) y [`docs/MATERIALS.md`](docs/MATERIALS.md).
2. Abre un issue describiendo el cambio **antes** de un PR grande.
3. Un PR = una idea. No mezclar captura IR con la app Expo.
4. Documenta hardware con fotos, pines usados y modelo exacto del aire / mando.

## Qué aportar según el área

### Documentación

- Correcciones de arquitectura, contratos MQTT/REST, o criterios de V1.
- Traducciones (el idioma principal del repo es español).
- Guías de montaje.

### Hardware

- Confirmación del BOM con un modelo concreto.
- Esquemas de la etapa de potencia del LED IR.
- **No** publiques capturas que incluyan redes WiFi, tokens o IDs personales.

### Firmware

- Captura IR reproducible (RAW + frecuencia + botón). V1: power on/off.
- Encoder/decoder de temperatura: post-V1.
- El loop principal no debe bloquearse. Reconexión WiFi/MQTT automática.

### Backend y Telegram

- Reutilizar tipos de `packages/shared` (`AirState { power }` en V1).
- Autorización de Telegram **solo** por user ID.
- Cubrir el camino mock (sin ESP32) y el camino real.

### Expo

Fuera de V1. Si tocas `apps/mobile`, que compile contra el contrato actual; no lo documentes como cliente soportado.

## Estilo

- TypeScript en apps y packages.
- pnpm como gestor del monorepo.
- Named exports, sin barrels `index.ts` innecesarios.
- Firmware ESP32: PlatformIO, C++ / Arduino.
- Commits en inglés, imperativo: `feat(firmware): capture raw IR frames`.

## Seguridad

Nunca:

- exponer MQTT a Internet sin autenticación
- commitear `.env`, tokens o `WIFI_PASSWORD`
- fiarse del username de Telegram
- abrir puertos del router “para probar”

Si encuentras un problema de seguridad, descríbelo en un issue **sin** pegar secretos.

## Código de conducta (corto)

Sé respetuoso. Este repo es para montar un aire en casa, no para debates de marca. Issues y PRs en español o inglés.
