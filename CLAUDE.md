# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Aftertaste is a personal diary for books, films, series, theatre, music, exhibitions and talks. Monorepo with `frontend/` (Vue 3 + Vite) and `backend/` (NestJS + Prisma + PostgreSQL). Development notes, product decisions, and visual-direction history live in `AGENTS.md`, `PRODUCT.md`, `DESIGN.md` and `docs/` — consult them before changing user-facing behavior or styling, and update them when a decision changes.

## Commands

Node 24 (`.nvmrc`). Dependencies are installed separately in each package. Backend scripts rely on an npm workspace prefix invoked from `frontend/`.

```sh
nvm use
(cd frontend && npm install)
(cd backend  && npm install)
```

Daily work (from `frontend/`):

- `npm run dev` — runs Vite and `nest start --watch` together (`run-p dev:frontend dev:backend`). Vite proxies `/api` to `http://localhost:3000` (override via `AFTERTASTE_API_PROXY`).
- `npm run dev:frontend` / `npm run dev:backend` — run only one side.
- `npm run type-check` — `vue-tsc --build`; `npm run build` runs type-check and `vite build` in parallel.

Backend (from `backend/`):

- `npm run start:dev` — NestJS watch mode on port 3000 (`PORT` to change).
- `npm run start:prod` — `prisma migrate deploy && node dist/main.js` (used by the Docker image).
- `npm run db:migrate:dev` — create/apply a dev migration. `npm run db:generate` after schema edits.
- `npm test` — Vitest unit tests (`**/*.spec.ts`). `npm run test:watch`, `npm run test:cov`.
- `npm run test:e2e` — `test/app.e2e-spec.ts` via Supertest (uses `vitest.config.e2e.ts`).
- `npm run test -- src/account/account.service.spec.ts` — run a single spec.
- `npm run lint` — `oxlint --type-aware` over `src/` and `test/`.

Full stack via Docker (from repo root): `docker compose up --build`. Frontend on http://localhost:8080, Adminer on http://localhost:8081, Mailpit SMTP on 127.0.0.1:1026 and web UI on http://localhost:8026. `docker compose down -v` wipes the `aftertaste-db` and `aftertaste-data` volumes.

## Architecture

### Stack and request flow

Browser → Vite dev server (or nginx in Docker) → NestJS (`/api/*`) → Prisma → PostgreSQL. Mailer uses Nodemailer SMTP (Mailpit locally). Auth state lives server-side in a `Session` row; the browser only holds an HttpOnly cookie.

### Backend (NestJS, ESM, `type: module`)

`src/main.ts` bootstraps `AppModule` with: 20 MB JSON body limit (kept in sync with `deploy/nginx.conf`), `trust proxy` from `TRUST_PROXY=true`, custom middleware `requestSecurity` + `authRateLimit`, and CORS limited to `FRONTEND_ORIGIN` (comma-separated). Prisma access is centralized in `PrismaModule` / `PrismaService`.

Feature modules in `src/`:

- `auth/` — registration, login, sessions, password reset (SHA-256 hashed tokens, Nodemailer via `MailerService`), profile, `AuthGuard` that resolves the session cookie on every request.
- `account/` — per-user category settings (`CategorySetting`), custom categories (`CustomCategory`), privacy toggles (`plansVisible`, review visibility).
- `catalog/` — CRUD for `Entry` (books, films, series, theatre, music, exhibitions, podcasts, lectures, custom). Behind `AuthGuard` and scoped to `userId`.
- `social/` — friendships, follows, recommendations. See `docs/SOCIAL.md`.

Every mutating `/api/*` request requires the header `X-Aftertaste-Request: 1` (CSRF belt-and-braces; the frontend sets it in `api/http.ts`).

Prisma schema at `backend/prisma/schema.prisma`; migrations in `backend/prisma/migrations/`. Entry invariants: for `status=plan` the server stores `rating`, `month`, `date`, `dateStart` as NULL; for `status=done` the user supplies rating 1–10 and month. Historical notes per migration are captured in `docs/ARCHITECTURE.md`.

### Frontend (Vue 3, Composition API, TypeScript strict, SCSS)

