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
4. **Expo Go** (rápido): escanea el QR. Dispositivo físico → `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN-del-Mac>:3000`.
5. **APK nativo (debug)** — siempre desde `apps/mobile`, no desde la raíz del monorepo:

```bash
adb connect <IP-móvil>:<puerto>   # depuración WiFi
cd apps/mobile
npx expo prebuild --platform android   # solo la primera vez
pnpm android                           # compila, instala APK y arranca Metro
```

Si ves `Unable to resolve "../../App"`, borra `android/` en la **raíz** del repo (generado por error) y repite desde `apps/mobile`.

## APK release (sin Metro)

La app va **embebida** en el APK. No hace falta `pnpm mobile` al usarla.

1. Ajusta `apps/mobile/.env` (la URL del API se **quema** en el build):

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.199:3000
EXPO_PUBLIC_API_SECRET=dev-secret-change-me
```

2. Genera el APK:

```bash
cd apps/mobile
pnpm build:android:release
```

3. Instala en el móvil (USB o WiFi):

```bash
adb connect <IP>:<puerto>   # si usas depuración WiFi
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

El APK queda en `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (~75 MB).

**Nota:** esta build usa firma **debug** (válida para instalar en casa). Para Play Store haría falta un keystore de release propio. Si cambias la IP del backend, **recompila** el APK.

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
