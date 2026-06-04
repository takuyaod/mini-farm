---
name: mini-farm-playwright
description: Use this skill when verifying the mini-farm Next.js app UI with the local Playwright CLI, especially for dashboard, zones, alerts, settings, authentication, responsive behavior, or regression checks. Supports explicit invocation with arguments such as instruction, base_url, auth, and mutate_policy, and includes guardrails to avoid polluting the local Supabase development database.
---

# Mini Farm Playwright

## Purpose

Use the local Playwright CLI to operate and verify this mini-farm app from the browser, with a reproducible auth setup and strict care around Supabase dev data.

Invocation examples:

```text
$mini-farm-playwright instruction="Verify the dashboard renders seeded zone data after login"
$mini-farm-playwright instruction="Check mobile layout for /zones" base_url="http://localhost:3000" auth="seed" mutate_policy="read-only"
$mini-farm-playwright instruction="Verify adding a zone works" mutate_policy="isolated"
```

Treat `instruction` as the primary task argument. If omitted, infer the task from the user's message.

## Arguments

- `instruction`: Browser task, assertion, route, viewport, or workflow to verify.
- `base_url`: App URL. Default `http://localhost:3000`.
- `auth`: `seed` by default. Use the seeded local Supabase user (`dev@example.com` / `devpassword123`) by preparing Playwright storage state.
- `mutate_policy`: Default `read-only`. Use `isolated` for create/update/delete checks. Use `transactional` only when the user explicitly asks to mutate the already-running local DB.
- `viewport`: Optional viewport hint such as `desktop`, `mobile`, or concrete dimensions.
- `artifacts`: Optional path for screenshots, generated scripts, traces, or notes. Prefer `/tmp/mini-farm-playwright-*`.

## Workflow

1. Read the user's `instruction` and classify it as read-only or mutating.
2. For mutating checks, prefer an isolated Supabase environment:

```bash
node .codex/skills/mini-farm-playwright/scripts/prepare-isolated-supabase.mjs --start
```

Then run the app on a separate port with the generated env values:

```bash
cd app
env $(cat /tmp/mini-farm-playwright-*/.env.isolated | xargs) npm run dev -- -p 3100
```

If `next dev` panics under Turbopack or reports that the Next.js package cannot be found, restore `app/node_modules` from the lockfile if needed and retry with webpack:

```bash
cd app
npm ci
env $(cat /tmp/mini-farm-playwright-*/.env.isolated | xargs) npm run dev -- -p 3100 --webpack
```

3. For read-only checks, use existing services when available. Do not reset the DB unless the user explicitly asks.
4. Prepare auth state when protected pages are involved:

```bash
node .codex/skills/mini-farm-playwright/scripts/prepare-auth-state.mjs \
  --base-url http://localhost:3000 \
  --out /tmp/mini-farm-playwright-auth.json
```

When using an isolated Supabase env, pass the generated env values to this command too; otherwise it may sign in against the regular local Supabase:

```bash
env $(cat /tmp/mini-farm-playwright-*/.env.isolated | xargs) \
  node .codex/skills/mini-farm-playwright/scripts/prepare-auth-state.mjs \
  --base-url http://localhost:3100 \
  --out /tmp/mini-farm-playwright-auth.json
```

5. Use Playwright CLI with the generated storage state:

```bash
playwright codegen --load-storage=/tmp/mini-farm-playwright-auth.json http://localhost:3000
```

6. Prefer resilient locator observations from Playwright codegen: roles, labels, text, and stable route changes.
7. Record only the minimum artifacts needed to support the answer. Keep auth files in `/tmp` and delete them when no longer needed.
8. Summarize what was verified, what command(s) were run, and any risk or skipped coverage.

## Isolated Auth Fallback

If `prepare-auth-state.mjs` reports `invalid_credentials` in an isolated environment:

1. Try the idempotent repair SQL against the isolated DB only:

```bash
supabase db query --workdir /tmp/mini-farm-playwright-* --local \
  --file /absolute/path/to/.codex/skills/mini-farm-playwright/references/ensure-seed-auth.sql
```

Use an absolute SQL file path because `--workdir` changes the Supabase project directory.

2. If seed sign-in still fails, create a throwaway Auth user through the isolated Auth admin API and use that user for the browser check. This is preferred over hand-crafting cookies because the app uses `getUser()` for mutating Server Actions. Use the isolated `SERVICE_ROLE_KEY` from `supabase status --workdir ... -o env`, then create a temporary email such as `playwright-zone@example.com` and prepare auth state with `--email` / `--password`.

Do not create fallback users in the regular local DB unless the user explicitly requests transactional mutation.

## DB Safety

The local development DB must not be casually polluted.

- Default to read-only verification: load pages, navigate, inspect content, check responsive layout, and take screenshots.
- For any create/update/delete verification, prefer `mutate_policy="isolated"` and create a throwaway Supabase project under `/tmp`.
- Do not use the emulator start endpoint unless the task requires live sensor inserts.
- Do not create, edit, resolve, harvest, deactivate, delete, or reissue records in the regular local DB unless `mutate_policy="transactional"` or the user's instruction explicitly requires it.
- For isolated mutating checks, it is acceptable to freely create data in the throwaway Supabase project. Stop that project after verification.
- For transactional checks against an existing DB, capture existing row IDs/counts before the operation and clean up only records created by the check. Never remove seeded baseline rows.
- If cleanup is uncertain, stop and report the residual test data instead of guessing.
- Never commit auth state, screenshots with secrets, generated traces containing cookies, or `.env` values.

Seeded local credentials and IDs are documented in `references/local-auth.md`.

If `prepare-auth-state.mjs` reports `invalid_credentials`, follow **Isolated Auth Fallback** above for isolated environments. If it happens in the regular local DB, do not create a new user through the UI; run local-auth repair only when the user explicitly agrees or the requested verification requires authenticated pages.

## Playwright CLI Notes

Official Playwright docs describe `codegen --save-storage` and `codegen --load-storage` for preserving authenticated state, and recommend checking `playwright --help` for the current CLI surface. Use those flags for this skill.

Useful commands:

```bash
playwright --help
playwright codegen --load-storage=/tmp/mini-farm-playwright-auth.json http://localhost:3000
playwright screenshot --full-page http://localhost:3000 /tmp/mini-farm-dashboard.png
```

If `playwright` is not on PATH in the current shell, check the user's installed CLI path first. If the project later adds Playwright locally, prefer `app/node_modules/.bin/playwright`.

If Playwright is missing, `npx --yes playwright --version` is a quick check. If tests need `@playwright/test`, prefer a temporary install that does not change manifests:

```bash
cd app
npm install --no-save --package-lock=false @playwright/test@<version> next@<locked-next-version>
```

Include the locked Next.js version to avoid node_modules drifting from `package-lock.json`; if drift occurs, restore with `npm ci`. If browsers are missing, install only Chromium with `npx playwright install chromium`.

When scripting is needed, create temporary scripts under `/tmp` or a dedicated untracked artifact path. Keep committed tests out of scope unless the user asks to add tests.

For database verification through `supabase db query`, cast enum values to text (for example `type::text as type`) because some CLI versions cannot scan custom enum OIDs.
