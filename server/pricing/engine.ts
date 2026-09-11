import { logError } from "../logger";
import { runTracked } from "../scheduler-runs";
import { storage } from "../storage";
import { aiChat, getAiConfig, type AiConfig } from "../ai/gateway";
import type { Booking, PriceRecommendation, Property } from "@shared/schema";

const DEFAULT_PROMPT = `You are a vacation-rental revenue analyst. Recommend at most one daily price per property.
Only recommend a price if the data supports it; never invent competitor prices, events, or demand signals.
Reply ONLY with JSON: {"recommended_price": number, "reason": string, "confidence": number (0-100), "action": "recommend" | "keep"}.`;

export interface PropertyMetrics {
  currentPrice: number;
  occupancyRate: number;
  upcomingBookings30d: number;
  upcomingNights30d: number;
  leadDaysToNextArrival: number | null;
}

export function collectMetrics(
  property: Pick<Property, "nightlyRate" | "occupancyRate">,
  bookings: Pick<Booking, "checkIn" | "checkOut" | "status">[],
): PropertyMetrics {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86_400_000);
  const today = now.toISOString().slice(0, 10);
  const horizon = in30.toISOString().slice(0, 10);

  const upcoming = bookings.filter((b) => b.checkIn >= today && b.checkIn <= horizon && b.status !== "cancelled");
  const upcomingNights30d = upcoming.reduce((sum, b) => {
    const nights = Math.max(1, Math.round((Date.parse(b.checkOut) - Date.parse(b.checkIn)) / 86_400_000));
    return sum + nights;
  }, 0);
  const nextArrival = upcoming.map((b) => b.checkIn).sort()[0];
  const leadDaysToNextArrival = nextArrival
    ? Math.max(0, Math.round((Date.parse(nextArrival) - Date.parse(today)) / 86_400_000))
    : null;

  return {
    currentPrice: property.nightlyRate,
    occupancyRate: property.occupancyRate,
    upcomingBookings30d: upcoming.length,
    upcomingNights30d,
    leadDaysToNextArrival,
  };
}

export function parseAiRecommendation(raw: string): {
  recommendedPrice: number | null;
  reason: string;
  confidence: number;
  action: string;
} {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    const price = Number(parsed.recommended_price);
    return {
      recommendedPrice: Number.isFinite(price) && price > 0 ? Math.round(price) : null,
      reason: String(parsed.reason || "No reason provided"),
      confidence: Math.min(100, Math.max(0, Math.round(Number(parsed.confidence) || 0))),
      action: parsed.action === "recommend" ? "recommend" : "keep",
    };
  } catch {
    return { recommendedPrice: null, reason: "AI parse failure", confidence: 0, action: "keep" };
  }
}

async function recommendForProperty(
  property: Property,
  bookings: Booking[],
  cfg: AiConfig,
): Promise<PriceRecommendation | null> {
  const metrics = collectMetrics(property, bookings);

  const prompt = [
    `Property: ${property.name} (${property.neighborhood || "unknown area"}, sleeps ${property.maxGuests})`,
    `Current nightly price: ${metrics.currentPrice} ${property.currency}`,
    `Occupancy rate (all-time): ${metrics.occupancyRate}%`,
    `Bookings starting in the next 30 days: ${metrics.upcomingBookings30d} (${metrics.upcomingNights30d} nights on the books)`,
    metrics.leadDaysToNextArrival !== null ? `Days until next arrival: ${metrics.leadDaysToNextArrival}` : "No upcoming arrivals.",
    `Suggest today's price adjustment if the data supports one. If nothing supports a change, use action "keep".`,
  ].join("\n");

  const raw = await aiChat(
    [
      { role: "system", content: DEFAULT_PROMPT },
      { role: "user", content: prompt },
    ],
    { temperature: 0.1, maxTokens: 300 },
    cfg,
  );

  const rec = parseAiRecommendation(raw);
  if (rec.action !== "recommend" || rec.recommendedPrice === null || rec.recommendedPrice === metrics.currentPrice) {
    return null;
  }

  await storage.expirePendingRecommendationsForProperty(property.id);
  return storage.createPriceRecommendation({
    propertyId: property.id,
    currentPrice: metrics.currentPrice,
    recommendedPrice: rec.recommendedPrice,
    reason: rec.reason,
    confidence: rec.confidence,
    status: "pending",
    metricsSnapshot: JSON.stringify(metrics),
  });
}

export interface PricingRunResult {
  propertiesEvaluated: number;
  created: number;
  skipped: number;
  errors: string[];
}

export async function runPricingRecommendations(): Promise<PricingRunResult> {
  const result: PricingRunResult = { propertiesEvaluated: 0, created: 0, skipped: 0, errors: [] };

  const cfg = await getAiConfig();
  if (!cfg.apiKey) {
    result.errors.push("AI is not configured — no recommendations generated.");
    return result;
  }

  const allProperties: Property[] = [];
  let page = 1;
  for (;;) {
    const res = await storage.getProperties({ page, limit: 100 });
    allProperties.push(...res.data);
    if (res.data.length < 100) break;
    page += 1;
  }
  const properties = allProperties.filter((p) => p.status === "active");

  for (const property of properties) {
    try {
      const bookings = await storage.getBookingsByProperty(property.id);
      const rec = await recommendForProperty(property, bookings, cfg);
      result.propertiesEvaluated += 1;
      if (rec) result.created += 1;
      else result.skipped += 1;
    } catch (e) {
      result.errors.push(`property ${property.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}

const DAILY_HOUR = 5;
const DAILY_MINUTE = 15;

let pricingRunInFlight = false;

export function startPricingScheduler(): NodeJS.Timeout {
  let timer: NodeJS.Timeout | undefined;
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(DAILY_HOUR, DAILY_MINUTE, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    timer = setTimeout(() => {
      // Overlap guard: a slow AI run must not stack with the next day's run.
      if (!pricingRunInFlight) {
        pricingRunInFlight = true;
        runTracked("pricing_recommendations", runPricingRecommendations)
          .catch((e) => {
            logError("Pricing recommendation run failed:", e);
          })
          .finally(() => {
            pricingRunInFlight = false;
          });
      }
      scheduleNext();
    }, next.getTime() - now.getTime());
  };
  scheduleNext();
  return timer!;
}

export async function approvePriceRecommendation(id: number): Promise<PriceRecommendation | undefined> {
  const rec = await storage.updatePriceRecommendation(id, { status: "approved" });
  if (!rec) return undefined;

  const property = await storage.getProperty(rec.propertyId);
  if (property?.minNightlyRate != null && rec.recommendedPrice < property.minNightlyRate) {
    // Floor raised after the recommendation was created — refuse to apply it.
    await storage.updatePriceRecommendation(id, {
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      reason: rec.reason + " (rejected: below owner floor of ₹" + property.minNightlyRate + ")",
    });
    return undefined;
  }
  if (property && rec.recommendedPrice !== property.nightlyRate) {
    await storage.updateProperty(rec.propertyId, { nightlyRate: rec.recommendedPrice });
  }
  return storage.updatePriceRecommendation(id, { reviewedAt: new Date().toISOString() });
}

export async function rejectPriceRecommendation(id: number): Promise<PriceRecommendation | undefined> {
  await storage.updatePriceRecommendation(id, { status: "rejected" });
  return storage.updatePriceRecommendation(id, { reviewedAt: new Date().toISOString() });
}
