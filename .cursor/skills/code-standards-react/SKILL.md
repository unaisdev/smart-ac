---
name: code-standards-react
description: >-
  Enforces React and React Native (Expo) coding standards for apps/mobile:
  components, hooks, styles, testing, and api-client usage. Use when writing or
  reviewing mobile/frontend TypeScript React code.
---

# React / React Native coding standards

Apply when working under `apps/mobile/` (and shared UI patterns elsewhere).

## Component typing & structure

- **No `React.FC`** — type props on the function parameters:

```typescript
export const DeviceCard = ({ name }: Props) => { ... };
```

- Children: extend `PropsWithChildren` when needed.
- **Named exports only** — no default exports (except Expo `App.tsx` entry).
- Files: kebab-case (`device-card.tsx`); component name PascalCase.
- Split when complex: `device-card.tsx`, `device-card.styles.ts`, `device-card.types.ts`.
- File structure order: imports → types → styles import → component (state → effects → handlers → render).

## Callbacks & naming

- Props: `onPress`, `onSubmit`, `onChangeTemperature`.
- Parent handlers: `handlePress`, `handleSubmit`.
- Optional callbacks: `onPress?.()`.
- Booleans: `isLoading`, `hasError`, `isPoweredOn`.

## JSX & logic

- Prefer descriptive `const` over nested ternaries in JSX.
- Extract handlers out of the render body.
- Prefer action maps over long `if`/`switch` for discrete actions.
- Keep components small; push state down; extract hooks for reusable logic.

## Styles (React Native)

- Styles in `*.styles.ts`, not large inline objects.
- Use `src/theme` tokens (colors, spacing, radius, typography) — avoid magic numbers.
- Lists: `FlatList` with stable `keyExtractor`; avoid index keys for dynamic data.

## State

- Zustand in `src/stores/` for shared device/API state; named exports.
- Local `useState` for ephemeral UI only.

## Navigation

- React Navigation stack; typed screen names — **no Expo Router**.

## Data & architecture (Smart AC)

- **No `fetch` in components** — use `packages/api-client` (`@smart-ac/api-client`).
- Shared types from `@smart-ac/shared`.
- Never talk to MQTT/IR from the app — only the backend API.
- UI must not claim the AC “is on” from IR send alone; respect `desiredState` vs `reportedState`.

## Testing

- Co-locate `*.test.ts(x)`.
- Names without “should”: `renders device list in loading state`.
- Prefer `screen` queries + RTL patterns.
- Group queries in a `query` object inside `renderElement()` when helpful.
- No `.only` / unjustified `.skip` in commits.

## Quality bar

- No `any`, no leftover `console.log`, no commented-out code.
- No secrets in source or tests.
- Accessibility: meaningful labels for interactive controls.
- Import order: React/RN → third-party → `@smart-ac/*` → app aliases → relative → types → styles.
