import { z } from "zod";

export const channelSchema = z.enum(["EMAIL", "SMS", "WHATSAPP"]);
export type Channel = z.infer<typeof channelSchema>;

export const audienceRulesSchema = z.object({
  daysSinceLastOrder: z
    .object({ min: z.number().int().nonnegative().optional(), max: z.number().int().nonnegative().optional() })
    .optional(),
  minOrders: z.number().int().nonnegative().optional(),
  minLifetimeValue: z.number().nonnegative().optional(),
  minOpportunityScore: z.number().min(0).max(100).optional(),
  maxFatigueScore: z.number().min(0).max(100).default(69),
  preferredChannels: z.array(channelSchema).optional(),
});

const reasonedTextSchema = z.object({
  summary: z.string().min(1),
  reasoning: z.string().min(1),
});

export const campaignPlanSchema = z.object({
  goal: z.string().min(1),
  audience: z.object({
    name: z.string().min(1),
    rules: audienceRulesSchema,
    estimatedSize: z.number().int().nonnegative(),
    protectedByFatiguePolicy: z.number().int().nonnegative(),
    reasoning: z.string().min(1),
  }),
  strategy: reasonedTextSchema,
  channel: z.object({
    value: channelSchema,
    reasoning: z.string().min(1),
  }),
  message: z.object({
    body: z.string().min(1).max(1000),
    reasoning: z.string().min(1),
  }),
  expectedOutcome: z.object({
    openRate: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
    clickRate: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
    conversionRate: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
    revenue: z.tuple([z.number().nonnegative(), z.number().nonnegative()]),
  }),
  followUp: z.string().min(1),
});

export const goalRequestSchema = z.object({
  goal: z.string().trim().min(5).max(500),
});

export const createCampaignSchema = z.object({
  planId: z.string().uuid(),
});

export const lifecycleEventSchema = z.object({
  eventId: z.string().uuid(),
  communicationId: z.string().uuid(),
  campaignId: z.string().uuid(),
  type: z.enum(["SENT", "DELIVERED", "FAILED", "OPENED", "READ", "CLICKED", "PURCHASED"]),
  occurredAt: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type AudienceRules = z.infer<typeof audienceRulesSchema>;
export type CampaignPlan = z.infer<typeof campaignPlanSchema>;
export type LifecycleEvent = z.infer<typeof lifecycleEventSchema>;

