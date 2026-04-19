import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveUnit, unauthorized, corsHeaders } from "../_auth";

const RequestTypeEnum = z.enum([
  "ORDER",
  "CALL_WAITER",
  "PHYSICAL_MENU",
  "CHECK",
  "COMPLAINT",
  "ORDER_CHANGE",
  "ORDER_STATUS",
  "ORDER_CANCEL",
  "ALLERGY_INFO",
  "CUSTOM_ITEM",
  "OTHER",
]);

const bodySchema = z.object({
  type: RequestTypeEnum,
  description: z.string().min(1).max(1000),
  tableSessionId: z.string().optional(),
  agentHubConversationId: z.string().optional(),
  agentHubMessageId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const unit = await resolveUnit(req);
  if (!unit) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido." }, { status: 400, headers: corsHeaders });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 422, headers: corsHeaders }
    );
  }

  const { type, description, tableSessionId, agentHubConversationId, agentHubMessageId, idempotencyKey } =
    parsed.data;

  // Upsert por idempotencyKey para evitar duplicatas
  let request;
  if (idempotencyKey) {
    request = await prisma.request.upsert({
      where: { unitId_idempotencyKey: { unitId: unit.id, idempotencyKey } },
      create: { unitId: unit.id, type, description, tableSessionId, agentHubConversationId, agentHubMessageId, idempotencyKey },
      update: {},
    });
  } else {
    request = await prisma.request.create({
      data: { unitId: unit.id, type, description, tableSessionId, agentHubConversationId, agentHubMessageId },
    });
  }

  return Response.json(
    { id: request.id, type: request.type, status: request.status, createdAt: request.createdAt },
    { status: 201, headers: corsHeaders }
  );
}
