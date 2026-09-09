# Pending Work

Last updated: 8 September 2026, after deploying `e0a8ade` (PR #3).

This picks up where `docs/HANDOVER-20260908.md` left off. That document's
"Remaining engineering work" list is now mostly closed; what follows is what
is genuinely still open.

## Deployed in this round (PR #3, merge `e0a8ade`)

Eight commits closing the engineering backlog. All verified before and after
deploy: typecheck, lint and build exit 0 with zero warnings, 191 tests pass
across 9 files, `/api/health` OK over both loopback and HTTPS, protected
routes return 401 unauthenticated, and booking/property data was unchanged
across the deploy (16 bookings, 3 properties).

| Commit | Change |
|---|---|
| `a0cc309` | Lint failure (`any[]`) and inverted `NODE_ENV` guard in `vite-plugin-meta-images.ts` |
| `ec0f1cf` | Accessible labels on icon-only buttons (housekeeping, reviews, gallery) |
| `9221ce0` | Gallery mixed-media wording; shared `isVideoUrl` helper |
| `1aabf15` | Documented test-role requirements in `.env.test.example` |
| `843d81d` | CI workflow: typecheck, lint, test, build |
| `7c974cc` | Upload magic-byte verification |
| `79d7cb4` | Persisted scheduler last-run state (`scheduler_runs`) |
| `9bac6e6` | Route code-splitting; dev Vite excluded from server bundle |

Migration `scripts/migrations/20260908-scheduler-runs.sql` was applied to
production with `ON_ERROR_STOP` before the restart. Pre-deploy backup:
`/var/backups/airmanager/20260908T165734Z` (verified).

Client initial JS went from 1,322 kB to 383 kB (356 kB to 119 kB gzipped)
across 60 on-demand chunks. The server bundle is unchanged in size (~1.47 MB);
externalising `./vite` removed warnings, not weight.

## Follow-up fixes (8 September, evening audit)

An independent multi-agent audit the same evening found two further items,
both fixed and deployed before commit (see `fix/audit-followups-2` on
`main`):

- **Unauthenticated path traversal in `GET /api/uploads/:filename`** — the
  route is registered before `requireAuth` and Express 5 decodes `%2f`, so
  an unauthenticated caller could read arbitrary files via `../` sequences
  (verified live: `/etc/hostname` readable with no credentials; a one-level
  `..%2f.env` would have reached `.env`). Filenames are now whitelisted to
  `^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$` in `server/object-storage.ts` and
  rejected with 400 before any path join. Three regression tests added
  (191 → 194).
- **Fire-and-forget email failures are no longer silent** — the
  `sendEmail(...).catch` in the notification helper now logs a structured
  warn with recipient and error.

Also fixed outside the repo (infrastructure): the n8n Docker container
published `0.0.0.0:5678`, which bypassed UFW (Docker installs its own
PREROUTING rules) and exposed the n8n editor to the public internet.
`/opt/n8n/docker-compose.yml` now binds the port to `127.0.0.1` and the
tailnet IP only.

## Correction to the previous handover

`docs/HANDOVER-20260908.md` states "Strict ESLint passed with zero errors and
zero warnings." That was **not true** of the state it described: `npm run lint`
runs with `--max-warnings 0` and failed on `vite-plugin-meta-images.ts:74`.
Fixed in `a0cc309`. CI now prevents the claim from drifting from reality again.

## Owner action — needs your decisions or data, not code

1. **Historical 26-27 August stays.** Bookings 14-17 (property 5, Rivaan) need
   verification against real records: actual stays, moves/refunds, room
   allocation. Note these are `status='completed'` — there is **no `draft`
   status** in this system despite the earlier docs' wording, so do not look
   for a Draft filter in the UI.
2. **Rivaan room breakdown.** 2 named rooms + 9 placeholders at
   `nightly_rate=0` = 11 total. The nine need real types, rates and capacity
   before OTA room types can be assigned.
3. **Expense ledger is empty** (`SELECT count(*) FROM expenses` = 0). Profit
   and analytics stay structurally incomplete until real expenses are entered.
   Booking value is not bank income.
4. **Off-server backups.** `scripts/backup-airmanager.sh` writes only to
   `/var/backups/airmanager` — no rsync/rclone/S3 anywhere. Daily timer keeps 7
   copies. This does not protect against total VPS loss. Pick an encrypted
   off-site destination.
5. **Google Drive import** needs its API key. The route returns a clean 503
   when unset (`server/routes.ts`), so this fails gracefully rather than badly.
6. **Notification delivery is uncertified.** Email goes out via Resend from
   `server/routes.ts:259` as fire-and-forget with `.catch(() => {})`, so
   failures are silently swallowed. There is no SMS or push provider. OTA
   ingestion is iCal only. Verify real delivery before depending on it.

## Engineering backlog — still open

1. **Split `server/routes.ts` (2,238 lines) and `server/storage.ts` (1,272).**
   The single largest remaining item; deliberately excluded from PR #3 because
   it is a behaviour-preserving refactor deserving its own branch and review.
   Suggested split by endpoint prefix: properties/rooms, bookings/availability,
   guests, housekeeping, tickets, reviews, gallery/uploads, finance
   (expenses/pricing), enquiries/follow-ups, notifications/conversations, auth
   and preferences, admin (settings/export/dashboard/health). Mirror the same
   domains under `server/storage/`. The 191 existing tests are the safety net.
2. **Fire-and-forget email — closed 8 September.** Delivery failures now
   log a structured warn (see follow-up fixes above). Persisting failures to
   a table the way `scheduler_runs` records job outcomes remains optional
   future work if ever needed.
3. **Media transcoding** is not implemented. Uploads are now verified by magic
   bytes (`server/object-storage.ts`) but never re-encoded or normalised.
4. **Scheduler observation.** `scheduler_runs` now records start, finish,
   status, duration and counts, exposed at `GET /api/scheduler-runs` (session
   required). A row still reading `running` with an old `last_started_at` means
   a process died mid-cycle. Nothing surfaces this in the UI yet, and the
   long-duration behaviour still wants observing across real restarts.
5. **Remaining QA.** Desktop, invoice/print and 404 paths, plus exhaustive
   interaction and accessibility passes, were never completed. PR #3 covered
   only the specific icon buttons found in the audit.
6. **Old revoked secrets remain in git history.** `.env` was tracked in
   `8eb8bc1` and `cf62050`, untracked in `9523473`. Those blobs are still
   reachable on the VPS and on GitHub. History was never rewritten. The values
   were rotated, so this is hygiene rather than live exposure.

## Repository and infrastructure hygiene

- **`upstream` is a duplicate of `origin`** (both `lodharishab/AirManager`).
  Safe to remove: `git remote remove upstream`.
- **`legacy-fork/main` is 4 commits behind `origin/main`, not diverged.** It is
  a strict ancestor, so a plain fast-forward push syncs it. **Do not use
  `--force`** — an earlier automated review recommended that, and it is both
  unnecessary and dangerous here.
- **`copilot/create-implementation-plan` shares no ancestry with `main`.**
  `git merge-base` is empty; it has its own root commit (`3a99f9d`, 6 March)
  and its two-dot diff would delete most of the app. It can never be merged —
  archive or delete only.
- **`copilot/review-rental-property-management-apps`** is the only branch with
  genuinely unmerged work: 11 commits ahead, 55 files, +15,498/-8,133, last
  touched 11 April. Read it before deciding.
- **Merged and safe to delete:** `codex/airmanager-mcp`,
  `fix/typescript-and-tests`, `fix/typescript-errors-clean`, `demo`,
  `copilot/understand-codebase-structure`.
- **Stale test databases.** Nine remain from earlier sessions
  (`airmanager_test`, `airmanager_tests`, and seven `airmanager_test_<pid>`,
  created 2 September to 8 September 17:23). The teardown in `tests/setup.ts`
  works correctly — these predate it. Safe to drop.
- **Working worktree** `/root/airmanager-work` on branch `fix/audit-followups`
  is merged and can be removed:
  `git -C /opt/AirManager worktree remove /root/airmanager-work`. Two older
  worktrees under `/tmp` are also merged and disposable. Note `/tmp` here is
  ext4 on the root disk, not tmpfs, so nothing vanishes on reboot.

## Running the test suite

`.env.test` now exists on this VPS (mode 600, gitignored) pointing at the
non-superuser role `airmanager_test_runner_20260908`, which has `CREATEDB`.
`tests/setup.ts` provisions a throwaway `airmanager_test_<pid>` database per
worker and refuses to run against anything that looks like production.

Never run `npm test`, `db:push` or migrations against the production database.

## Deploying

Follow `docs/OPERATIONS.md`: back up, reconcile git HEAD, apply reviewed
migrations with `ON_ERROR_STOP`, build, restart `airmanager.service`, then
check `/api/health`, an authenticated GET, and HTTPS. CI verifies but does not
deploy. There is still no automated deployment.
