"use client";

import { useCallback, useState } from "react";
import { useEventStream, type SseEvent } from "@/lib/ops/use-event-stream";
import { Button } from "@/components/ui/button";
import { setTableStatus, closeActiveSession } from "./actions";

type TableStatusT = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DISABLED";

export type TableView = {
  id: string;
  number: string;
  label: string | null;
  status: TableStatusT;
  activeSession?: {
    id: string;
    customerPhone: string | null;
    startedAt: string;
    orderCount: number;
    openRequests: number;
  } | null;
};

const STATUS_COLOR: Record<TableStatusT, string> = {
  AVAILABLE: "bg-green-500/20 border-green-500/40",
  OCCUPIED: "bg-red-500/20 border-red-500/40",
  RESERVED: "bg-yellow-500/20 border-yellow-500/40",
  DISABLED: "bg-gray-500/20 border-gray-500/40",
};
const STATUS_LABEL: Record<TableStatusT, string> = {
  AVAILABLE: "Livre",
  OCCUPIED: "Ocupada",
  RESERVED: "Reservada",
  DISABLED: "Desativada",
};

export function TablesLiveGrid({ initial }: { initial: TableView[] }) {
  const [tables, setTables] = useState<TableView[]>(initial);
  const [selected, setSelected] = useState<TableView | null>(null);

  const onEvent = useCallback((ev: SseEvent) => {
    if (ev.entityType !== "Table") return;
    const p = ev.payload as { tableId: string };
    if (ev.type === "TABLE_OCCUPIED") {
      setTables((prev) =>
        prev.map((t) => (t.id === p.tableId ? { ...t, status: "OCCUPIED" as const } : t))
      );
    }
    if (ev.type === "TABLE_RELEASED") {
      setTables((prev) =>
        prev.map((t) =>
          t.id === p.tableId ? { ...t, status: "AVAILABLE" as const, activeSession: null } : t
        )
      );
    }
  }, []);

  const status = useEventStream("/ops/api/events/stream", onEvent);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[color:var(--muted)]">Tempo real:</span>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
        {tables.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t)}
            className={`border-2 rounded-lg p-3 text-left transition hover:shadow-md ${STATUS_COLOR[t.status]}`}
          >
            <div className="flex items-start justify-between">
              <span className="text-xl font-bold">#{t.number}</span>
              <span className="text-[10px] uppercase">{STATUS_LABEL[t.status]}</span>
            </div>
            {t.label ? (
              <div className="text-xs text-[color:var(--muted)] mt-1 truncate">{t.label}</div>
            ) : null}
            {t.activeSession ? (
              <div className="mt-2 space-y-0.5 text-[10px]">
                <div>{t.activeSession.orderCount} pedido(s)</div>
                {t.activeSession.openRequests > 0 ? (
                  <div className="text-[color:var(--destructive)]">
                    {t.activeSession.openRequests} solicitação(ões)
                  </div>
                ) : null}
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {selected ? (
        <aside
          className="fixed inset-y-0 right-0 w-96 bg-[color:var(--background)] border-l border-[color:var(--border)] shadow-xl p-4 overflow-y-auto z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">
              Mesa #{selected.number}
              {selected.label ? (
                <span className="text-xs text-[color:var(--muted)] ml-2">{selected.label}</span>
              ) : null}
            </h2>
            <Button size="sm" variant="ghost" type="button" onClick={() => setSelected(null)}>
              Fechar
            </Button>
          </div>

          <section className="space-y-2 text-sm">
            <div>
              Status:{" "}
              <span className="font-medium">{STATUS_LABEL[selected.status]}</span>
            </div>
            {selected.activeSession ? (
              <div className="space-y-1 text-xs border border-[color:var(--border)] rounded p-2">
                <div>
                  Sessão ativa desde{" "}
                  {new Date(selected.activeSession.startedAt).toLocaleString("pt-BR")}
                </div>
                {selected.activeSession.customerPhone ? (
                  <div>Cliente: {selected.activeSession.customerPhone}</div>
                ) : null}
                <div>Pedidos: {selected.activeSession.orderCount}</div>
                <div>Solicitações abertas: {selected.activeSession.openRequests}</div>
              </div>
            ) : null}
          </section>

          <section className="mt-4 space-y-2">
            <p className="text-xs font-medium">Alterar status</p>
            <div className="flex flex-wrap gap-1">
              {(["AVAILABLE", "OCCUPIED", "RESERVED", "DISABLED"] as TableStatusT[]).map((s) => (
                <form key={s} action={setTableStatus.bind(null, selected.id, s)}>
                  <Button
                    size="sm"
                    variant={selected.status === s ? "primary" : "secondary"}
                    type="submit"
                  >
                    {STATUS_LABEL[s]}
                  </Button>
                </form>
              ))}
            </div>
          </section>

          {selected.activeSession ? (
            <section className="mt-4 border-t border-[color:var(--border)] pt-4">
              <p className="text-xs text-[color:var(--muted)] mb-2">
                Encerra a sessão ativa e libera a mesa.
              </p>
              <form action={closeActiveSession.bind(null, selected.id)}>
                <Button type="submit" variant="destructive" size="sm">
                  Fechar sessão e liberar mesa
                </Button>
              </form>
            </section>
          ) : null}
        </aside>
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
