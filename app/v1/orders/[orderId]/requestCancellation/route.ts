import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { emitEvent } from "@/lib/events";
import { canTransition, eventTypeFor } from "@/lib/order-transitions";
import { orderDto } from "@/lib/order-dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

type Params = { params: Promise<{ orderId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;
  const { orderId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", "Body JSON inválido.", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("invalid_request", "Campo 'reason' obrigatório.", 400);
  }

  const current = await prisma.order.findFirst({
    where: { id: orderId, unitId: ctx.unitId },
    select: { status: true },
  });
  if (!current) return errorResponse("not_found", "Pedido não encontrado.", 404);
  if (!canTransition(current.status, "CANCELLED")) {
    return errorResponse(
      "invalid_state",
      `Transição inválida: ${current.status} → CANCELLED.`,
      409
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: parsed.data.reason,
    },
    include: {
      items: true,
      tableSession: { include: { table: { select: { number: true } } } },
    },
  });
  await emitEvent({
    unitId: ctx.unitId,
    type: eventTypeFor("CANCELLED"),
    entityType: "Order",
    entityId: updated.id,
    payload: orderDto(updated),
  });
  return new NextResponse(null, { status: 204 });
}
