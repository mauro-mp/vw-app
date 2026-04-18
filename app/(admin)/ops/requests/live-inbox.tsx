"use client";

import { useCallback, useMemo, useState } from "react";
import { useEventStream, type SseEvent } from "@/lib/ops/use-event-stream";
import { Button } from "@/components/ui/button";
import { ackRequest, resolveRequest, dismissRequest } from "./actions";

export type RequestView = {
  id: string;
  type: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";
  tableNumber?: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
};

const TYPE_LABEL: Record<string, string> = {
  CALL_WAITER: "Chamar garçom",
  PHYSICAL_MENU: "Cardápio físico",
  CHECK: "Conta",
  COMPLAINT: "Reclamação",
  ORDER_CHANGE: "Alterar pedido",
  ORDER_STATUS: "Status do pedido",
  ORDER_CANCEL: "Cancelar pedido",
  ALLERGY_INFO: "Alergia/restrição",
  CUSTOM_ITEM: "Item customizado",
  OTHER: "Outro",
};

const TYPE_COLOR: Record<string, string> = {
  CALL_WAITER: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  PHYSICAL_MENU: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  CHECK: "bg-green-500/20 text-green-700 dark:text-green-300",
  COMPLAINT: "bg-red-500/20 text-red-700 dark:text-red-300",
  ORDER_CHANGE: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  ORDER_STATUS: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  ORDER_CANCEL: "bg-red-500/20 text-red-700 dark:text-red-300",
  ALLERGY_INFO: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
  CUSTOM_ITEM: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
  OTHER: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
};

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  return new Date(iso).toLocaleString("pt-BR");
}

export function RequestsLiveInbox({ initial }: { initial: RequestView[] }) {
  const [requests, setRequests] = useState<RequestView[]>(initial);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const onEvent = useCallback((ev: SseEvent) => {
    if (ev.entityType !== "Request") return;
    const dto = ev.payload as unknown as RequestView;
    setRequests((prev) => {
      const idx = prev.findIndex((r) => r.id === dto.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = dto;
        return next;
      }
      return [dto, ...prev];
    });
  }, []);

  const status = useEventStream("/ops/api/events/stream", onEvent);

  const { open, inProgress, done } = useMemo(() => {
    const o: RequestView[] = [];
    const p: RequestView[] = [];
    const d: RequestView[] = [];
    for (const r of requests) {
      if (r.status === "OPEN") o.push(r);
      else if (r.status === "IN_PROGRESS") p.push(r);
      else d.push(r);
    }
    return { open: o, inProgress: p, done: d.slice(0, 15) };
  }, [requests]);

  const renderActions = (r: RequestView) => {
    if (r.status === "OPEN") {
      return (
        <div className="flex gap-1">
          <form action={ackRequest.bind(null, r.id)}>
            <Button size="sm" type="submit">
              Assumir
            </Button>
          </form>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            onClick={() => setResolvingId(r.id)}
          >
            Resolver
          </Button>
          <form action={dismissRequest.bind(null, r.id)}>
            <Button size="sm" variant="ghost" type="submit">
              Dispensar
            </Button>
          </form>
        </div>
      );
    }
    if (r.status === "IN_PROGRESS") {
      return (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="secondary"
            type="button"
            onClick={() => setResolvingId(r.id)}
          >
            Resolver
          </Button>
          <form action={dismissRequest.bind(null, r.id)}>
            <Button size="sm" variant="ghost" type="submit">
              Dispensar
            </Button>
          </form>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[color:var(--muted)]">Tempo real:</span>
        <StatusBadge status={status} />
        <span className="ml-auto text-[color:var(--muted)]">
          {open.length} pendentes · {inProgress.length} em andamento
        </span>
      </div>

      {open.length === 0 && inProgress.length === 0 ? (
        <section className="rounded-lg border border-dashed border-[color:var(--border)] p-8 text-center text-sm text-[color:var(--muted)]">
          Nenhuma solicitação pendente.
        </section>
      ) : null}

      {open.length > 0 ? (
        <Section
          title="Pendentes"
          items={open}
          resolvingId={resolvingId}
          setResolvingId={setResolvingId}
          renderActions={renderActions}
        />
      ) : null}

      {inProgress.length > 0 ? (
        <Section
          title="Em andamento"
          items={inProgress}
          resolvingId={resolvingId}
          setResolvingId={setResolvingId}
          renderActions={renderActions}
        />
      ) : null}

      {done.length > 0 ? (
        <Section
          title="Resolvidos recentemente"
          items={done}
          compact
          resolvingId={null}
          setResolvingId={setResolvingId}
          renderActions={() => null}
        />
      ) : null}
    </div>
  );
}

function Section({
  title,
  items,
  compact = false,
  resolvingId,
  setResolvingId,
  renderActions,
}: {
  title: string;
  items: RequestView[];
  compact?: boolean;
  resolvingId: string | null;
  setResolvingId: (id: string | null) => void;
  renderActions: (r: RequestView) => React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[color:var(--border)] overflow-hidden">
      <header className="bg-[color:var(--border)]/30 px-3 py-2 text-sm font-semibold">
        {title}{" "}
        <span className="text-xs text-[color:var(--muted)] font-normal">({items.length})</span>
      </header>
      <ul className="divide-y divide-[color:var(--border)]">
        {items.map((r) => (
          <li key={r.id} className={compact ? "px-3 py-1.5" : "px-3 py-3"}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                      TYPE_COLOR[r.type] ?? "bg-gray-500/20"
                    }`}
                  >
                    {TYPE_LABEL[r.type] ?? r.type}
                  </span>
                  <span className="text-xs">Mesa {r.tableNumber ?? "—"}</span>
                  <span className="text-xs text-[color:var(--muted)]">
                    {fmtRelative(r.createdAt)}
                  </span>
                </div>
                <p className={compact ? "text-xs text-[color:var(--muted)]" : "text-sm"}>
                  {r.description}
                </p>
                {r.resolutionNotes ? (
                  <p className="text-[10px] text-[color:var(--muted)] mt-0.5">
                    Resolução: {r.resolutionNotes}
                  </p>
                ) : null}
              </div>
              {!compact ? <div className="shrink-0">{renderActions(r)}</div> : null}
            </div>
            {resolvingId === r.id ? (
              <form
                action={resolveRequest.bind(null, r.id)}
                className="mt-2 flex gap-1"
                onSubmit={() => setResolvingId(null)}
              >
                <input
                  type="text"
                  name="resolutionNotes"
                  placeholder="Nota de resolução (opcional)"
                  className="flex-1 text-xs border border-[color:var(--border)] rounded px-2 py-1 bg-[color:var(--background)]"
                />
                <Button size="sm" type="submit">
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setResolvingId(null)}
                >
                  Cancelar
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
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
