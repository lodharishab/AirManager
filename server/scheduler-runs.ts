import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { logError } from "./logger";
import { schedulerRuns } from "@shared/schema";

export const SCHEDULER_JOBS = ["follow_up_sweep", "pricing_recommendations", "ticket_triage"] as const;
export type SchedulerJob = (typeof SCHEDULER_JOBS)[number];

/**
 * Bookkeeping must never take down the job it is measuring, so every write
 * here is best-effort and failures are logged rather than propagated.
 */
async function safe(label: string, op: () => Promise<unknown>): Promise<void> {
  try {
    await op();
  } catch (e) {
    logError(`Scheduler bookkeeping failed (${label}):`, e);
  }
}

/**
 * Run a scheduled job, recording when it started and how it ended.
 *
 * The start marker is written before the work begins, so a row left in
 * "running" with an old last_started_at identifies a process that died
 * mid-cycle — the case an in-memory guard cannot report after a restart.
 * The job's own result and errors are passed through untouched.
 */
export async function runTracked<T>(job: SchedulerJob, fn: () => Promise<T>): Promise<T> {
  const startedAt = new Date();

  await safe(`${job}:start`, () =>
    db
      .insert(schedulerRuns)
      .values({ jobName: job, lastStartedAt: startedAt, lastStatus: "running" })
      .onConflictDoUpdate({
        target: schedulerRuns.jobName,
        set: { lastStartedAt: startedAt, lastStatus: "running", lastError: null },
      }),
  );

  try {
    const result = await fn();
    await safe(`${job}:success`, () =>
      db
        .update(schedulerRuns)
        .set({
          lastFinishedAt: new Date(),
          lastStatus: "success",
          lastError: null,
          lastDurationMs: Date.now() - startedAt.getTime(),
          runCount: sql`${schedulerRuns.runCount} + 1`,
        })
        .where(eq(schedulerRuns.jobName, job)),
    );
    return result;
  } catch (e) {
    await safe(`${job}:error`, () =>
      db
        .update(schedulerRuns)
        .set({
          lastFinishedAt: new Date(),
          lastStatus: "error",
          lastError: e instanceof Error ? e.message : String(e),
          lastDurationMs: Date.now() - startedAt.getTime(),
          runCount: sql`${schedulerRuns.runCount} + 1`,
          errorCount: sql`${schedulerRuns.errorCount} + 1`,
        })
        .where(eq(schedulerRuns.jobName, job)),
    );
    throw e;
  }
}

export async function listSchedulerRuns() {
  return db.select().from(schedulerRuns);
}
