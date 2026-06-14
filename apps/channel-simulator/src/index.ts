import "dotenv/config";
import { createHmac, randomUUID } from "node:crypto";
import express from "express";
import { z } from "zod";

const env = z.object({
  PORT: z.coerce.number().optional(),
  SIMULATOR_PORT: z.coerce.number().default(4001),
  CRM_INTERNAL_URL: z.string().default("http://localhost:4000/api/v1"),
  CRM_SERVICE_TOKEN: z.string().min(12).default("development-service-token"),
  CALLBACK_SECRET: z.string().min(12).default("development-callback-secret"),
  SIMULATOR_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.08),
}).transform((value) => ({
  ...value,
  SIMULATOR_PORT: value.PORT ?? value.SIMULATOR_PORT,
})).parse(process.env);

type Communication = {
  id: string;
  campaignId: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  recipient: string;
  attemptCount: number;
  customer: { opportunityScore: number };
};

type EventType = "SENT" | "DELIVERED" | "FAILED" | "OPENED" | "READ" | "CLICKED" | "PURCHASED";
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const delay = () => 250 + Math.floor(Math.random() * 900);
let active = 0;
let processed = 0;
let callbackRetries = 0;
let lastPollAt: string | null = null;

async function postEvent(communication: Communication, type: EventType, metadata: Record<string, unknown> = {}) {
  const payload = JSON.stringify({
    eventId: randomUUID(),
    communicationId: communication.id,
    campaignId: communication.campaignId,
    type,
    occurredAt: new Date().toISOString(),
    metadata,
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const timestamp = String(Date.now());
    const signature = createHmac("sha256", env.CALLBACK_SECRET)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    try {
      const response = await fetch(`${env.CRM_INTERNAL_URL}/callbacks/channel-events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-xeno-timestamp": timestamp,
          "x-xeno-signature": signature,
        },
        body: payload,
      });
      if (response.ok) return;
      throw new Error(`Callback returned ${response.status}`);
    } catch (error) {
      callbackRetries += 1;
      if (attempt === 4) throw error;
      await sleep(500 * 2 ** attempt);
    }
  }
}

async function release(communication: Communication, error: unknown) {
  await fetch(`${env.CRM_INTERNAL_URL}/internal/communications/${communication.id}/release`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.CRM_SERVICE_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
  }).catch(() => undefined);
}

async function simulate(communication: Communication) {
  active += 1;
  try {
    await sleep(delay());
    await postEvent(communication, "SENT");
    await sleep(delay());

    if (Math.random() < env.SIMULATOR_FAILURE_RATE) {
      await postEvent(communication, "FAILED", { reason: "Simulated provider rejection", retryable: false });
      return;
    }
    await postEvent(communication, "DELIVERED");

    const opportunity = communication.customer.opportunityScore / 100;
    const openProbability =
      communication.channel === "WHATSAPP" ? 0.55 + opportunity * 0.3 : 0.3 + opportunity * 0.35;
    if (Math.random() > openProbability) return;
    await sleep(delay());
    await postEvent(communication, communication.channel === "WHATSAPP" ? "READ" : "OPENED");

    if (Math.random() > 0.08 + opportunity * 0.2) return;
    await sleep(delay());
    await postEvent(communication, "CLICKED");

    if (Math.random() > 0.03 + opportunity * 0.16) return;
    await sleep(delay());
    await postEvent(communication, "PURCHASED", {
      revenue: Math.round((45 + Math.random() * 210) * 100) / 100,
      attribution: "last-touch",
    });
  } catch (error) {
    console.error("Simulation failed", { communicationId: communication.id, error });
    await release(communication, error);
  } finally {
    active -= 1;
    processed += 1;
  }
}

async function poll() {
  if (active > 25) return;
  lastPollAt = new Date().toISOString();
  try {
    const response = await fetch(`${env.CRM_INTERNAL_URL}/internal/communications/claim`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.CRM_SERVICE_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ limit: Math.min(10, 25 - active) }),
    });
    if (!response.ok) throw new Error(`Claim returned ${response.status}`);
    const communications = (await response.json()) as Communication[];
    for (const communication of communications) void simulate(communication);
  } catch (error) {
    console.warn("Queue poll unavailable", error instanceof Error ? error.message : error);
  }
}

const app = express();
app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "xeno-channel-simulator",
    active,
    processed,
    callbackRetries,
    lastPollAt,
  });
});

const server = app.listen(env.SIMULATOR_PORT, () => {
  console.info(`Channel simulator listening on http://localhost:${env.SIMULATOR_PORT}`);
});
const timer = setInterval(() => void poll(), 2_000);
void poll();

function shutdown() {
  clearInterval(timer);
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
