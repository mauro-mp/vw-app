"use client";

import { useCallback, useMemo, useState } from "react";
import { useEventStream, type SseEvent } from "@/lib/ops/use-event-stream";
import { Button } from "@/components/ui/button";
import { confirmOrder, startPreparing, concludeOrder, cancelOrder } from "./actions";

type Price = { amount: number; currency: string };
type OrderItemView = {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: Price;
  totalPrice: Price;
  observations?: string;
  selectedOptions?: Array<{ optionGroupName: string; optionName: string }>;
};

export type OrderView = {
  id: string;
  status: "CREATED" | "CONFIRMED" | "PREPARING" | "CONCLUDED" | "CANCELLED";
  tableNumber?: string;
  items: OrderItemView[];
  subtotal: Price;
  total: Price;
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  preparingAt?: string;
  concludedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
};

const COLUMNS: Array<{ key: OrderView["status"]; label: string }> = [
  { key: "CREATED", label: "Novos" },
  { key: "CONFIRMED", label: "Confirmados" },
  { key: "PREPARING", label: "Em preparo" },
  { key: "CONCLUDED", label: "Concluídos" },
];

function fmtTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtPrice(p: Price) {
  return `R$ ${p.amount.toFixed(2).replace(".", ",")}`;
}

export function OrdersLiveBoard({ initial }: { initial: OrderView[] }) {
  const [orders, setOrders] = useState<OrderView[]>(initial);

  const onEvent = useCallback((ev: SseEvent) => {
    if (ev.entityType !== "Order") return;
    const dto = ev.payload as unknown as OrderView;
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === dto.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = dto;
        return next;
      }
      return [dto, ...prev];
    });
  }, []);

  const status = useEventStream("/ops/api/events/stream", onEvent);

  const columns = useMemo(() => {
    const out: Record<OrderView["status"], OrderView[]> = {
      CREATED: [],
      CONFIRMED: [],
      PREPARING: [],
      CONCLUDED: [],
      CANCELLED: [],
    };
    for (const o of orders) {
      if (out[o.status]) out[o.status].push(o);
    }
    // Concluídos: limitar aos últimos 10 para não crescer infinito
    out.CONCLUDED = out.CONCLUDED.slice(0, 10);
    return out;
  }, [orders]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[color:var(--muted)]">Tempo real:</span>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-lg border border-[color:var(--border)] overflow-hidden">
            <header className="px-3 py-2 bg-[color:var(--border)]/30 text-sm font-medium flex items-center justify-between">
              <span>{col.label}</span>
              <span className="text-xs text-[color:var(--muted)]">{columns[col.key].length}</span>
            </header>
            <ul className="p-2 space-y-2 min-h-[100px]">
              {columns[col.key].length === 0 ? (
                <li className="text-xs text-[color:var(--muted)] text-center py-4">—</li>
              ) : null}
              {columns[col.key].map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {columns.CANCELLED.length > 0 ? (
        <section className="rounded-lg border border-[color:var(--border)] p-3 text-xs text-[color:var(--muted)]">
          <p className="font-medium mb-1">
            Cancelados recentes ({columns.CANCELLED.length})
          </p>
          <ul className="space-y-0.5">
            {columns.CANCELLED.slice(0, 5).map((o) => (
              <li key={o.id}>
                #{o.id.slice(-4)} • Mesa {o.tableNumber ?? "—"} • {fmtTime(o.cancelledAt)} •{" "}
                <em>{o.cancellationReason ?? ""}</em>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: "connecting" | "open" | "closed" | "error" }) {
  const map = {
    connecting: { text: "conectando…", color: "bg-yellow-500" },
    open: { text: "ao vivo", color: "bg-green-500" },
    error: { text: "reconectando…", color: "bg-red-500" },
    closed: { text: "desconectado", color: "bg-[color:var(--muted)]" },
  } as const;
  const m = map[status];
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`inline-block h-2 w-2 rounded-full ${m.color}`} />
      {m.text}
    </span>
  );
}

function OrderCard({ order }: { order: OrderView }) {
  const [cancelling, setCancelling] = useState(false);
  return (
    <li className="border border-[color:var(--border)] rounded-md p-2 text-sm bg-[color:var(--background)]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-xs text-[color:var(--muted)]">#{order.id.slice(-4)}</span>
        <span className="text-xs font-medium">
          {order.tableNumber ? `Mesa ${order.tableNumber}` : "Sem mesa"}
        </span>
        <span className="text-xs text-[color:var(--muted)]">{fmtTime(order.createdAt)}</span>
      </div>
      <ul className="text-xs space-y-0.5 mb-2">
        {order.items.map((it) => (
          <li key={it.id}>
            {it.quantity}x {it.itemName}
            {it.selectedOptions && it.selectedOptions.length > 0 ? (
              <span className="text-[color:var(--muted)]">
                {" "}
                ({it.selectedOptions.map((s) => s.optionName).join(", ")})
              </span>
            ) : null}
            {it.observations ? (
              <span className="block pl-4 text-[10px] text-[color:var(--muted)] italic">
                obs: {it.observations}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {order.notes ? (
        <p className="text-[10px] italic text-[color:var(--muted)] mb-1.5">obs: {order.notes}</p>
      ) : null}
      <div className="text-xs font-medium mb-2 text-right">Total: {fmtPrice(order.total)}</div>
      <div className="flex gap-1">
        {order.status === "CREATED" ? (
          <form action={confirmOrder.bind(null, order.id)} className="flex-1">
            <Button size="sm" type="submit" className="w-full">
              Confirmar
            </Button>
          </form>
        ) : null}
        {order.status === "CONFIRMED" ? (
          <form action={startPreparing.bind(null, order.id)} className="flex-1">
            <Button size="sm" type="submit" className="w-full">
              Preparar
            </Button>
          </form>
        ) : null}
        {order.status === "PREPARING" ? (
          <form action={concludeOrder.bind(null, order.id)} className="flex-1">
            <Button size="sm" type="submit" className="w-full">
              Entregue
            </Button>
          </form>
        ) : null}
        {(order.status === "CREATED" ||
          order.status === "CONFIRMED" ||
          order.status === "PREPARING") &&
        !cancelling ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCancelling(true)}
            type="button"
          >
            ×
          </Button>
        ) : null}
      </div>
      {cancelling ? (
        <form action={cancelOrder.bind(null, order.id)} className="mt-2 space-y-1">
          <input
            type="text"
            name="reason"
            placeholder="Motivo do cancelamento"
            required
            className="w-full text-xs border border-[color:var(--border)] rounded px-2 py-1 bg-[color:var(--background)]"
          />
          <div className="flex gap-1">
            <Button size="sm" variant="destructive" type="submit" className="flex-1">
              Cancelar pedido
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCancelling(false)}
              type="button"
            >
              Voltar
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
