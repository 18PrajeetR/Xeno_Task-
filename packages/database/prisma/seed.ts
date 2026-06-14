import { faker } from "@faker-js/faker";
import {
  CampaignStatus,
  Channel,
  CommunicationStatus,
  CustomerStatus,
  EventType,
  InsightCategory,
  InsightSeverity,
  OrderStatus,
  Prisma,
  PrismaClient,
  SegmentSource,
} from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
faker.seed(2406);

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
const channels = [Channel.EMAIL, Channel.SMS, Channel.WHATSAPP];
const products = [
  "Cloud Knit Tee",
  "Everyday Tote",
  "Studio Trousers",
  "Linen Weekend Shirt",
  "Arc Sneakers",
  "Soft Form Hoodie",
  "Transit Jacket",
  "Daybreak Dress",
];

function weightedChannel() {
  return faker.helpers.weightedArrayElement([
    { value: Channel.EMAIL, weight: 45 },
    { value: Channel.WHATSAPP, weight: 35 },
    { value: Channel.SMS, weight: 20 },
  ]);
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.aiInsight.deleteMany();
  await prisma.communicationEvent.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.campaignPlan.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.brand.deleteMany();

  const brand = await prisma.brand.create({
    data: { name: "Northstar Atelier", timezone: "Asia/Kolkata", currency: "USD" },
  });

  const customerRows: Prisma.CustomerCreateManyInput[] = Array.from({ length: 500 }, (_, index) => {
    const cohort = index % 10;
    const dormant = cohort >= 7;
    const atRisk = cohort === 6;
    const orderCount = dormant ? faker.number.int({ min: 1, max: 5 }) : faker.number.int({ min: 3, max: 18 });
    const avgOrder = faker.number.float({ min: 38, max: 220, fractionDigits: 2 });
    const fatigue = cohort === 9 ? faker.number.int({ min: 78, max: 97 }) : faker.number.int({ min: 8, max: 73 });
    const opportunity = dormant
      ? faker.number.int({ min: 30, max: 78 })
      : faker.number.int({ min: 42, max: 96 });
    const lastOrderDays = dormant ? faker.number.int({ min: 65, max: 260 }) : faker.number.int({ min: 2, max: 62 });
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      id: randomUUID(),
      brandId: brand.id,
      externalId: `CUS-${String(index + 1).padStart(5, "0")}`,
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      phone: faker.phone.number({ style: "international" }),
      city: faker.location.city(),
      ageGroup: faker.helpers.arrayElement(["18-24", "25-34", "35-44", "45-54", "55+"]),
      preferredChannel: weightedChannel(),
      status: dormant ? CustomerStatus.DORMANT : atRisk ? CustomerStatus.AT_RISK : CustomerStatus.ACTIVE,
      loyaltyScore: Math.min(100, Math.round(orderCount * 4.5 + faker.number.int({ min: 5, max: 25 }))),
      fatigueScore: fatigue,
      opportunityScore: opportunity,
      scoreExplanation: {
        opportunity: dormant
          ? "Strong historical value despite recent inactivity"
          : "Recent purchase activity and consistent engagement",
        fatigue:
          fatigue >= 70
            ? "High recent message volume with declining response"
            : "Communication cadence is within a healthy range",
      },
      totalSpend: new Prisma.Decimal(orderCount * avgOrder),
      orderCount,
      lastOrderAt: daysAgo(lastOrderDays),
      lastActiveAt: daysAgo(Math.max(1, lastOrderDays - faker.number.int({ min: 0, max: 20 }))),
      createdAt: daysAgo(faker.number.int({ min: 180, max: 900 })),
    };
  });
  await prisma.customer.createMany({ data: customerRows });

  const customers = await prisma.customer.findMany({ orderBy: { externalId: "asc" } });
  const orderRows: Prisma.OrderCreateManyInput[] = [];
  for (let index = 0; index < 5000; index += 1) {
    const customer = customers[index % customers.length]!;
    const maxAge = Math.max(2, Math.min(720, Math.floor((now.getTime() - customer.createdAt.getTime()) / 86_400_000)));
    const total = faker.number.float({ min: 24, max: 320, fractionDigits: 2 });
    orderRows.push({
      id: randomUUID(),
      customerId: customer.id,
      orderNumber: `NS-${String(index + 10001)}`,
      total: new Prisma.Decimal(total),
      status: faker.helpers.weightedArrayElement([
        { value: OrderStatus.COMPLETED, weight: 94 },
        { value: OrderStatus.REFUNDED, weight: 4 },
        { value: OrderStatus.CANCELLED, weight: 2 },
      ]),
      items: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
        name: faker.helpers.arrayElement(products),
        quantity: faker.number.int({ min: 1, max: 2 }),
      })),
      source: faker.helpers.arrayElement(["Web", "Mobile", "Store"]),
      orderedAt: daysAgo(faker.number.int({ min: 1, max: maxAge })),
    });
  }
  await prisma.order.createMany({ data: orderRows });

  const segments = await Promise.all([
    prisma.segment.create({
      data: {
        brandId: brand.id,
        name: "High-intent regulars",
        description: "Active shoppers with strong opportunity and safe fatigue levels.",
        rules: { minOpportunityScore: 70, maxFatigueScore: 69 },
        estimatedSize: customerRows.filter((c) => (c.opportunityScore ?? 0) >= 70 && (c.fatigueScore ?? 0) <= 69).length,
        source: SegmentSource.SYSTEM,
      },
    }),
    prisma.segment.create({
      data: {
        brandId: brand.id,
        name: "Recoverable dormant shoppers",
        description: "Previously valuable shoppers inactive for more than 60 days.",
        rules: { daysSinceLastOrder: { min: 60 }, maxFatigueScore: 69 },
        estimatedSize: customerRows.filter(
          (c) => c.status === CustomerStatus.DORMANT && (c.fatigueScore ?? 0) <= 69,
        ).length,
        source: SegmentSource.AI,
      },
    }),
    prisma.segment.create({
      data: {
        brandId: brand.id,
        name: "Fatigue protection",
        description: "Shoppers temporarily suppressed from outbound communication.",
        rules: { minFatigueScore: 70 },
        estimatedSize: customerRows.filter((c) => (c.fatigueScore ?? 0) >= 70).length,
        source: SegmentSource.SYSTEM,
      },
    }),
  ]);

  const campaignRows = Array.from({ length: 100 }, (_, index) => {
    const id = randomUUID();
    const channel = channels[index % channels.length]!;
    const createdAt = daysAgo(100 - index);
    return {
      id,
      brandId: brand.id,
      segmentId: segments[index % 2]!.id,
      name: faker.helpers.arrayElement([
        "Weekend Momentum",
        "We Miss You",
        "New Season Preview",
        "Loyalty Thank You",
        "Second Purchase Nudge",
      ]) + ` ${index + 1}`,
      goal: faker.helpers.arrayElement([
        "Increase repeat purchases",
        "Reactivate inactive shoppers",
        "Boost weekend revenue",
        "Improve customer loyalty",
      ]),
      channel,
      status: CampaignStatus.COMPLETED,
      message:
        channel === Channel.WHATSAPP
          ? "A little something picked for you. Explore your private edit today."
          : "Your next favorite is waiting. Return today for a thoughtfully selected offer.",
      aiReasoning: {
        audience: "Selected from purchase recency, value, engagement, and fatigue safety.",
        channel: `${channel} showed the strongest engagement for this audience.`,
      },
      expectedOutcome: { openRate: [0.42, 0.62], clickRate: [0.08, 0.15], conversionRate: [0.03, 0.08] },
      approvedAt: createdAt,
      launchedAt: createdAt,
      completedAt: new Date(createdAt.getTime() + 2 * 86_400_000),
      createdAt,
    } satisfies Prisma.CampaignCreateManyInput;
  });
  await prisma.campaign.createMany({ data: campaignRows });

  const communicationRows: Prisma.CommunicationCreateManyInput[] = [];
  const eventRows: Prisma.CommunicationEventCreateManyInput[] = [];
  for (const [campaignIndex, campaign] of campaignRows.entries()) {
    const audience = faker.helpers.arrayElements(customers, 35);
    for (const customer of audience) {
      const communicationId = randomUUID();
      const sentAt = new Date(campaign.createdAt.getTime() + faker.number.int({ min: 30, max: 600 }) * 60_000);
      const delivered = faker.datatype.boolean({ probability: 0.94 });
      const opened = delivered && faker.datatype.boolean({ probability: campaign.channel === Channel.WHATSAPP ? 0.7 : 0.48 });
      const clicked = opened && faker.datatype.boolean({ probability: 0.24 });
      const purchased = clicked && faker.datatype.boolean({ probability: 0.28 });
      const status = purchased
        ? CommunicationStatus.PURCHASED
        : clicked
          ? CommunicationStatus.CLICKED
          : opened
            ? CommunicationStatus.OPENED
            : delivered
              ? CommunicationStatus.DELIVERED
              : CommunicationStatus.FAILED;

      communicationRows.push({
        id: communicationId,
        campaignId: campaign.id,
        customerId: customer.id,
        channel: campaign.channel,
        status,
        recipient: campaign.channel === Channel.EMAIL ? customer.email : customer.phone ?? customer.email,
        message: campaign.message,
        attemptCount: 1,
        availableAt: campaign.createdAt,
        sentAt,
        deliveredAt: delivered ? new Date(sentAt.getTime() + 60_000) : null,
        openedAt: opened ? new Date(sentAt.getTime() + 20 * 60_000) : null,
        clickedAt: clicked ? new Date(sentAt.getTime() + 35 * 60_000) : null,
        purchasedAt: purchased ? new Date(sentAt.getTime() + 4 * 3_600_000) : null,
        createdAt: campaign.createdAt,
      });

      const addEvent = (type: EventType, occurredAt: Date, metadata: Prisma.InputJsonValue = {}) =>
        eventRows.push({ id: randomUUID(), communicationId, eventId: randomUUID(), type, metadata, occurredAt });

      addEvent(EventType.SENT, sentAt);
      if (!delivered) addEvent(EventType.FAILED, new Date(sentAt.getTime() + 60_000), { reason: "Simulated provider rejection" });
      if (delivered) addEvent(EventType.DELIVERED, new Date(sentAt.getTime() + 60_000));
      if (opened) addEvent(EventType.OPENED, new Date(sentAt.getTime() + 20 * 60_000));
      if (campaign.channel === Channel.WHATSAPP && opened) addEvent(EventType.READ, new Date(sentAt.getTime() + 21 * 60_000));
      if (clicked) addEvent(EventType.CLICKED, new Date(sentAt.getTime() + 35 * 60_000));
      if (purchased) {
        addEvent(EventType.PURCHASED, new Date(sentAt.getTime() + 4 * 3_600_000), {
          revenue: faker.number.float({ min: 45, max: 260, fractionDigits: 2 }),
        });
      }
    }
    if (campaignIndex % 20 === 0) console.info(`Prepared history for ${campaignIndex + 1} campaigns`);
  }
  await prisma.communication.createMany({ data: communicationRows });
  await prisma.communicationEvent.createMany({ data: eventRows });

  await prisma.aiInsight.createMany({
    data: [
      {
        brandId: brand.id,
        category: InsightCategory.PERFORMANCE,
        severity: InsightSeverity.POSITIVE,
        title: "WhatsApp is creating the strongest intent",
        narrative: "WhatsApp read-to-click performance is 28% stronger than email for active repeat shoppers.",
        evidence: { lift: 28, comparedWith: "EMAIL", metric: "readToClickRate" },
      },
      {
        brandId: brand.id,
        category: InsightCategory.OPPORTUNITY,
        severity: InsightSeverity.INFO,
        title: "A recoverable audience is waiting",
        narrative: "Dormant shoppers with strong historical value and healthy fatigue levels are ready for a focused win-back.",
        evidence: { audience: "Recoverable dormant shoppers", count: segments[1]!.estimatedSize },
      },
      {
        brandId: brand.id,
        category: InsightCategory.FATIGUE,
        severity: InsightSeverity.WARNING,
        title: "Protect high-fatigue shoppers",
        narrative: "A concentrated group has crossed the safe communication threshold. Pausing them can preserve long-term engagement.",
        evidence: { count: segments[2]!.estimatedSize, threshold: 70 },
      },
      {
        brandId: brand.id,
        category: InsightCategory.REVENUE,
        severity: InsightSeverity.POSITIVE,
        title: "Repeat shoppers remain the revenue engine",
        narrative: "Customers with three or more purchases generated the majority of completed-order revenue.",
        evidence: { share: 71, minimumOrders: 3 },
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      brandId: brand.id,
      action: "DEMO_DATA_SEEDED",
      entityType: "Brand",
      entityId: brand.id,
      metadata: {
        customers: customerRows.length,
        orders: orderRows.length,
        campaigns: campaignRows.length,
        communications: communicationRows.length,
        events: eventRows.length,
      },
    },
  });

  console.info("Xeno Genie demo data ready", {
    customers: customerRows.length,
    orders: orderRows.length,
    campaigns: campaignRows.length,
    communications: communicationRows.length,
    events: eventRows.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
