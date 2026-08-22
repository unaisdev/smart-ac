# `apps/mobile`

App React Native + Expo (TypeScript). Mando de los dos aires y **programas horarios** vía API REST.

## Estándares

Ver:

- `.cursor/rules/coding-standards.mdc`
- `.cursor/rules/react-native.mdc`
- `.cursor/rules/mobile-structure.mdc`
- `.cursor/skills/code-standards-react/SKILL.md`

TypeScript estricto, named exports, kebab-case, sin `React.FC`,
estilos vía theme tokens + `createStyles`, Zustand, React Navigation (sin Expo Router),
HTTP solo por `@smart-ac/api-client`.

## Arranque

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
  stores/          # Zustand
  theme/           # tokens + createStyles
  config/          # API URL + client
  utils/
```

Feedback de órdenes: toasts apilados desde abajo (`ToastHost`).
Tras cada mutación se muestra qué cambió y si el aire queda ON/OFF;
éxito si `commandSent`, warning si el controlador no envió IR / está offline,
o error si la API falla.
