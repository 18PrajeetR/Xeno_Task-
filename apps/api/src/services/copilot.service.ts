import { GoogleGenAI } from "@google/genai";
import { prisma } from "@xeno/database";
import { campaignPlanSchema, type CampaignPlan } from "@xeno/shared";
import { config } from "../config.js";
import { getBrand } from "../lib/brand.js";
import { countAudience } from "./audience.service.js";

function fallbackPlan(goal: string, dormantCount: number): CampaignPlan {
  const lower = goal.toLowerCase();
  const dormant = /inactive|dormant|bring back|reactivat/.test(lower);
  const loyalty = /loyal|repeat|retention/.test(lower);

  if (dormant) {
    return {
      goal: "Reactivate valuable dormant shoppers",
      audience: {
        name: "Recoverable dormant shoppers",
        rules: { daysSinceLastOrder: { min: 60 }, minOpportunityScore: 35, maxFatigueScore: 69 },
        estimatedSize: dormantCount,
        protectedByFatiguePolicy: 0,
        reasoning: "These shoppers have prior purchase intent, but have been inactive for at least 60 days. High-fatigue shoppers are excluded.",
      },
      strategy: {
        summary: "Lead with relevance, not urgency",
        reasoning: "A curated return message preserves margin and feels more personal than a broad discount.",
      },
      channel: {
        value: "WHATSAPP",
        reasoning: "WhatsApp has the strongest read-to-click performance among previously engaged shoppers.",
      },
      message: {
        body: "We saved a thoughtful edit for you. Come back to Northstar Atelier and enjoy a private welcome-back benefit, selected around what you loved before.",
        reasoning: "The copy acknowledges the relationship, creates curiosity, and avoids aggressive promotional pressure.",
      },
      expectedOutcome: {
        openRate: [0.62, 0.7],
        clickRate: [0.12, 0.17],
        conversionRate: [0.05, 0.08],
        revenue: [4200, 6800],
      },
      followUp: "Wait 7 days, then retarget only clickers who did not purchase.",
    };
  }

  return {
    goal: loyalty ? "Increase repeat purchase momentum" : goal,
    audience: {
      name: "High-intent, fatigue-safe shoppers",
      rules: { minOrders: 1, minOpportunityScore: 65, maxFatigueScore: 69 },
      estimatedSize: 0,
      protectedByFatiguePolicy: 0,
      reasoning: "This audience combines recent intent, customer value, and a safe communication cadence.",
    },
    strategy: {
      summary: "Turn current intent into the next purchase",
      reasoning: "A timely, personalized product discovery message is more efficient than discounting the entire customer base.",
    },
    channel: {
      value: "EMAIL",
      reasoning: "Email provides the space needed for product discovery while keeping interruption low.",
    },
    message: {
      body: "Your next Northstar favorite is ready. Explore a personal edit inspired by the pieces you return to most.",
      reasoning: "The message feels useful and individualized while keeping the goal commercially clear.",
    },
    expectedOutcome: {
      openRate: [0.46, 0.56],
      clickRate: [0.09, 0.14],
      conversionRate: [0.04, 0.07],
      revenue: [5200, 8400],
    },
    followUp: "Build a second audience from engaged non-buyers after 5 days.",
  };
}

async function businessContext(brandId: string) {
  const [customers, dormant, fatigued, highOpportunity, channelEvents] = await Promise.all([
    prisma.customer.count({ where: { brandId } }),
    prisma.customer.count({ where: { brandId, status: "DORMANT" } }),
    prisma.customer.count({ where: { brandId, fatigueScore: { gte: 70 } } }),
    prisma.customer.count({ where: { brandId, opportunityScore: { gte: 70 }, fatigueScore: { lte: 69 } } }),
    prisma.communication.groupBy({
      by: ["channel", "status"],
      where: { campaign: { brandId } },
      _count: true,
    }),
  ]);
  return { customers, dormant, fatigued, highOpportunity, channelEvents };
}

export async function createPlan(goal: string) {
  const brand = await getBrand();
  const context = await businessContext(brand.id);
  let plan = fallbackPlan(goal, context.dormant);
  let source = "FALLBACK";

  if (config.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: config.GEMINI_MODEL,
        contents: `You are Xeno Genie, an expert retail relationship strategist.
Return only JSON matching the supplied schema. Never invent customer counts.
Business: ${brand.name}
Goal: ${goal}
Aggregate context: ${JSON.stringify(context)}
Design a fatigue-safe campaign. Rules may use daysSinceLastOrder, minOrders,
minLifetimeValue, minOpportunityScore, maxFatigueScore, preferredChannels.
Every recommendation must contain evidence-based reasoning.`,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: campaignPlanSchema,
          temperature: 0.35,
        },
      });
      plan = campaignPlanSchema.parse(JSON.parse(response.text ?? "{}"));
      source = "GEMINI";
    } catch (error) {
      console.warn("Gemini plan generation failed; using fallback", error);
    }
  }

  const counts = await countAudience(brand.id, plan.audience.rules);
  plan.audience.estimatedSize = counts.estimatedSize;
  plan.audience.protectedByFatiguePolicy = counts.protectedByFatiguePolicy;

  const saved = await prisma.campaignPlan.create({
    data: {
      brandId: brand.id,
      goal,
      plan: plan as object,
      source,
      expiresAt: new Date(Date.now() + 24 * 3_600_000),
    },
  });
  await prisma.auditLog.create({
    data: {
      brandId: brand.id,
      action: "AI_PLAN_CREATED",
      entityType: "CampaignPlan",
      entityId: saved.id,
      metadata: { source, goal, audienceSize: counts.estimatedSize },
    },
  });
  return { planId: saved.id, ...plan, source };
}