Own modular architecture inspired by FSD — **not strict FSD**. Rules codified in `docs/ARCHITECTURE.md` (Russian) and enforced in reviews:

```
frontend/src/
  app/        # App.vue, main.ts, layout shell (AppLayout/Header/Footer)
  pages/<page>/{Page.vue, components/, composables/}
  entities/   # domain models + domain UI (entry, person)
  stores/     # Pinia stores grouped by concern (auth, preferences, social)
  api/        # HTTP clients: http.ts (fetch + cookie + CSRF header), catalog.ts, auth.ts, account.ts, social.ts
  shared/     # ui/{buttons,form,modals,feedback}, lib/, composables/
  styles/     # all SCSS — never beside .vue (see below)
  mocks/      # throwaway sample data; delete on wiring real sources
```

Dependency rules: `app` wires everything; pages use stores/api/entities/shared; stores may use api + entities; api uses models + shared only; entities and `shared/` have no page/store/api imports; no cross-page imports. External imports of a module with an `index.ts` go through it; inside a module use the `@/` alias to its own files (not the public barrel).

Session lifecycle lives in `App.vue`: it waits for `auth.restore()`, swaps in `AuthPage` or the appropriate top-page, and on login triggers `preferences.load()` and `social.load()`. `catalog.ts` dispatches a session-expired event on 401 that `App.vue` wires to the auth store.

### Styles

All SCSS lives under `frontend/src/styles/` (`layout/`, `catalog/`, `ui/`, plus `main.scss`, `_variables.scss`, `_mixins.scss`). Vue components reference them with `<style scoped lang="scss" src="@/styles/…"></style>`; file names are kebab-case (e.g. `EntryCard.vue` → `styles/catalog/entry-card.scss`). Use semantic variables and the `@include container`, `respond-below/above` mixins; never introduce new breakpoints without need. `AGENTS.md` records the current visual direction (wine `#4F1718`, Onest, avant-garde placeholders in `public/category-covers/avant-garde-v1/`) and every reversal — check it before changing palette, typography, imagery, or the modal/button system.

### Form conventions

Form rules (used across forms, enforced by shared `BaseInput`/`BaseSelect`/`BaseTextarea`/`RatingInput`):

- Vuelidate in the form; shared UI receives the final string via `error` prop — it doesn't import Vuelidate.
- No validation errors until the user tries to submit; after that, re-validate on edit. Focus the first invalid field on failed submit. `novalidate` disables native popups.
- Floating labels; absolute-positioned error text with reserved space; `aria-invalid` + `aria-describedby`.
- `BaseButton` has exactly two variants (`primary`, `secondary`) with a single `$radius-button`; no local overrides.
- Below 480px every `BaseModal` becomes a bottom sheet with swipe-down close and stacked full-width actions; use the `modal-actions` mixin, not per-modal CSS.

## Data and secrets

- PostgreSQL volume: `aftertaste-db` (Docker). Legacy JSON import path is `aftertaste-data/entries.json` (kept as backup only).
- Local SMTP: Mailpit. Real deployments configure `SMTP_HOST/PORT/USER/PASSWORD/SECURE/REQUIRE_TLS` and `PUBLIC_APP_URL` (used in password-reset links).
- Session cookie is HttpOnly, Secure in production (`COOKIE_SECURE=true`), 30-day expiry. All access to entries/account/social is scoped to `request.user.id` from `AuthGuard`.

## When editing

- Changing user-visible wording, palette, typography, modal behavior, or catalog UX: confirm against `AGENTS.md` (there is a long trail of accepted/rejected directions — many "experiments" in `frontend/public/previews/` and `.impeccable/mocks/` are explicitly **not** approved for the live app).
- Changing Entry fields: update `backend/prisma/schema.prisma`, add a migration under `backend/prisma/migrations/<timestamp>_<name>/`, extend `src/catalog/entry.ts` validation, and mirror the type in `frontend/src/entities/entry/model/`.
- Changing auth, account settings, or social surface: keep the API table in `docs/AUTH.md` / `docs/SOCIAL.md` honest.
- Learning notes (`learning/*.md`) are updated whenever the user asks for theory — see the convention in `AGENTS.md`.
