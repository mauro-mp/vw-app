import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { emitEvent } from "@/lib/events";
import { canTransition, eventTypeFor } from "@/lib/order-transitions";
import { orderDto } from "@/lib/order-dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ orderId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;
  const { orderId } = await params;

  const current = await prisma.order.findFirst({
    where: { id: orderId, unitId: ctx.unitId },
    select: { status: true },
  });
  if (!current) return errorResponse("not_found", "Pedido não encontrado.", 404);
  if (!canTransition(current.status, "CONFIRMED")) {
    return errorResponse(
      "invalid_state",
      `Transição inválida: ${current.status} → CONFIRMED.`,
      409
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
    include: {
      items: true,
      tableSession: { include: { table: { select: { number: true } } } },
    },
  });
  await emitEvent({
    unitId: ctx.unitId,
    type: eventTypeFor("CONFIRMED"),
    entityType: "Order",
    entityId: updated.id,
    payload: orderDto(updated),
  });
  return new NextResponse(null, { status: 204 });
}
