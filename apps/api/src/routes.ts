import { Router, type Request } from "express";
import { prisma } from "@xeno/database";
import {
  createCampaignSchema,
  goalRequestSchema,
  lifecycleEventSchema,
} from "@xeno/shared";
import { config } from "./config.js";
import { getBrand } from "./lib/brand.js";
import { asyncHandler, HttpError } from "./lib/http.js";
import { analytics, dashboard } from "./services/dashboard.service.js";
import { approveCampaign, claimCommunications, launchCampaign } from "./services/campaign.service.js";
import { createPlan } from "./services/copilot.service.js";
import { ingestEvent, verifyCallback } from "./services/event.service.js";

export const router = Router();

router.get("/health", asyncHandler(async (_request, response) => {
  await prisma.$queryRaw`SELECT 1`;
  response.json({ status: "ok", service: "xeno-crm-api", time: new Date().toISOString() });
}));

router.get("/dashboard", asyncHandler(async (_request, response) => response.json(await dashboard())));
router.get("/analytics", asyncHandler(async (_request, response) => response.json(await analytics())));

router.post("/copilot/plan", asyncHandler(async (request, response) => {
  const { goal } = goalRequestSchema.parse(request.body);
  response.json(await createPlan(goal));
}));

router.post("/campaigns", asyncHandler(async (request, response) => {
  const { planId } = createCampaignSchema.parse(request.body);
  response.status(201).json(await approveCampaign(planId));
}));

router.post("/campaigns/:id/launch", asyncHandler(async (request, response) => {
  response.json(await launchCampaign(String(request.params.id)));
}));

router.get("/campaigns", asyncHandler(async (_request, response) => {
  const brand = await getBrand();
  response.json(await prisma.campaign.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "desc" },
    include: { segment: true, _count: { select: { communications: true } } },
  }));
}));

router.get("/customers", asyncHandler(async (request, response) => {
  const brand = await getBrand();
  const query = String(request.query.q ?? "");
  const take = Math.min(Number(request.query.limit ?? 50), 100);
  response.json(await prisma.customer.findMany({
    where: {
      brandId: brand.id,
      ...(query
        ? { OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ] }
        : {}),
    },
    orderBy: { opportunityScore: "desc" },
    take,
  }));
}));

router.get("/customers/:id", asyncHandler(async (request, response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: String(request.params.id) },
    include: {
      orders: { orderBy: { orderedAt: "desc" }, take: 12 },
      communications: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { campaign: { select: { name: true } }, events: { orderBy: { occurredAt: "desc" } } },
      },
    },
  });
  if (!customer) throw new HttpError(404, "Shopper not found");
  response.json(customer);
}));

router.get("/insights", asyncHandler(async (_request, response) => {
  const brand = await getBrand();
  response.json(await prisma.aiInsight.findMany({
    where: { brandId: brand.id, isActive: true },
    orderBy: { generatedAt: "desc" },
  }));
}));

function requireServiceToken(request: Request) {
  if (request.header("authorization") !== `Bearer ${config.CRM_SERVICE_TOKEN}`) {
    throw new HttpError(401, "Invalid service token");
  }
}

router.post("/internal/communications/claim", asyncHandler(async (request, response) => {
  requireServiceToken(request);
  response.json(await claimCommunications(Math.min(Number(request.body?.limit ?? 10), 50)));
}));

router.post("/internal/communications/:id/release", asyncHandler(async (request, response) => {
  requireServiceToken(request);
  await prisma.communication.update({
    where: { id: String(request.params.id) },
    data: {
      status: "QUEUED",
      leaseUntil: null,
      availableAt: new Date(Date.now() + 10_000),
      lastError: String(request.body?.error ?? "Simulator released communication"),
    },
  });
  response.status(204).end();
}));

router.post("/callbacks/channel-events", asyncHandler(async (request, response) => {
  const rawBody = JSON.stringify(request.body);
  verifyCallback(rawBody, request.header("x-xeno-timestamp"), request.header("x-xeno-signature"));
  const event = lifecycleEventSchema.parse(request.body);
  response.json(await ingestEvent(event));
}));

router.get("/dashboard-test", asyncHandler(async (_req, res) => {
  const brand = await getBrand();

  const customers = await prisma.customer.count({
    where: { brandId: brand.id }
  });

  res.json({ customers });
}));

