---
name: start-task
description: >-
  Starts a development task by creating a correctly named feature branch from
  main with type and monorepo scope (mobile, backend, telegram, firmware,
  shared, api-client, docs, docker). Use when the user starts a task, asks for
  a new branch, or says /start-task.
---

# Start task

Every task gets its own branch from `main`. The branch **must** include the project scope being touched.

## Steps

1. **Confirm working tree**
   - Run `git status -sb`
   - If there are unrelated dirty changes, stop and ask what to do (stash, commit, or discard)

2. **Identify type and scope**
   - Ask if not clear from the user message:
     - **type**: `feature` | `fix` | `refactor` | `docs` | `chore` | `test` | `perf`
     - **scope** (required): `mobile` | `backend` | `telegram` | `firmware` | `shared` | `api-client` | `docker` | `docs` | `monorepo`
     - **short description**: 2–5 kebab-case words in English
   - Infer from context when obvious (e.g. Expo UI → `mobile`, MQTT API → `backend`)

3. **Sync main**
   ```bash
   git checkout main
   git pull origin main
   ```
   - If `main` has no upstream yet, skip pull and continue from local `main`

4. **Create and checkout the branch**
   - Name: `<type>/<scope>-<short-description>`
   - Rules: lowercase, digits, hyphens only; no underscores or accents
   ```bash
   git checkout -b feature/mobile-device-list
   ```

5. **Confirm to the user**
   - Branch name
   - Scope / paths expected (`apps/mobile`, etc.)
   - Remind: one concern per PR; see `docs/GITHUB.md`

## Examples

| Task | Branch |
| --- | --- |
| Lista de dispositivos en Expo | `feature/mobile-device-list` |
| Reconnect MQTT en API | `fix/backend-mqtt-reconnect` |
| Tipos de AcState | `refactor/shared-ac-state-types` |
| Clarificar desired vs reported | `docs/specs-ir-state` |
| Captura IR en ESP32 | `feature/firmware-ir-capture` |

## Rules

- Never commit or push in this skill unless the user asks
- Never work on `main` for the task itself
- If already on a correctly named task branch for the same work, do not create another
- Prefer the primary scope when multiple areas are touched; note others in the future PR title
