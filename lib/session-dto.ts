import type { TableSession } from "@prisma/client";

type TableSessionWithTable = TableSession & { table?: { number: string } };

export function tableSessionDto(s: TableSessionWithTable) {
  return {
    id: s.id,
    unitId: s.unitId,
    tableId: s.tableId,
    tableNumber: s.table?.number,
    agentHubConversationId: s.agentHubConversationId ?? undefined,
    customerPhone: s.customerPhone ?? undefined,
    status: s.status,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt?.toISOString(),
  };
}
