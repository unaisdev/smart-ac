# `apps/mobile`

App React Native + Expo. **Fuera de V1:** no es cliente soportado.

El teléfono tiene que alcanzar el backend por HTTP. En la misma WiFi vale un `http://<IP-LAN>:3000`. Desde fuera de casa hace falta URL pública. El producto V1 es **Telegram** (long polling), que no exige servidor público.

Este paquete se mantiene compilando contra `AirState { power }` (lista + encender/apagar) para no romper el monorepo.

## Estándares

Ver `.cursor/rules/` y `.cursor/skills/code-standards-react/SKILL.md`. HTTP solo por `@smart-ac/api-client`.

## Arranque (LAN, no soportado como producto)

1. Backend en local con `API_SECRET`.
2. `apps/mobile/.env.example` → `.env` con la URL LAN.
3. Desde la raíz: `pnpm mobile`.
