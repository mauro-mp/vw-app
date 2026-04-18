import type { OrderStatus } from "@prisma/client";
import type { EventLogType } from "@prisma/client";

// Máquina de estados do pedido em dine-in.
// CREATED → CONFIRMED → PREPARING → CONCLUDED
// qualquer estado (exceto terminal) → CANCELLED

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["CONCLUDED", "CANCELLED"],
  CONCLUDED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function timestampFieldFor(status: OrderStatus): keyof {
  confirmedAt: Date;
  preparingAt: Date;
  concludedAt: Date;
  cancelledAt: Date;
} | null {
  switch (status) {
    case "CONFIRMED":
      return "confirmedAt";
    case "PREPARING":
      return "preparingAt";
    case "CONCLUDED":
      return "concludedAt";
    case "CANCELLED":
      return "cancelledAt";
    default:
      return null;
  }
}

export function eventTypeFor(status: OrderStatus): EventLogType {
  switch (status) {
    case "CREATED":
      return "ORDER_CREATED";
    case "CONFIRMED":
      return "ORDER_CONFIRMED";
    case "PREPARING":
      return "ORDER_PREPARING";
    case "CONCLUDED":
      return "ORDER_CONCLUDED";
    case "CANCELLED":
      return "ORDER_CANCELLED";
  }
}
