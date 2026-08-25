# `apps/mobile`

**Fuera de V1.** Esta app Expo no es un cliente soportado. El cliente V1 es Telegram.

El código se mantiene para que el monorepo compile contra `AirState { power: boolean }` y para un uso posterior (LAN o hosting público). Hoy el móvil tiene que alcanzar el backend por HTTP (`POST` / SSE). Eso solo funciona en la misma LAN (`http://192.168.x.x:3000`) o con una URL pública. Telegram no tiene esa limitación: usa long polling hacia la API de Telegram.

No documentar ni tratar esta app como producto V1. No hay despliegue ni verificación en dispositivo más allá del typecheck.

## Estándares

Ver `.cursor/rules/` y `.cursor/skills/code-standards-react/SKILL.md`. HTTP solo por `@smart-ac/api-client`.

TypeScript estricto, named exports, kebab-case, sin `React.FC`,
estilos vía theme tokens + `createStyles`, Zustand, React Navigation (sin Expo Router).

## Arranque (LAN, no producto)

1. Backend en local (`pnpm dev`) con `API_SECRET`.
2. Copia `apps/mobile/.env.example` → `apps/mobile/.env` y ajusta la URL:
   - Simulador iOS / mismo Mac: `http://127.0.0.1:3000`
   - Emulador Android: `http://127.0.0.1:3000` + `adb reverse tcp:3000 tcp:3000` (o `http://10.0.2.2:3000`)
   - Dispositivo físico: `http://<IP-LAN-del-Mac>:3000`
3. Desde la raíz: `pnpm mobile` (o `pnpm --filter @smart-ac/mobile start`).
4. Android + Expo Go: con un emulador arrancado, `pnpm --filter @smart-ac/mobile android` (abre Expo Go).

## Estructura

```text
src/
  components/base|screens|navigation
  feedback/        # toasts de resultado de orden (success / warning / error)
  stores/          # Zustand (lista + setPower + SSE)
  theme/           # tokens + createStyles
  config/          # API URL + client
  utils/
```

Pantallas: lista de aires y mando con solo encendido/apagado (`PowerButton`).
Feedback de órdenes: toasts apilados desde abajo (`ToastHost`).
Tras cada `setPower` se muestra ON/OFF;
éxito si `commandSent`, warning si el controlador no envió IR / está offline,
o error si la API falla.
