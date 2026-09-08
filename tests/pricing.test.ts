import { describe, it, expect, vi } from "vitest";
import { DatabaseStorage } from "../server/storage";
import { collectMetrics, parseAiRecommendation } from "../server/pricing/engine";
import type { Booking} from "@shared/schema";

vi.mock("../server/ai/gateway", () => ({ aiChat: vi.fn(), getAiConfig: vi.fn() }));

const storage = new DatabaseStorage();


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
