import type { Request as RequestModel } from "@prisma/client";

type RequestWithTable = RequestModel & {
  tableSession?: { table: { number: string } } | null;
};

export function requestDto(r: RequestWithTable) {
  return {
    id: r.id,
    unitId: r.unitId,
    tableSessionId: r.tableSessionId ?? undefined,
    tableNumber: r.tableSession?.table.number,
    agentHubConversationId: r.agentHubConversationId ?? undefined,
    agentHubMessageId: r.agentHubMessageId ?? undefined,
    type: r.type,
    description: r.description,
    status: r.status,
    assignedToEmployeeId: r.assignedToEmployeeId ?? undefined,
    resolvedByEmployeeId: r.resolvedByEmployeeId ?? undefined,
    resolutionNotes: r.resolutionNotes ?? undefined,
    createdAt: r.createdAt.toISOString(),
    acknowledgedAt: r.acknowledgedAt?.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString(),
  };
}
