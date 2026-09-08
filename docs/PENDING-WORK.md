# Pending Work

Last updated: 8 September 2026, after deploying `e0a8ade` (PR #3) and
auditing the MCP server (PR #5).

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

## MCP server — audited 8 September 2026 (PR #5)

The adapter itself is **healthy**. `npm test` passes (1/1) on the VPS,
`smoke.mjs` passes over both the Tailscale and public endpoints (11 tools OK;
`get_expense` skipped only because the expense table is empty), and
`get_health` returns `status: ok` / `database: connected`. Re-confirmed after
the 20:50 reboot: `airmanager-mcp`, `airmanager` and `nginx` all came back.

What the audit found is a **change in exposure**, not a broken service.

### Done

- `/etc/airmanager-mcp-clients/composio.json` was mode `0644` with a live
  bearer token in it. Now `0600`, matching the other two clients.
- `mcp/airmanager/README.md` corrected — it claimed "There is no public MCP
  listener" and listed two clients. See PR #5.

### Owner decision — blocking

**Was the public MCP endpoint intentional?** On 8 September at 20:22 an nginx
site `/etc/nginx/sites-enabled/app.zoellastays.com` was created that proxies
the **entire domain root** (`location /`) to `127.0.0.1:5010`, and a third
client `composio` was registered against it at 20:29. All 12 tools and every
record the Air Manager API exposes — including guest contact details — are now
reachable from the public internet, gated only by a bearer token.

If Composio genuinely needs public reach, harden it (below). If it was a
shortcut to get Composio connected, the better shape is Composio over
Tailscale like OpenClaw, and the nginx site plus its DNS record come down.

### Open — origin is unencrypted

nginx declares only `listen 80`, **no TLS certificate exists anywhere on this
host**, and UFW still allows `80/tcp` and `443/tcp` from Anywhere. The origin
answers on its bare IP — verified: a request to `http://147.93.154.8/mcp` with
`Host: app.zoellastays.com` returns 401, so the path exists outside Cloudflare
entirely. Cloudflare is therefore in Flexible SSL mode and the bearer token
crosses the Cloudflare-to-origin hop in cleartext.

A prepared script sits at **`/root/harden-origin.sh`** (mode 700,
syntax-checked, **not yet run**). It fetches Cloudflare's published ranges
live, aborts if the count looks implausible, backs up `ufw status numbered`,
restricts 80/443 to those ranges, then verifies both that the direct-IP bypass
is closed and that the site still answers through Cloudflare. It does not
touch SSH, Tailscale or the Docker rules.

It only does the firewall half. Origin TLS needs a Cloudflare Origin
Certificate from the dashboard, a `listen 443 ssl` block, and the zone set to
Full (Strict). This hardening is worth doing **regardless** of the decision
above, because `zoellastays.com` (the main app on port 5000) is Cloudflare-
fronted too and has the identical bypass today.

Consider also rotating the `composio` token, which was world-readable for
about 15 minutes. Replace its entry in `MCP_CLIENT_TOKENS`, update the
Composio side and its connection file, then restart only `airmanager-mcp`; the
other two clients keep their tokens.

### Open — no per-client authorization

Every credential reaches every tool and every record. There is no per-property
or per-user filtering in the adapter. Add it before sharing a credential with
anyone who should see only part of the business.

## Do not wire the in-app AI assistant to the MCP server

This was investigated and rejected; the reasoning is recorded so it is not
re-litigated. The MCP adapter's upstream is `AIRMANAGER_BASE_URL=
http://127.0.0.1:5000` — the same Express process that serves the assistant.
Routing the assistant through it means HTTP out to nginx, into the MCP
service, and back into itself, to reach data the process already holds in
memory, while adding a second credential, a 15-second timeout, a 2 MB response
cap and a service that can fail independently.

The MCP server keeps earning its place for **external** consumers with no
in-process access: OpenClaw, n8n and Composio.

The assistant's real problem is elsewhere. In
`server/replit_integrations/chat/routes.ts:84-95` every message loads all
properties and all bookings via `getAllBookings()`, keyword-matches guest
names, dedupes to 150 records and stuffs them into a system message. So
expenses, guests, rooms, check-ins and dashboard stats are never loaded and
cannot be answered factually; relevance is guest-name matching with no date or
property filter; and cost grows with total booking count on every message.

The fix is tool-calling **in process**, borrowing the MCP tool contracts but
not the transport:

1. Add an optional `tools` param to `aiChat` in `server/ai/gateway.ts` (it
   currently sends only `model`/`messages`/`temperature`/`max_tokens`) and
   return `tool_calls`. Keep the signature backward-compatible so `ai-enrich`
   at `server/routes.ts:1573` is untouched.
2. Implement the same 12 tool schemas as thin wrappers over `storage.*`. Ten
   map to a single existing method. Two do not: `get_check_ins` and
   `get_dashboard_stats` are composed in route handlers
   (`server/routes.ts:916` and `:1123`), so extract shared helpers the route
   and the tool both call.
3. Replace the context dump with an agentic loop, capped around 5 iterations,
   keeping the 120s SSE budget.
4. Fall back to today's context-stuffing when the provider lacks function
   calling — the Sarvam provider likely does. Cover loop termination, the
   iteration cap, and tool errors surfacing as text rather than 500s.

Optional while in there: the SSE endpoint currently writes the whole response
in a single `data:` frame, so streaming is cosmetic. Separable from the above.

## Engineering backlog — still open

1. **Split `server/routes.ts` (2,238 lines) and `server/storage.ts` (1,272).**
   The single largest remaining item; deliberately excluded from PR #3 because
   it is a behaviour-preserving refactor deserving its own branch and review.
   Suggested split by endpoint prefix: properties/rooms, bookings/availability,
   guests, housekeeping, tickets, reviews, gallery/uploads, finance
   (expenses/pricing), enquiries/follow-ups, notifications/conversations, auth
   and preferences, admin (settings/export/dashboard/health). Mirror the same
   domains under `server/storage/`. The 191 existing tests are the safety net.
2. **Fire-and-forget email.** The `.catch(() => {})` at `server/routes.ts:259`
   discards delivery failures entirely. Worth recording failures the way
   `scheduler_runs` now records job outcomes.
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
- **Working worktree** `/root/airmanager-work` was on `fix/audit-followups`
  when this was written, but as of 8 September 20:44 it is on
  `fix/gitignore-env-backups` with an untracked `docs/REBOOT-CHECKLIST.md` and
  another session active in it. **Confirm it is idle before removing it**, then
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
