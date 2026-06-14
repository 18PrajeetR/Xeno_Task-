import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@xeno/database";
import type { LifecycleEvent } from "@xeno/shared";
import { config } from "../config.js";
import { HttpError } from "../lib/http.js";

const statusOrder = ["QUEUED", "CLAIMED", "SENT", "DELIVERED", "OPENED", "READ", "CLICKED", "PURCHASED"];

export function verifyCallback(body: string, timestamp: string | undefined, signature: string | undefined) {
  if (!timestamp || !signature) throw new HttpError(401, "Missing callback signature");
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60_000) throw new HttpError(401, "Expired callback");
  const expected = createHmac("sha256", config.CALLBACK_SECRET).update(`${timestamp}.${body}`).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new HttpError(401, "Invalid callback signature");
  }
}

export async function ingestEvent(event: LifecycleEvent) {
  const existing = await prisma.communicationEvent.findUnique({ where: { eventId: event.eventId } });
  if (existing) return { duplicate: true };
  const communication = await prisma.communication.findUnique({
    where: { id: event.communicationId },
    include: { campaign: true },
  });
  if (!communication || communication.campaignId !== event.campaignId) {
    throw new HttpError(404, "Communication not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.communicationEvent.create({
      data: {
        communicationId: communication.id,
        eventId: event.eventId,
        type: event.type,
        metadata: event.metadata as object,
        occurredAt: new Date(event.occurredAt),
      },
    });
    const currentRank = statusOrder.indexOf(communication.status);
    const nextRank = statusOrder.indexOf(event.type);
    const data: Record<string, unknown> = {};
    if (event.type === "FAILED") data.status = "FAILED";
    else if (nextRank > currentRank) data.status = event.type;
    const field = {
      SENT: "sentAt",
      DELIVERED: "deliveredAt",
      OPENED: "openedAt",
      READ: "openedAt",
      CLICKED: "clickedAt",
      PURCHASED: "purchasedAt",
      FAILED: null,
    }[event.type];
    if (field) data[field] = new Date(event.occurredAt);
    await tx.communication.update({ where: { id: communication.id }, data });
  });
  return { duplicate: false };
}
