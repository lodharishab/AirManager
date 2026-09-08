# AirManager operations

Use Node 22 or newer. Production runs from `/opt/AirManager` behind the private Tailscale HTTPS endpoint. Only the application service account should write uploads. Keep `.env`, `.env.test`, media, database dumps and n8n exports out of Git.

## Testing

Copy `.env.test.example` to `.env.test` and configure a dedicated PostgreSQL test role with CREATEDB, no superuser privileges, and no production table privileges. Tests create and drop databases named `airmanager_test_<pid>` owned by that role. They do not load `.env`. Run `npm run check`, `npm test`, and `npm run build`. Schema migrations in `scripts/migrations` run in disposable test databases as well as production. Never run `db:push --force` on the production database.

## Deployment

Canonical Git remote: `https://github.com/lodharishab/AirManager.git`, branch `main`. Verify `git remote get-url origin` before pushing. The former `feliciaofficial/AirManager` origin is retained only as `legacy-fork`; do not publish new work there. After deployment, confirm local HEAD, origin/main, and the canonical remote main match.

Back up with `scripts/backup-airmanager.sh`. Validate in a staging directory with its own `.env.test`. Reconcile the current Git head before copying changes. Apply reviewed SQL migrations with ON_ERROR_STOP, install the build, and restart `airmanager.service`. Check `/api/health`, authenticated GET routes, and HTTPS access. Booking writes are serialized and validated in storage; a database trigger also enforces lifecycle and nightly capacity. Status changes are recorded in `booking_status_events`.

## Data definitions

Reservations use date-only values and Asia/Kolkata for operational dates. Upcoming reservations cannot check out or complete before check-in. `current` is the legacy equivalent of `checked_in`. Undo checkout returns to checked_in; undo check-in returns to upcoming. Completed historical records remain preserved.

Rivaan has **11 rooms**, confirmed by the owner on September 8, 2026. Existing named room entries are retained, and additional capacity is labelled unclassified until room types and rates are verified. Unassigned reservations consume total capacity. Named room allocations also consume that room type's capacity. Inventory counts shown during booking are total counts, not guarantees of availability for the selected dates.

Dashboard/property occupancy covers the current calendar month. Analytics occupancy covers the selected date range (inclusive end date), defaulting to the current month. Occupancy uses booked room-nights; it is not proof of attendance. Revenue is booking value excluding cancellations and blocked dates, not verified bank payouts. Profit uses recorded expenses only. Missing expense entries do not mean expenses are truly zero. Guest statistics follow booking guest IDs.

## Backups and recovery

The daily systemd backup timer keeps the seven most recent backups in `/var/backups/airmanager`. Each includes a PostgreSQL custom dump, app/config/media archive, Git bundle and service definition. Files are root-only and checksummed. Verify dumps with `pg_restore --list` and periodically restore into an isolated database before trusting recovery. These are same-server backups; they do not protect against total VPS loss. Off-server encrypted storage still needs an owner-selected destination.

To roll back code, restore the application archive to a staging folder, inspect it, copy the previous code/build to `/opt/AirManager`, and restart. Do not blindly restore the old environment after credential rotation. Database restoration is a separate maintenance action and must account for newer reservations. Preserve `booking_status_events` and booking data when reversing a code deployment.

## Credentials and integrations

Rotate locally managed session, application API and database credentials whenever exposed; never include values in logs. Update existing callers before rotating application API keys. Changing SESSION_SECRET invalidates browser sessions. Database connection secrets stay in the protected `.env` file, not source control.

Google Drive import requires a configured Google Drive API key. The Settings AI provider/model are used by AI chat; its answers are grounded in a bounded database snapshot and it cannot change business records. Never assume an empty scheduler result means a failure: no matching records can correctly produce no recommendations or tickets.

## Draft data verification

August 26–27 Rivaan stays (Khushwant Chandel, Disha Srimal, Mrigank Sharma) remain a draft for separate owner verification. The former overbooking allegation assumed two rooms and is not established against the confirmed 11-room inventory. Historical guest, dates, amounts, room allocations and notes have not been rewritten to guess the outcome.
