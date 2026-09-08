import { logError } from "../logger";
import { storage } from "../storage";
import { aiChat, getAiConfig, type AiConfig } from "../ai/gateway";
import type { Enquiry, Review } from "@shared/schema";

const TRIAGE_PROMPT = `You are a vacation-rental support triage assistant. Classify the guest issue and decide escalation.
Reply ONLY with JSON: {"category": one of "booking" | "payment" | "access" | "cleanliness" | "maintenance" | "refund" | "complaint" | "other", "priority": "low" | "normal" | "high" | "urgent", "needs_host": boolean, "summary": string}.
Escalate (needs_host=true) for refunds, emergencies, safety issues, policy exceptions, legal threats, or anything you are not certain how to resolve. Never invent facts.`;

const ESCALATE_ON_PRIORITY = new Set(["high", "urgent"]);

interface TriageDecision {
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  needsHost: boolean;
  subject: string;
}

function fallbackDecision(text: string): TriageDecision {
  const _t = text.toLowerCase();
  let priority: TriageDecision["priority"] = "normal";
  if (/\b(urgent|emergency|locked out|lockout|broken|leak|no power|no water)\b/.test(text)) {
    priority = "urgent";
  } else if (/\b(refund|money back|cancel)\b/.test(text)) {
    priority = "high";
  }
  return {
    category: "support",
    priority,
    needsHost: ESCALATE_ON_PRIORITY.has(priority),
    subject: text.slice(0, 80).trim() || "Guest issue",
  };
}

async function triageText(text: string, cfg: AiConfig): Promise<TriageDecision> {
  try {
    if (!cfg.apiKey) throw new Error("AI not configured");
    const raw = await aiChat(
      [
        { role: "system", content: TRIAGE_PROMPT },
        { role: "user", content: text },
      ],
      { temperature: 0.1, maxTokens: 200 },
      cfg,
    );
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    const priority = ["low", "normal", "high", "urgent"].includes(parsed.priority)
      ? parsed.priority
      : "normal";
    return {
      category: String(parsed.category || "support"),
      priority,
      needsHost: Boolean(parsed.needs_host) || ESCALATE_ON_PRIORITY.has(priority),
      subject: String(parsed.subject || text.slice(0, 80)).trim(),
    };
  } catch {
    return fallbackDecision(text);
  }
}

async function _ticketExists(channel: string, sourceRefId: number): Promise<boolean> {
  return storage.hasTicketForSource(channel, sourceRefId);
}

async function triageEnquiry(enquiry: Enquiry, cfg: AiConfig): Promise<boolean> {
  if (await storage.hasTicketForSource("enquiry", enquiry.id)) return false;

  const decision = await triageText(
    `Guest enquiry: ${enquiry.message || "(no message)"}. Guest: ${enquiry.guestName}.`,
    cfg,
  );

  const ticket = await storage.createTicket({
    subject: decision.subject,
    description: enquiry.message || "(no message)",
    channel: "enquiry",
    priority: decision.priority,
    status: "open",
    propertyId: enquiry.propertyId ?? null,
    guestName: enquiry.guestName,
    sourceRefId: enquiry.id,
    aiCategory: decision.category,
    needsHost: decision.needsHost,
  });

  await storage.addTicketEvent({
    ticketId: ticket.id,
    type: "created",
    body: `Auto-created from enquiry #${enquiry.id}`,
  });
  await storage.addTicketEvent({
    ticketId: ticket.id,
    type: "triaged",
    body: `AI triage: category=${decision.category}, priority=${decision.priority}, needs_host=${decision.needsHost}`,
  });
  if (decision.needsHost) {
    await storage.updateTicket(ticket.id, { status: "escalated" });
    await storage.addTicketEvent({
      ticketId: ticket.id,
      type: "escalated",
      body: `Escalated to host (${decision.priority} priority).`,
    });
  }
  return true;
}

async function triageReview(review: Review, cfg: AiConfig): Promise<boolean> {
  if (await storage.hasTicketForSource("review", review.id)) return false;

  const text = `Guest ${review.guestName} left a ${review.rating}-star review on ${review.platform}${review.reviewText ? `: "${review.reviewText}"` : "."}`;
  const decision = await triageText(text, cfg);

  const ticket = await storage.createTicket({
    subject: `${review.rating}-star review needs attention`,
    description: review.reviewText || "(no review text)",
    channel: "review",
    priority: review.rating <= 2 ? "high" : "normal",
    status: "open",
    propertyId: review.propertyId,
    guestName: review.guestName,
    sourceRefId: review.id,
    aiCategory: decision.category,
    needsHost: true,
  });

  await storage.addTicketEvent({
    ticketId: ticket.id,
    type: "created",
    body: `Auto-created from ${review.rating}-star review #${review.id}`,
  });
  await storage.updateTicket(ticket.id, { status: "escalated", needsHost: true });
  await storage.addTicketEvent({
    ticketId: ticket.id,
    type: "escalated",
    body: "Low-rating reviews always escalate to the host for review before any public response.",
  });
  return true;
}

export interface TriageRunResult {
  enquiriesTriaged: number;
  reviewsTriaged: number;
  escalated: number;
  errors: string[];
}

export async function runTriage(): Promise<TriageRunResult> {
  const result: TriageRunResult = { enquiriesTriaged: 0, reviewsTriaged: 0, escalated: 0, errors: [] };
  const cfg = await getAiConfig();

  for (const enquiry of await storage.findUntriagedEnquiries()) {
    try {
      const created = await triageEnquiry(enquiry, cfg);
      if (created) result.enquiriesTriaged += 1;
    } catch (e) {
      result.errors.push(`enquiry ${enquiry.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const review of await storage.findUntriagedLowReviews()) {
    try {
      const created = await triageReview(review, cfg);
      if (created) result.reviewsTriaged += 1;
    } catch (e) {
      result.errors.push(`review ${review.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const open = await storage.getTickets("open");
  for (const ticket of open) {
    if (ESCALATE_ON_PRIORITY.has(ticket.priority) && !ticket.needsHost) {
      await storage.updateTicket(ticket.id, { needsHost: true });
      await storage.addTicketEvent({
        ticketId: ticket.id,
        type: "escalated",
        body: `Escalated: ${ticket.priority} priority requires host attention.`,
      });
    }
  }

  return result;
}

const SWEEP_INTERVAL_MS = Number(process.env.TICKET_TRIAGE_INTERVAL_MS || 2 * 3600_000);

let sweepInFlight = false;

export function startTicketTriageScheduler(): NodeJS.Timeout {
  const timer = setInterval(() => {
    // Overlap guard: never run two sweeps concurrently (slow AI calls must not stack).
    if (sweepInFlight) return;
    sweepInFlight = true;
    runTriage()
      .catch((e) => {
        logError("Ticket triage sweep failed:", e);
      })
      .finally(() => {
        sweepInFlight = false;
      });
  }, SWEEP_INTERVAL_MS);
  return timer;
}
