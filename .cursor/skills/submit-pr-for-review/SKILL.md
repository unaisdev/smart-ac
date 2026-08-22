---
name: submit-pr-for-review
description: >-
  Ensures a PR exists for the current branch (creates it only if missing), runs
  create-pr-description, updates the PR title/body, and reports the PR URL. Use
  when the user wants to open or update a PR, submit a PR for review, or run
  /submit-pr-for-review.
---

# Submit PR for review

End-to-end: ensure PR → generate description → update title/body → return URL.

Opening or updating a PR does **not** imply the work is finished. Ask before treating it as ready for review.

## Steps

1. **Confirm you are not on `main`**
   - `git branch --show-current`
   - If on `main`, stop and run or suggest `start-task`

2. **Validate branch naming**
   - Expect `type/scope-description` per `docs/GITHUB.md`
   - If the name is wrong, warn and ask whether to rename before continuing

3. **Push the branch if needed**
   - `git status -sb` and, if upstream exists, `git log @{u}..HEAD --oneline`
   - If unpushed commits or no upstream: `git push -u origin HEAD`
   - On push failure, stop and report

4. **Get or create the PR**
   - `gh pr view --json url,number,title,body`
   - If a PR exists: keep it (never open a second one)
   - If none:
     ```bash
     gh pr create --title "<temp from branch>" --body "WIP — description pending"
     ```

5. **Run `create-pr-description`**
   - Read and follow `.cursor/skills/create-pr-description/SKILL.md` fully
   - It writes `.cursor/skills/create-pr-description/output.md`

6. **Ask if the task is ready for review**
   - **Ready**: mark checklist items as `- [x]` on the live PR body
   - **WIP**: leave checklist as `- [ ]`

7. **Update the PR**
   - Read `output.md`
   - Title = the `[TYPE][SCOPE] …` line
   - Body = rest of the template (no “PR Title” label line)
   ```bash
   gh pr edit <number> --title "<PR Title>" --body-file <path>
   ```

8. **Return the PR URL**
   - State clearly if it is still WIP

## Rules

- Never create a second PR for the same branch
- Always run `create-pr-description` before editing the body
- Do not force-push, amend, or change git config
- Do not skip the ready-for-review question
- Follow security rules: no secrets in title/body
