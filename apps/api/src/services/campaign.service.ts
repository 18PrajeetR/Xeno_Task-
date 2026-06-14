import { Prisma, prisma } from "@xeno/database";
import { campaignPlanSchema } from "@xeno/shared";
import { getBrand } from "../lib/brand.js";
import { HttpError } from "../lib/http.js";
import { audienceWhere } from "./audience.service.js";

export async function approveCampaign(planId: string) {
  const brand = await getBrand();
  const savedPlan = await prisma.campaignPlan.findFirst({ where: { id: planId, brandId: brand.id } });
  if (!savedPlan || savedPlan.expiresAt < new Date()) throw new HttpError(404, "Campaign plan not found or expired");
  const plan = campaignPlanSchema.parse(savedPlan.plan);

  return prisma.$transaction(async (tx) => {
    const segment = await tx.segment.create({
      data: {
        brandId: brand.id,
        name: plan.audience.name,
        description: plan.audience.reasoning,
        rules: plan.audience.rules as object,
        estimatedSize: plan.audience.estimatedSize,
        source: "AI",
      },
    });
    const campaign = await tx.campaign.create({
      data: {
        brandId: brand.id,
        segmentId: segment.id,
        name: plan.goal,
        goal: savedPlan.goal,
        channel: plan.channel.value,
        status: "APPROVED",
        message: plan.message.body,
        aiReasoning: {
          audience: plan.audience.reasoning,
          strategy: plan.strategy.reasoning,
          channel: plan.channel.reasoning,
          message: plan.message.reasoning,
        },
        expectedOutcome: plan.expectedOutcome,
        approvedAt: new Date(),
      },
      include: { segment: true },
    });
    await tx.auditLog.create({
      data: {
        brandId: brand.id,
        action: "CAMPAIGN_APPROVED",
        entityType: "Campaign",
        entityId: campaign.id,
        actor: "marketer",
        metadata: { planId },
      },
    });
    return campaign;
  });
}

export async function launchCampaign(campaignId: string) {
  const brand = await getBrand();
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, brandId: brand.id },
    include: { segment: true },
  });
  if (!campaign) throw new HttpError(404, "Campaign not found");
  if (campaign.status === "RUNNING") return campaign;
  if (campaign.status !== "APPROVED") throw new HttpError(409, "Only approved campaigns can be launched");
  if (!campaign.segment) throw new HttpError(409, "Campaign has no audience");

  const rules = campaignPlanSchema.shape.audience.shape.rules.parse(campaign.segment.rules);
  const customers = await prisma.customer.findMany({
    where: audienceWhere(brand.id, rules),
    select: { id: true, email: true, phone: true },
  });
  if (!customers.length) throw new HttpError(409, "No eligible shoppers remain in this audience");

  await prisma.$transaction(async (tx) => {
    await tx.communication.createMany({
      data: customers.map((customer) => ({
        campaignId: campaign.id,
        customerId: customer.id,
        channel: campaign.channel,
        recipient: campaign.channel === "EMAIL" ? customer.email : customer.phone ?? customer.email,
        message: campaign.message,
      })),
      skipDuplicates: true,
    });
    await tx.campaign.update({
      where: { id: campaign.id },
      data: { status: "RUNNING", launchedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        brandId: brand.id,
        action: "CAMPAIGN_LAUNCHED",
        entityType: "Campaign",
        entityId: campaign.id,
        actor: "marketer",
        metadata: { queued: customers.length },
      },
    });
  });
  return { id: campaign.id, status: "RUNNING", queued: customers.length };
}

export async function claimCommunications(limit: number) {
  const leaseUntil = new Date(Date.now() + 60_000);
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM "Communication"
      WHERE status = 'QUEUED'
        AND "availableAt" <= NOW()
        AND ("leaseUntil" IS NULL OR "leaseUntil" < NOW())
      ORDER BY "availableAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `);
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    await tx.communication.updateMany({
      where: { id: { in: ids } },
      data: { status: "CLAIMED", leaseUntil, attemptCount: { increment: 1 } },
    });
    return tx.communication.findMany({
      where: { id: { in: ids } },
      include: { campaign: { select: { id: true } }, customer: { select: { opportunityScore: true } } },
    });
  });
}
