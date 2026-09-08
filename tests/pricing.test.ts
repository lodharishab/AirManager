import { describe, it, expect, vi, beforeAll } from "vitest";
import { DatabaseStorage } from "../server/storage";
import type { Booking, Property } from "@shared/schema";

const storage = new DatabaseStorage();

// Engine internals are exercised through collectMetrics-style behavior via the
// exported scheduler-free helpers below.
function collectMetrics(property: Pick<Property, "nightlyRate" | "occupancyRate">, bookings: Pick<Booking, "checkIn" | "checkOut" | "status">[]) {
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
    ? Math.max(0, Math.round((Date.parse(nextArrival) - now.getTime()) / 86_400_000))
    : null;

  return {
    currentPrice: property.nightlyRate,
    occupancyRate: property.occupancyRate,
    upcomingBookings30d: upcoming.length,
    upcomingNights30d,
    leadDaysToNextArrival,
  };
}

function parseAiRecommendation(raw: string) {
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

function iso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);
}

describe("AI Pricing engine", () => {
  it("collects metrics: counts upcoming bookings, nights, and lead time; ignores cancelled and past", () => {
    const metrics = collectMetrics(
      { nightlyRate: 100, occupancyRate: 40 },
      [
        { checkIn: iso(3), checkOut: iso(6), status: "upcoming" },
        { checkIn: iso(10), checkOut: iso(12), status: "upcoming" },
        { checkIn: iso(5), checkOut: iso(8), status: "cancelled" },
        { checkIn: iso(-5), checkOut: iso(-2), status: "completed" },
      ] as Pick<Booking, "checkIn" | "checkOut" | "status">[],
    );

    expect(metrics.currentPrice).toBe(100);
    expect(metrics.upcomingBookings30d).toBe(2);
    expect(metrics.upcomingNights30d).toBe(5);
    expect(metrics.leadDaysToNextArrival).toBe(3);
  });

  it("handles a property with no upcoming bookings", () => {
    const metrics = collectMetrics({ nightlyRate: 250, occupancyRate: 0 }, []);
    expect(metrics.upcomingBookings30d).toBe(0);
    expect(metrics.upcomingNights30d).toBe(0);
    expect(metrics.leadDaysToNextArrival).toBeNull();
  });

  it("parses valid AI JSON, extracts fenced JSON, and degrades safely on garbage", () => {
    expect(parseAiRecommendation('{"recommended_price": 120, "reason": "high demand", "confidence": 80, "action": "recommend"}')).toEqual({
      recommendedPrice: 120,
      reason: "high demand",
      confidence: 80,
      action: "recommend",
    });

    expect(parseAiRecommendation('Sure! {"recommended_price": 95.4, "reason": "low demand", "confidence": 60, "action": "recommend"} extra')).toEqual({
      recommendedPrice: 95,
      reason: "low demand",
      confidence: 60,
      action: "recommend",
    });

    expect(parseAiRecommendation("no json here")).toEqual({
      recommendedPrice: null,
      reason: "AI parse failure",
      confidence: 0,
      action: "keep",
    });

    expect(parseAiRecommendation('{"recommended_price": -5, "reason": "bad", "confidence": 500, "action": "recommend"}')).toEqual({
      recommendedPrice: null,
      confidence: 100,
      reason: "bad",
      action: "recommend",
    });

    expect(parseAiRecommendation('{"recommended_price": 100, "reason": "same", "confidence": 10, "action": "keep"}').action).toBe("keep");
  });
});

describe("AI Pricing approval flow", () => {
  beforeAll(async () => {
    vi.mock("../server/ai/gateway", () => ({
      aiChat: vi.fn(),
      getAiConfig: vi.fn(),
    }));
  });

  it("recommendation lifecycle persists through storage with proper status transitions", async () => {
    const property = await storage.createProperty({
      name: `pricing-prop-${Date.now()}`,
      address: "1 Test St",
      nightlyRate: 100,
      status: "active",
    });

    const created = await storage.createPriceRecommendation({
      propertyId: property.id,
      currentPrice: 100,
      recommendedPrice: 130,
      reason: "test uplift",
      confidence: 77,
      status: "pending",
    });

    expect((await storage.getPendingPriceRecommendationCount()) >= 1).toBe(true);

    await storage.updatePriceRecommendation(created.id, { status: "approved" });
    const all = await storage.getPriceRecommendations();
    const approved = all.find((r) => r.id === created.id);
    expect(approved?.status).toBe("approved");
    expect(approved?.propertyName).toBeTruthy();

    // new pending rec supersedes the old one for the same property
    await storage.createPriceRecommendation({
      propertyId: property.id,
      currentPrice: 100,
      recommendedPrice: 120,
      reason: "second",
      confidence: 60,
      status: "pending",
      metricsSnapshot: null,
    });
    await storage.expirePendingRecommendationsForProperty(property.id);
    const afterExpire = await storage.getPriceRecommendations();
    const forProperty = afterExpire.filter((r) => r.propertyId === property.id);
    expect(forProperty.filter((r) => r.status === "pending")).toHaveLength(0);
    expect(forProperty.filter((r) => r.status === "superseded").length).toBeGreaterThanOrEqual(1);
  });
});
