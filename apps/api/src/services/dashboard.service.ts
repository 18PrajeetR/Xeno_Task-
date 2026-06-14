import { prisma } from "@xeno/database";
import { getBrand } from "../lib/brand.js";

const percentage = (numerator: number, denominator: number) =>
  denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;

export async function dashboard() {
  const brand = await getBrand();
  const [customers, campaigns, revenue, opportunities, fatigue, insights, recentCampaigns, eventGroups] =
    await Promise.all([
      prisma.customer.count({ where: { brandId: brand.id } }),
      prisma.campaign.count({ where: { brandId: brand.id } }),
      prisma.order.aggregate({ where: { customer: { brandId: brand.id }, status: "COMPLETED" }, _sum: { total: true } }),
      prisma.customer.count({ where: { brandId: brand.id, opportunityScore: { gte: 70 }, fatigueScore: { lte: 69 } } }),
      prisma.customer.count({ where: { brandId: brand.id, fatigueScore: { gte: 70 } } }),
      prisma.aiInsight.findMany({ where: { brandId: brand.id, isActive: true }, orderBy: { generatedAt: "desc" }, take: 6 }),
      prisma.campaign.findMany({
        where: { brandId: brand.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { communications: true } } },
      }),
      prisma.communicationEvent.groupBy({
        by: ["type"],
        where: { communication: { campaign: { brandId: brand.id } } },
        _count: true,
      }),
    ]);
  const counts = Object.fromEntries(eventGroups.map((row) => [row.type, row._count])) as Record<string, number>;
  return {
    brand,
    metrics: {
      customers,
      campaigns,
      revenue: Number(revenue._sum.total ?? 0),
      opportunities,
      fatigue,
    },
    funnel: {
      sent: counts.SENT ?? 0,
      delivered: counts.DELIVERED ?? 0,
      opened: counts.OPENED ?? 0,
      clicked: counts.CLICKED ?? 0,
      purchased: counts.PURCHASED ?? 0,
      openRate: percentage(counts.OPENED ?? 0, counts.DELIVERED ?? 0),
      clickRate: percentage(counts.CLICKED ?? 0, counts.DELIVERED ?? 0),
      conversionRate: percentage(counts.PURCHASED ?? 0, counts.DELIVERED ?? 0),
    },
    insights,
    recentCampaigns,
  };
}

export async function analytics() {
  const brand = await getBrand();
  const [byChannel, purchasedEvents, campaigns] = await Promise.all([
    prisma.communication.groupBy({
      by: ["channel", "status"],
      where: { campaign: { brandId: brand.id } },
      _count: true,
    }),
    prisma.communicationEvent.findMany({
      where: { type: "PURCHASED", communication: { campaign: { brandId: brand.id } } },
      select: { metadata: true, occurredAt: true },
    }),
    prisma.campaign.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { communications: { select: { status: true } } },
    }),
  ]);
  const revenue = purchasedEvents.reduce((sum, event) => {
    const metadata = event.metadata as { revenue?: number };
    return sum + Number(metadata.revenue ?? 0);
  }, 0);
  return {
    revenue,
    roi: revenue ? Math.round((revenue / Math.max(1, campaigns.length * 150)) * 100) / 100 : 0,
    byChannel,
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      createdAt: campaign.createdAt,
      sent: campaign.communications.length,
      clicked: campaign.communications.filter((item) => ["CLICKED", "PURCHASED"].includes(item.status)).length,
      purchased: campaign.communications.filter((item) => item.status === "PURCHASED").length,
    })),
  };
}
