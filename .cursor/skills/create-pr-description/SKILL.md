---
name: create-pr-description
description: >-
  Generates a PR title and body from the current branch diff using
  .github/PULL_REQUEST_TEMPLATE.md and docs/GITHUB.md conventions. Use when
  writing a PR description or when submit-pr-for-review needs the description.
---

# Create PR description

Role: Senior engineer writing a clear PR for teammates (and future you).

## Steps

1. Run `git diff main...HEAD` and `git log main..HEAD --oneline` to read the changes.
2. Ask if needed: **"¿Hay issue o tarea de referencia (título + enlace)?"** — optional for this repo.
3. Read `.github/PULL_REQUEST_TEMPLATE.md` and use it as the exact structure to fill.
4. Infer **type** and **scope** from the branch name and diff (see `docs/GITHUB.md`).
5. Write the filled template to `.cursor/skills/create-pr-description/output.md`.

## Output rules

### PR Title (first line of `output.md`)

Format: `[TYPE][SCOPE] Short description in English`

**TYPE** (pick one primary; combine with `[TS]` when useful):

| Tag | When |
| --- | --- |
| `[FEAT]` | New behaviour / API / UI |
| `[FIX]` | Bugfix |
| `[TS]` | Refactor, types, tooling, deps |
| `[DOCS]` | Docs only |
| `[TEST]` | Tests only |

**SCOPE** from paths touched (uppercase): `MOBILE`, `BACKEND`, `TELEGRAM`, `FIRMWARE`, `SHARED`, `API-CLIENT`, `DOCKER`, `DOCS`, `SPECS`, `MONOREPO`. Use the primary scope; add a second if the diff is clearly split.

Examples:

```text
[FEAT][MOBILE] Add device list screen
[FIX][BACKEND] Reconnect MQTT on broker drop
[TS][SHARED] Tighten AcState types
[DOCS][SPECS] Clarify IR state model
```

### Body

- Language: **Spanish**
- Concise bullets; no fluff
- **Qué ocurría**: only for `[FIX]`; omit the section otherwise
- **Qué se hizo**: real changes; if meaningful UI impact, keep before/after table with dummy placeholders telling the author to add screenshots; omit table for pure logic/docs
- **Cómo se prueba**: concrete steps; distinguish mock vs real ESP32 when relevant
- **Do not** invent CI results or claim tests were run unless evidenced
- Checklist: copy from template with all boxes unchecked `- [ ]`
- No secrets in the description

## Rules

- Do not create the GitHub PR in this skill (that is `submit-pr-for-review`)
- Do not deviate from the template sections
- Prefer accuracy over completeness
