BEGIN;
CREATE TABLE IF NOT EXISTS scheduler_runs (
  job_name text PRIMARY KEY,
  last_started_at timestamp,
  last_finished_at timestamp,
  last_status text,
  last_error text,
  last_duration_ms integer,
  run_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0
);
COMMIT;
