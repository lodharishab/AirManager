import { describe, it, expect } from "vitest";
import { DatabaseStorage } from "../server/storage";
import { runFollowUpSweep } from "../server/followups/engine";
import { makeProperty, makeEnquiry } from "./helpers/factories";

const storage = new DatabaseStorage();

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

describe("Follow-ups engine", () => {
  it("finds unanswered enquiries older than the rule delay and skips fresh or already-followed ones", async () => {
    const property = await storage.createProperty(makeProperty());
    const oldEnquiry = await storage.createEnquiry(
      makeEnquiry(property.id, { status: "new", createdAt: hoursAgoIso(30) }),
    );
    await storage.createEnquiry(makeEnquiry(property.id, { status: "new" }));

    const rule = await storage.createFollowUpRule({
      name: "24h nudge",
      trigger: "enquiry_unanswered",
      delayHours: 24,
      channel: "direct",
      maxPerEnquiry: 1,
      enabled: true,
    });

    const candidates = await storage.findFollowUpCandidates(rule);
    expect(candidates.map((e) => e.id)).toContain(oldEnquiry.id);
    expect(candidates).toHaveLength(1);

    const converted = await storage.createEnquiry(
      makeEnquiry(property.id, { status: "converted", createdAt: hoursAgoIso(48) }),
    );
    const afterConversion = await storage.findFollowUpCandidates(rule);
    expect(afterConversion.map((e) => e.id)).not.toContain(converted.id);
  });

  it("sweep creates and sends direct follow-ups, then respects maxPerEnquiry on the next sweep", async () => {
    const property = await storage.createProperty(makeProperty());
    const enquiry = await storage.createEnquiry(
      makeEnquiry(property.id, { status: "new", createdAt: hoursAgoIso(30) }),
    );

    await storage.createFollowUpRule({
      name: "nudge",
      trigger: "enquiry_unanswered",
      delayHours: 24,
      channel: "direct",
      maxPerEnquiry: 1,
      enabled: true,
    });

    const firstSweep = await runFollowUpSweep();
    expect(firstSweep.created).toBe(1);
    expect(firstSweep.sent).toBe(1);

    const followUps = await storage.getFollowUps();
    expect(followUps).toHaveLength(1);
    expect(followUps[0].status).toBe("sent");
    expect(followUps[0].message).toBeTruthy();
    expect(followUps[0].guestName).toBe(enquiry.guestName);

    const secondSweep = await runFollowUpSweep();
    expect(secondSweep.created).toBe(0);

    const stats = await storage.getFollowUpStats();
    expect(stats.sent).toBe(1);
    expect(stats.pending).toBe(0);
  });

  it("skips disabled rules and queues follow-ups on unconfigured channels", async () => {
    const property = await storage.createProperty(makeProperty());
    await storage.createEnquiry(
      makeEnquiry(property.id, { status: "new", createdAt: hoursAgoIso(48) }),
    );

    await storage.createFollowUpRule({
      name: "disabled rule",
      trigger: "enquiry_unanswered",
      delayHours: 24,
      channel: "whatsapp",
      maxPerEnquiry: 1,
      enabled: false,
    });
    await storage.createFollowUpRule({
      name: "whatsapp rule",
      trigger: "enquiry_unanswered",
      delayHours: 24,
      channel: "whatsapp",
      maxPerEnquiry: 1,
      enabled: true,
    });

    const result = await runFollowUpSweep();
    expect(result.created).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.queued).toBe(1);

    const pending = await storage.getFollowUps("pending");
    expect(pending).toHaveLength(1);
    expect(pending[0].channel).toBe("whatsapp");
  });
});
