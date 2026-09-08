import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { schedulerRuns } from "@shared/schema";
import { runTracked } from "../server/scheduler-runs";

async function row(job: string) {
  const [r] = await db.select().from(schedulerRuns).where(eq(schedulerRuns.jobName, job));
  return r;
}

describe("scheduler run tracking", () => {
  it("records a successful run and returns the job result", async () => {
    const result = await runTracked("ticket_triage", async () => "done");
    expect(result).toBe("done");

    const r = await row("ticket_triage");
    expect(r.lastStatus).toBe("success");
    expect(r.runCount).toBe(1);
    expect(r.errorCount).toBe(0);
    expect(r.lastError).toBeNull();
    expect(r.lastStartedAt).not.toBeNull();
    expect(r.lastFinishedAt).not.toBeNull();
    expect(r.lastDurationMs).not.toBeNull();
  });

  it("marks the row running before the job finishes", async () => {
    // This is the state a crashed process leaves behind, and the reason the
    // start marker is written separately rather than only on completion.
    let observed: string | null = null;
    await runTracked("follow_up_sweep", async () => {
      observed = (await row("follow_up_sweep")).lastStatus;
    });
    expect(observed).toBe("running");
    expect((await row("follow_up_sweep")).lastStatus).toBe("success");
  });

  it("records a failure, counts it, and rethrows so the caller still logs", async () => {
    await expect(
      runTracked("pricing_recommendations", async () => {
        throw new Error("upstream exploded");
      }),
    ).rejects.toThrow("upstream exploded");

    const r = await row("pricing_recommendations");
    expect(r.lastStatus).toBe("error");
    expect(r.lastError).toBe("upstream exploded");
    expect(r.runCount).toBe(1);
    expect(r.errorCount).toBe(1);
  });

  it("accumulates counts across runs and clears a stale error on recovery", async () => {
    await expect(
      runTracked("ticket_triage", async () => {
        throw new Error("transient");
      }),
    ).rejects.toThrow("transient");
    await runTracked("ticket_triage", async () => undefined);

    const r = await row("ticket_triage");
    expect(r.runCount).toBe(2);
    expect(r.errorCount).toBe(1);
    expect(r.lastStatus).toBe("success");
    expect(r.lastError).toBeNull();
  });
});
