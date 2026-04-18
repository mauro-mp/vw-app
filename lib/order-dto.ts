import type { Order, OrderItem } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

type OrderWithItems = Order & { items: OrderItem[]; tableSession?: { table: { number: string } } | null };

function price(amount: Decimal | number | string, currency = "BRL") {
  const n = typeof amount === "object" && amount !== null ? Number(amount) : Number(amount);
  return { amount: Number(n.toFixed(2)), currency };
}

export function orderItemDto(it: OrderItem) {
  return {
    id: it.id,
    menuItemId: it.menuItemId,
    itemName: it.itemName,
    quantity: it.quantity,
    unitPrice: price(it.unitPrice),
    totalPrice: price(it.totalPrice),
    observations: it.observations ?? undefined,
    selectedOptions: (it.selectedOptions as unknown) ?? undefined,
  };
}

export function orderDto(o: OrderWithItems) {
  return {
    id: o.id,
    unitId: o.unitId,
    tableSessionId: o.tableSessionId ?? undefined,
    tableNumber: o.tableSession?.table.number,
    agentHubConversationId: o.agentHubConversationId ?? undefined,
    agentHubMessageId: o.agentHubMessageId ?? undefined,
    idempotencyKey: o.idempotencyKey ?? undefined,
    status: o.status,
    items: o.items.map(orderItemDto),
    subtotal: price(o.subtotal),
    total: price(o.total),
    notes: o.notes ?? undefined,
    cancellationReason: o.cancellationReason ?? undefined,
    createdAt: o.createdAt.toISOString(),
    confirmedAt: o.confirmedAt?.toISOString(),
    preparingAt: o.preparingAt?.toISOString(),
    concludedAt: o.concludedAt?.toISOString(),
    cancelledAt: o.cancelledAt?.toISOString(),
  };
}
