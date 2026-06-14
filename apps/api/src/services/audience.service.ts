import { Prisma, prisma } from "@xeno/database";
import type { AudienceRules } from "@xeno/shared";

export function audienceWhere(brandId: string, rules: AudienceRules): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {
    brandId,
    fatigueScore: { lte: rules.maxFatigueScore },
  };

  if (rules.minOrders !== undefined) where.orderCount = { gte: rules.minOrders };
  if (rules.minLifetimeValue !== undefined) where.totalSpend = { gte: rules.minLifetimeValue };
  if (rules.minOpportunityScore !== undefined) where.opportunityScore = { gte: rules.minOpportunityScore };
  if (rules.preferredChannels?.length) where.preferredChannel = { in: rules.preferredChannels };

  const now = Date.now();
  if (rules.daysSinceLastOrder?.min !== undefined || rules.daysSinceLastOrder?.max !== undefined) {
    where.lastOrderAt = {};
    if (rules.daysSinceLastOrder.min !== undefined) {
      where.lastOrderAt.lte = new Date(now - rules.daysSinceLastOrder.min * 86_400_000);
    }
    if (rules.daysSinceLastOrder.max !== undefined) {
      where.lastOrderAt.gte = new Date(now - rules.daysSinceLastOrder.max * 86_400_000);
    }
  }
  return where;
}

export async function countAudience(brandId: string, rules: AudienceRules) {
  const [estimatedSize, protectedByFatiguePolicy] = await Promise.all([
    prisma.customer.count({ where: audienceWhere(brandId, rules) }),
    prisma.customer.count({
      where: {
        ...audienceWhere(brandId, { ...rules, maxFatigueScore: 100 }),
        fatigueScore: { gt: rules.maxFatigueScore },
      },
    }),
  ]);
  return { estimatedSize, protectedByFatiguePolicy };
}
