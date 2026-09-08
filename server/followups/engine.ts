import { logError } from "../logger";
import { runTracked } from "../scheduler-runs";
import { storage} from "../storage";
import { aiChat, getAiConfig, type AiConfig } from "../ai/gateway";
import type { Enquiry, FollowUpRule, Property } from "@shared/schema";

const DEFAULT_PROMPT = `Write one concise, friendly follow-up message for a vacation-rental guest enquiry.
Do not invent availability, urgency, discounts, or prices. Reply with only the message text.`;

function fallbackMessage(enquiry: Enquiry, property: Property | undefined): string {
  const propertyName = property ? ` the ${property.name}` : "";
  return `Hi ${enquiry.guestName}, just checking in — would you still like help with your stay${propertyName}? Happy to answer any questions.`;
}

function recipientFor(enquiry: Enquiry, channel: string): string | undefined {
  if (channel === "email") return enquiry.guestEmail || undefined;
  return enquiry.guestPhone || enquiry.guestEmail || undefined;
}

export async function generateFollowUpMessage(
  enquiry: Enquiry,
  rule: FollowUpRule,
  property: Property | undefined,
  cfg?: AiConfig,
): Promise<{ message: string; generatedBy: "ai" | "template" }> {
  const context = [
    `Guest: ${enquiry.guestName}`,
    property ? `Property: ${property.name}` : null,
    enquiry.message ? `Their enquiry: ${enquiry.message}` : null,
    `Initial enquiry date: ${enquiry.createdAt}`,
    `Channel: ${rule.channel}`,
    rule.promptTemplate ? `Additional instructions: ${rule.promptTemplate}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const config = cfg ?? (await getAiConfig());
    if (!config.apiKey) throw new Error("AI not configured");
    const message = await aiChat(
      [
        { role: "system", content: rule.promptTemplate?.trim() || DEFAULT_PROMPT },
        { role: "user", content: context },
      ],
      { temperature: 0.3, maxTokens: 200 },
      config,
    );
    return { message: message.trim(), generatedBy: "ai" };
  } catch {
    return { message: fallbackMessage(enquiry, property), generatedBy: "template" };
  }
}

async function deliverFollowUp(
  channel: string,
): Promise<{ status: "sent" | "pending" | "failed"; error?: string }> {
  // Channel adapters are pluggable; until a channel is configured in settings,
  // only `direct` (recorded in-app) delivers immediately. Everything else queues.
  if (channel === "direct") {
    return { status: "sent" };
  }
  return { status: "pending" };
}

export interface FollowUpSweepResult {
  rulesRun: number;
  created: number;
  sent: number;
  queued: number;
  errors: string[];
}

export async function runFollowUpSweep(): Promise<FollowUpSweepResult> {
  const rules = (await storage.getFollowUpRules()).filter((r) => r.enabled);
  const summary: FollowUpSweepResult = {
    rulesRun: 0,
    created: 0,
    sent: 0,
    queued: 0,
    errors: [],
  };

  for (const rule of rules) {
    const candidates = await storage.findFollowUpCandidates(rule);
    for (const enquiry of candidates) {
      try {
        const property = await storage.getProperty(enquiry.propertyId);
        const { message } = await generateFollowUpMessage(enquiry, rule, property);
        const recipient = recipientFor(enquiry, rule.channel);
        const now = new Date().toISOString();

        const created = await storage.createFollowUp({
          enquiryId: enquiry.id,
          ruleId: rule.id,
          channel: rule.channel,
          recipient: recipient || null,
          message,
          status: "pending",
          scheduledAt: now,
        });

        const delivery = await deliverFollowUp(rule.channel);
        await storage.updateFollowUp(created.id, {
          status: delivery.status,
          sentAt: delivery.status === "sent" ? now : null,
          error: delivery.error || null,
        });

        summary.created += 1;
        if (delivery.status === "sent") summary.sent += 1;
        else summary.queued += 1;
      } catch (e) {
        summary.errors.push(`enquiry ${enquiry.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return summary;
}

const SWEEP_INTERVAL_MS = Number(process.env.FOLLOW_UP_SWEEP_INTERVAL_MS || 2 * 3600_000);

let sweepInFlight = false;

export function startFollowUpScheduler(): NodeJS.Timeout {
  const timer = setInterval(() => {
    // Overlap guard: never run two sweeps concurrently (slow AI calls must not stack).
    if (sweepInFlight) return;
    sweepInFlight = true;
    runTracked("follow_up_sweep", runFollowUpSweep)
      .catch((e) => {
        logError("Follow-up sweep failed:", e);
      })
      .finally(() => {
        sweepInFlight = false;
      });
  }, SWEEP_INTERVAL_MS);
  return timer;
}
