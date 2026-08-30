# Autonomous Build Log

Summary of the session that resumed the autonomous RecipBot build (Phase 2.5 → Phase 6) after the IDE closed.

## State found at resume

Phases 2.5 (auth), 3 (scraper), and 4 (search) were already complete from the prior session: branches pushed, PRs #4/#5/#6 open as drafts against `feat/recipe-management`/`main`, all CI checks green. `feat/frontend` was checked out locally with a substantial Vue 3 scaffold already written to disk (components, pages, stores, API client, router, unit tests) but **never committed** - Phase 5 was in progress, not started from scratch.

## This session: Phase 5 (frontend)

- Verified the existing scaffold: tests, lint, type-check, build - all clean once a few CI-only issues were fixed (see below).
- Committed it in 5 commits and opened **PR #7** (`feat/frontend` → `feat/recipe-management`).
- Fixed to get CI green:
  - `vitest`'s default `forks` pool crashed under the CI runner's Node version (`webidl.util.markAsUncloneable is not a function`, a jsdom 30 / undici incompatibility) - switched to the `threads` pool.
  - Same root cause required bumping the frontend CI job from Node 20 to Node 22.
  - Added a `Test (frontend)` CI job (lint, type-check, vitest coverage ≥80%, build) and folded it into the Quality Gate.

## This session: Phase 6 (E2E tests)

Added a Playwright suite (`feat/e2e-tests` → `feat/frontend`, **PR #8**) covering auth (redirect-when-unauthenticated, register→login→logout, invalid credentials) and manual recipe CRUD (create, list, edit, delete, native title-length validation).

**Out of scope:** `from-url` import and tag search aren't covered - both live on `feat/recipe-scraper`/`feat/recipe-search`, which branch off `feat/recipe-management` independently and aren't merged alongside the frontend's backend, so there's no live endpoint to exercise yet. `frontend/src/api/recipes.ts` has a note on this.

### Bugs found (and fixed, on `feat/frontend`)

E2E caught two real bugs unit tests had missed:

1. **Login silently didn't log you in.** `isAuthenticated` was `computed(() => Boolean(getToken()))`. `localStorage` isn't a reactive Vue source, so the computed cached its first-ever read (`false`, from the router guard checking before any login) and never re-evaluated - a successful login still left the guard seeing "not authenticated" and bounced the user straight back to `/login`. Fixed by making it an explicit `ref` updated by `login`/`logout`/a new `clearSession()` (also now used by the 401 response interceptor, which previously mutated `localStorage` directly without touching this state at all).
2. **Editing a recipe did nothing.** `RecipeFormPage` mounts `RecipeForm` before its `getRecipe()` fetch resolves, but `RecipeForm` only read the `recipe` prop into local fields once, at setup. The (required) Ingredients field stayed empty once the real data arrived, and the browser's native validation silently blocked every save - no request ever left the page. First fix attempt (re-sync via a `watch`) introduced a *new* bug: it could clobber whatever the user had already typed if the fetch landed after they started editing. Final fix: `RecipeFormPage` now withholds `<RecipeForm>` until the recipe has actually loaded, so the component's original once-at-setup read is safe again.

### Other blockers hit and resolved

- **Login throttle vs. E2E.** `routes/api.php` throttles `/auth/login` to 5 requests/15 minutes (by IP, real security feature, not test-aware). Early runs self-locked by submitting the login form once per spec, plus retries, plus parallel workers all sharing the same counter. Fixed by: a `global-setup.ts` that authenticates once, directly against the API, and hands specs a saved Playwright storage state instead of each one driving the login form; `workers: 1`, `retries: 0`; and only `auth.spec.ts` itself still exercises the real login form (2 real attempts total).
- **vitest picked up the Playwright specs.** `e2e/*.spec.ts` matched vitest's default test glob and failed as vitest tests (`test.use()` isn't a vitest API). Added an explicit `exclude` for `e2e/**` in `vite.config.ts`.

## Where things stand

| PR | Branch → base | Status |
|----|---|---|
| #4 | `feat/recipe-management` → `main` | Draft, CI green |
| #5 | `feat/recipe-scraper` → `feat/recipe-management` | Draft, CI green |
| #6 | `feat/recipe-search` → `feat/recipe-management` | Draft, CI green |
| #7 | `feat/frontend` → `feat/recipe-management` | Draft, CI green |
| #8 | `feat/e2e-tests` → `feat/frontend` | Draft, CI green |

All backend/frontend unit tests stay ≥80% coverage; every PR's Quality Gate is green.

## Left for review / next steps

- **Merge order isn't linear.** `feat/recipe-scraper`, `feat/recipe-search`, and `feat/frontend` all branch off `feat/recipe-management` *independently* (not off each other), so merging all four into `main` will need real conflict resolution wherever they touch the same files (e.g. `routes/api.php`, `frontend/src/api/recipes.ts`'s from-url/search calls) - there's no backend branch today that has scraper + search + frontend all together.
- Once `feat/recipe-scraper` and `feat/recipe-search` are merged (or merged into a shared integration branch), the from-url and tag-search flows should get their own E2E coverage - the frontend and its API client are already written against those specs, just untested end-to-end.
- All five PRs are still **drafts** - nothing has been merged. Awaiting your review.
