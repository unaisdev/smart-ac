# Contribuir a Smart AC

Gracias por querer montar, mejorar o documentar este proyecto. Es hardware + software de código abierto: lo útil es que otra persona pueda reproducirlo en su casa.

Este repositorio está ahora mismo en **fase 6** (backend + mock). Firmware, Telegram y Expo aún no. Las contribuciones más valiosas hoy son:

- aclarar o corregir [`docs/SPECS.md`](docs/SPECS.md)
- concretar el backend o el despliegue en [`docs/BACKEND.md`](docs/BACKEND.md) y [`docs/DEPLOY.md`](docs/DEPLOY.md)
- concretar fases en [`docs/PLAN.md`](docs/PLAN.md)
- mejorar la lista de materiales y el cableado en [`docs/MATERIALS.md`](docs/MATERIALS.md)
- anotar mandos Midea / RG10 reales (fotos, capturas IR, modelo del aire)

Cuando exista más código, se aplicarán las mismas reglas.

## Principios

1. **Incremental.** Una fase funcional antes de la siguiente. Ver el [plan](docs/PLAN.md).
2. **No inventar el protocolo IR.** Primero librerías existentes (IRremoteESP8266 / ESPHome Midea). Si no encajan, captura RAW y análisis. Nunca asumir que un pulso = un botón.
3. **Los mandos de AC envían estado completo.** El sistema mantiene un objeto de estado; no comandos sueltos si el protocolo no lo permite.
4. **IR no es verdad absoluta.** Distinguir `desiredState` y `reportedState`. No decirle al usuario que el aire “está encendido” solo porque se envió IR.
5. **Telegram y Expo no hablan con el ESP32.** Pasan por `AirConditionerService` → transporte → MQTT → firmware.
6. **El transporte es sustituible.** IR hoy; Midea local / WiFi / UART mañana, sin cambiar las apps.
7. **Nada de secretos en Git.** Ni tokens, ni WiFi, ni MQTT, ni IDs de Telegram reales en issues o PRs.

## Cómo empezar

1. Lee [`README.md`](README.md), [`docs/SPECS.md`](docs/SPECS.md), [`docs/PLAN.md`](docs/PLAN.md) y [`docs/MATERIALS.md`](docs/MATERIALS.md).
2. Abre un issue describiendo el cambio **antes** de un PR grande.
3. Un PR = una idea. No mezclar captura IR con la app Expo.
4. Documenta hardware con fotos, pines usados y modelo exacto del aire / mando.

## Qué aportar según el área

### Documentación

- Correcciones de arquitectura, contratos MQTT/REST, o criterios de MVP.
- Traducciones (el idioma principal del repo es español; un README en inglés es bienvenido).
- Guías de montaje más claras, tablas de compatibilidad de mandos.

### Hardware

- Confirmación de que el BOM funciona con un modelo concreto de Midea.
- Esquemas de la etapa de potencia del LED IR.
- Notas de alcance, ángulo y dos emisores vs uno.
- **No** publiques capturas que incluyan redes WiFi, tokens o IDs personales.

### Firmware (cuando exista)

- Captura IR reproducible (RAW + frecuencia + botón pulsado).
- Encoder/decoder solo si se ha demostrado que las librerías no bastan.
- El loop principal no debe bloquearse. Reconexión WiFi/MQTT automática.

### Backend, Telegram, Expo (cuando existan)

- Reutilizar tipos de `packages/shared`.
- No hacer `fetch` desde componentes; usar `packages/api-client`.
- Autorización de Telegram **solo** por user ID.
- Cubrir el camino mock (sin ESP32) y el camino real.

## Estilo (cuando haya código)

- TypeScript en apps y packages.
- pnpm como gestor del monorepo.
- Named exports, sin barrels `index.ts` innecesarios.
- Firmware ESP32: C++ / Arduino o ESP-IDF; se decidirá en la fase 1 y se documentará en `firmware/esp32/`.
- Commits en inglés, imperativo, una línea: `feat(firmware): capture raw IR frames`.

## Seguridad

Nunca:

- exponer MQTT a Internet sin autenticación
- commitear `.env`, tokens o `WIFI_PASSWORD`
- fiarse del username de Telegram
- abrir puertos del router “para probar”

Si encuentras un problema de seguridad, descríbelo en un issue **sin** pegar secretos ni dumps de red con credenciales.

## Código de conducta (corto)

Sé respetuoso. Este proyecto lo montan aficionados en su salón. Asume buena fe, documenta lo que probaste, y no ridiculices un mando o un aire distinto al tuyo: esa diversidad es precisamente lo que hay que soportar.

## Licencia

Al contribuir, aceptas que tu trabajo se publique bajo [MIT](LICENSE).
