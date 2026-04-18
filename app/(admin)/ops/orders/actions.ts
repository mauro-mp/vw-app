"use server";

import { requireStaff } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";
import { canTransition, eventTypeFor } from "@/lib/order-transitions";
import { orderDto } from "@/lib/order-dto";
import type { OrderStatus } from "@prisma/client";

async function transition(orderId: string, to: OrderStatus, cancellationReason?: string) {
  const ctx = await requireStaff();
  const current = await prisma.order.findFirst({
    where: { id: orderId, unitId: ctx.activeUnitId },
    select: { status: true },
  });
  if (!current) throw new Error("Pedido não encontrado");
  if (!canTransition(current.status, to)) {
    throw new Error(`Transição inválida: ${current.status} → ${to}`);
  }
  const data: Record<string, unknown> = { status: to };
  if (to === "CONFIRMED") data.confirmedAt = new Date();
  if (to === "PREPARING") data.preparingAt = new Date();
  if (to === "CONCLUDED") data.concludedAt = new Date();
  if (to === "CANCELLED") {
    data.cancelledAt = new Date();
    data.cancellationReason = cancellationReason ?? "Cancelado pelo operador";
  }
  const updated = await prisma.order.update({
    where: { id: orderId },
    data,
    include: {
      items: true,
      tableSession: { include: { table: { select: { number: true } } } },
    },
  });
  await emitEvent({
    unitId: ctx.activeUnitId,
    type: eventTypeFor(to),
    entityType: "Order",
    entityId: updated.id,
    payload: orderDto(updated),
  });
}

export async function confirmOrder(orderId: string) {
  await transition(orderId, "CONFIRMED");
}
export async function startPreparing(orderId: string) {
  await transition(orderId, "PREPARING");
}
export async function concludeOrder(orderId: string) {
  await transition(orderId, "CONCLUDED");
}
export async function cancelOrder(orderId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim() || "Cancelado pelo operador";
  await transition(orderId, "CANCELLED", reason);
}
