import { EventEmitter } from "node:events";
import type { EventLogType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Barramento de eventos operacionais.
//
// Fluxo:
//   1. Um handler de rota (ou server action) chama `emitEvent({ unitId, type, ... })`.
//   2. `emitEvent` persiste o evento no EventLog (source of truth, base para replay).
//   3. O broadcaster in-memory notifica todas as conexões SSE abertas deste servidor
//      escutando essa unit.
//
// Em deploy single-instance (o caso do MVP), isto basta. Multi-instance exige
// mover o broadcaster para Redis Pub/Sub — apenas essa camada precisa mudar.

export type EmitInput = {
  unitId: string;
  type: EventLogType;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
};

export type BroadcastEvent = {
  id: string;
  unitId: string;
  type: EventLogType;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string; // ISO
};

// Preservar o mesmo EventEmitter entre HMR reloads do Next.js dev.
declare global {
  // eslint-disable-next-line no-var
  var vwEventBus: EventEmitter | undefined;
}

const bus: EventEmitter =
  globalThis.vwEventBus ??
  (() => {
    const e = new EventEmitter();
    e.setMaxListeners(100); // até 100 SSE concorrentes por processo
    return e;
  })();
if (!globalThis.vwEventBus) {
  globalThis.vwEventBus = bus;
}

export async function emitEvent(input: EmitInput): Promise<BroadcastEvent> {
  const row = await prisma.eventLog.create({
    data: {
      unitId: input.unitId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload,
    },
  });
  const ev: BroadcastEvent = {
    id: row.id,
    unitId: row.unitId,
    type: row.type,
    entityType: row.entityType,
    entityId: row.entityId,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
  bus.emit(`unit:${input.unitId}`, ev);
  return ev;
}

export function subscribe(
  unitId: string,
  handler: (ev: BroadcastEvent) => void
): () => void {
  const channel = `unit:${unitId}`;
  bus.on(channel, handler);
  return () => {
    bus.off(channel, handler);
  };
}

// Replay de eventos posteriores a `afterEventId` para uma dada unit.
// Usado por clientes SSE que reconectam com `Last-Event-ID`.
export async function replayEventsAfter(
  unitId: string,
  afterEventId: string | null,
  maxRows = 200
): Promise<BroadcastEvent[]> {
  const anchor = afterEventId
    ? await prisma.eventLog.findUnique({
        where: { id: afterEventId },
        select: { createdAt: true },
      })
    : null;

  const rows = await prisma.eventLog.findMany({
    where: {
      unitId,
      ...(anchor ? { createdAt: { gt: anchor.createdAt } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: maxRows,
  });

  return rows.map((r) => ({
    id: r.id,
    unitId: r.unitId,
    type: r.type,
    entityType: r.entityType,
    entityId: r.entityId,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
  }));
}
