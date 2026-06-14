import { describe, expect, it } from "vitest";
import { calculateFatigueScore, calculateOpportunityScore, type ShopperSignals } from "./scoring.js";

const healthyShopper: ShopperSignals = {
  daysSinceLastOrder: 12,
  ordersInLastYear: 7,
  lifetimeValue: 2200,
  engagementRate: 0.72,
  conversionRate: 0.2,
  preferredChannelFit: 0.8,
  messagesLast7Days: 1,
  messagesLast30Days: 4,
  ignoreRate: 0.2,
  consecutiveIgnored: 1,
  failedSendsLast30Days: 0,
  averageDaysBetweenOrders: 32,
};

describe("shopper scoring", () => {
  it("ranks an active valuable shopper as a strong opportunity", () => {
    expect(calculateOpportunityScore(healthyShopper).score).toBeGreaterThan(65);
  });

  it("protects heavily messaged unresponsive shoppers", () => {
    const fatigued = calculateFatigueScore({
      ...healthyShopper,
      messagesLast7Days: 7,
      messagesLast30Days: 18,
      ignoreRate: 0.95,
      consecutiveIgnored: 8,
      failedSendsLast30Days: 1,
    });
    expect(fatigued.score).toBeGreaterThanOrEqual(85);
    expect(fatigued.label).toBe("Pause for 14 days");
  });
});
