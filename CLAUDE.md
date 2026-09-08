# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AirManager is a short-term rental property management dashboard: React SPA + Express REST API + PostgreSQL (Drizzle ORM). Single Node process serves both the API and (in production) the built client.

## Commands

```bash
npm run dev          # tsx server/index.ts — API + Vite middleware, http://localhost:5000
npm run check         # tsc typecheck (no emit)
npm run lint          # eslint . --ext .ts,.tsx --max-warnings 0 (must be zero warnings)
npm run format         # prettier --write client/src, server, shared
npm test               # vitest run (see Testing below — needs .env.test)
npm run build          # script/build.ts — vite build (client) + esbuild bundle (server) -> dist/
npm start               # NODE_ENV=production node dist/index.cjs
npm run db:push         # drizzle-kit push --force — NEVER run against production
```

Single test file: `npx vitest run tests/storage.test.ts`. Single test name: `npx vitest run tests/storage.test.ts -t "name substring"`.

### Testing setup

Tests need a dedicated, non-superuser Postgres role with `CREATEDB`. Copy `.env.test.example` to `.env.test` and fill in `DATABASE_URL` (see that file for the exact `CREATE ROLE` statement). `tests/setup.ts` connects to the DB named in `DATABASE_URL` only to `CREATE DATABASE`/`DROP DATABASE`, then redirects every query to a throwaway `airmanager_test_<pid>` database — this is why the suite refuses to run if `NODE_ENV=production` or `DATABASE_URL` contains `prod`/`production`. `vitest.config.ts` disables file parallelism (`fileParallelism: false`, sequential) because tests share this DB-creation lifecycle. Never point `.env.test` at production, and never run `db:push --force` there.

## Architecture

### Layout
- `client/src/` — React 19 + Vite + TanStack Query + wouter routing + Tailwind + shadcn/ui. `client/src/lib/api.ts` holds the TanStack Query hooks for every endpoint; `client/src/lib/queryClient.ts` has the `apiRequest` helper.
- `server/` — Express 5 API.
  - `routes.ts` — nearly all REST endpoints (large file; domain extraction is known future work, see `docs/HANDOVER-20260908.md`).
  - `storage.ts` — `DatabaseStorage` class implementing an `IStorage` interface; all DB access goes through here.
  - `db.ts` — Drizzle/pg connection, built from `config.databaseUrl`.
  - `config.ts` — centralized env var validation; import `config` rather than reading `process.env` directly elsewhere.
  - `followups/engine.ts`, `pricing/engine.ts`, `tickets/engine.ts` — background schedulers (guest follow-ups, dynamic pricing recommendations, support-ticket triage), each optionally AI-assisted via `server/ai/gateway.ts` with a non-AI fallback. Started from `server/index.ts` on boot and cleared on shutdown.
  - `scheduler-runs.ts` / `runTracked()` — wraps each scheduler run and persists start/finish/status/error to the `scheduler_runs` table, because the in-memory overlap guards are process-local and don't survive a restart.
  - `logger.ts` — `log`/`logStructured` are extracted here (not defined in `index.ts`) specifically to avoid circular imports from test code.
- `shared/schema.ts` (+ `shared/models/chat.ts`) — Drizzle table definitions and `drizzle-zod` insert schemas, imported by both client and server via the `@shared/*` path alias (see `vite.config.ts` / `vitest.config.ts`).
- `mcp/airmanager/` — a separate, independently-deployed read-only MCP server exposing 12 list/get tools (properties, bookings, guests, expenses, dashboard, health) over Streamable HTTP. Deployed on the VPS as `airmanager-mcp.service`, not part of the main app build. See `mcp/airmanager/README.md` before touching it.
- `docs/OPERATIONS.md` — deployment, backup/recovery and data-definition reference for the production VPS. `docs/HANDOVER-20260908.md` is a dated snapshot of a specific repair effort (useful for "why is X the way it is" history, not living documentation).

### Domain notes worth knowing before changing booking/pricing code
- Booking dates are date-only strings, operational timezone is Asia/Kolkata. Statuses: `upcoming` → `checked_in` (`current` is a legacy alias) → `checked_out`/`completed`; undo actions step backward one stage. A checkout cannot happen before check-in.
- Capacity/lifecycle rules are enforced twice: in `storage.ts` under a write lock, and again by a Postgres trigger, which also records `booking_status_events`. Don't rely on only the application-level check.
- Properties can be `whole`- or `room_based` `bookingMode`; room-based properties track per-room-type inventory (`rooms.roomCount`). Unassigned reservations consume total property capacity; reservations tied to a `roomId` consume that room type's capacity.
- Occupancy on the dashboard/property views is the current calendar month; on the Analytics page it's the selected date range (inclusive end date). Both are booked room-nights, not confirmed attendance.
- Revenue = booking value excluding cancellations/blocked dates, not verified payouts. Profit = revenue minus recorded `expenses` rows only — absence of expense entries does not mean expenses were zero.

### Config, security middleware (`server/index.ts`)
- `helmet` (CSP intentionally disabled — inline bootstrap script), manual security headers, `cors` with an explicit origin whitelist from `config.cors.origins`, `express-rate-limit` on `/api` (general 200/15min, AI endpoints 30/15min, Google Drive import 20/15min).
- Sessions via `express-session` + `connect-pg-simple` against the `session` table (declared in `shared/schema.ts` so `drizzle-kit push` doesn't treat it as a rename candidate).
- Per-request `correlationId`, structured request logging, and a timeout middleware (30s default, 120s for AI/`ai-enrich` paths).
- AI and Google Drive routes degrade gracefully (503 with a message) rather than crashing when their API keys are unset.

## Repository / deployment rules

Full detail in `AGENTS.md` and `docs/OPERATIONS.md`; the essentials:
- Canonical remote is `https://github.com/lodharishab/AirManager.git`, branch `main`. An old `feliciaofficial/AirManager` fork still exists on GitHub but is no longer configured as a remote in this worktree — never push new work there. Verify `git remote get-url origin` before pushing, and don't force-push. (`AGENTS.md` and `docs/OPERATIONS.md` still describe it under the remote name `legacy-fork`, which other clones may retain.)
- Keep `.env`, `.env.test`, uploads, database dumps, and n8n/MCP exports out of Git (already covered by `.gitignore`).
- CI (`.github/workflows/ci.yml`) runs `npm run check`, `npm run lint`, `npm test` (against an ephemeral `airmanager_test` Postgres role), then `npm run build` on every push to `main` and on PRs.
