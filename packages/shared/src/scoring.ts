export interface ShopperSignals {
  daysSinceLastOrder: number;
  ordersInLastYear: number;
  lifetimeValue: number;
  engagementRate: number;
  conversionRate: number;
  preferredChannelFit: number;
  messagesLast7Days: number;
  messagesLast30Days: number;
  ignoreRate: number;
  consecutiveIgnored: number;
  failedSendsLast30Days: number;
  averageDaysBetweenOrders: number;
}

export interface ScoreResult {
  score: number;
  label: string;
  explanation: string;
  contributors: Array<{ signal: string; impact: number; detail: string }>;
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value);

export function calculateOpportunityScore(signals: ShopperSignals): ScoreResult {
  const recency = clamp(100 - signals.daysSinceLastOrder * 1.25);
  const frequency = clamp((signals.ordersInLastYear / 8) * 100);
  const monetary = clamp((signals.lifetimeValue / 2500) * 100);
  const engagement = clamp(signals.engagementRate * 100);
  const conversion = clamp(signals.conversionRate * 100);
  const channelFit = clamp(signals.preferredChannelFit * 100);

  const parts = [
    { signal: "Purchase recency", impact: recency * 0.25, detail: `${signals.daysSinceLastOrder} days since last order` },
    { signal: "Purchase frequency", impact: frequency * 0.2, detail: `${signals.ordersInLastYear} orders in the last year` },
    { signal: "Customer value", impact: monetary * 0.2, detail: `$${signals.lifetimeValue.toFixed(0)} lifetime value` },
    { signal: "Message engagement", impact: engagement * 0.15, detail: `${round(signals.engagementRate * 100)}% engagement rate` },
    { signal: "Campaign conversion", impact: conversion * 0.15, detail: `${round(signals.conversionRate * 100)}% historical conversion rate` },
    { signal: "Channel affinity", impact: channelFit * 0.05, detail: `${round(signals.preferredChannelFit * 100)}% preferred-channel fit` },
  ];

  const score = round(parts.reduce((total, part) => total + part.impact, 0));
  const strongest = [...parts].sort((a, b) => b.impact - a.impact).slice(0, 2);

  return {
    score,
    label: score >= 75 ? "Ready to convert" : score >= 50 ? "Promising" : score >= 30 ? "Nurture" : "Low intent",
    explanation: strongest.map((part) => part.detail).join(" and "),
    contributors: parts.map((part) => ({ ...part, impact: round(part.impact) })),
  };
}

export function calculateFatigueScore(signals: ShopperSignals): ScoreResult {
  const weekVolume = clamp((signals.messagesLast7Days / 5) * 100);
  const monthVolume = clamp((signals.messagesLast30Days / 12) * 100);
  const ignores = clamp(signals.ignoreRate * 100);
  const ignoredStreak = clamp((signals.consecutiveIgnored / 6) * 100);
  const failures = clamp((signals.failedSendsLast30Days / 3) * 100);
  const cadenceMismatch =
    signals.averageDaysBetweenOrders > 45 && signals.messagesLast30Days > 6 ? 100 : 0;

  const parts = [
    { signal: "7-day message volume", impact: weekVolume * 0.3, detail: `${signals.messagesLast7Days} messages in 7 days` },
    { signal: "30-day message volume", impact: monthVolume * 0.2, detail: `${signals.messagesLast30Days} messages in 30 days` },
    { signal: "Ignore rate", impact: ignores * 0.2, detail: `${round(signals.ignoreRate * 100)}% of messages ignored` },
    { signal: "Non-engagement streak", impact: ignoredStreak * 0.15, detail: `${signals.consecutiveIgnored} consecutive messages ignored` },
    { signal: "Delivery failures", impact: failures * 0.1, detail: `${signals.failedSendsLast30Days} recent delivery failures` },
    { signal: "Cadence mismatch", impact: cadenceMismatch * 0.05, detail: "Contact rate compared with purchase cadence" },
  ];

  const score = round(parts.reduce((total, part) => total + part.impact, 0));
  const label = score >= 85 ? "Pause for 14 days" : score >= 70 ? "Pause for 7 days" : score >= 40 ? "Reduce frequency" : "Healthy";
  const strongest = [...parts].sort((a, b) => b.impact - a.impact).slice(0, 2);

  return {
    score,
    label,
    explanation: strongest.map((part) => part.detail).join(" and "),
    contributors: parts.map((part) => ({ ...part, impact: round(part.impact) })),
  };
}

