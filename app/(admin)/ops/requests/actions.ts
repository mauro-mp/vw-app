"use server";

import type { RequestStatus, EventLogType } from "@prisma/client";
import { requireStaff } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";
import { requestDto } from "@/lib/request-dto";

const STATUS_EVENT: Record<RequestStatus, EventLogType> = {
  OPEN: "REQUEST_CREATED",
  IN_PROGRESS: "REQUEST_ACKNOWLEDGED",
  RESOLVED: "REQUEST_RESOLVED",
  DISMISSED: "REQUEST_DISMISSED",
};

async function setStatus(requestId: string, next: RequestStatus, resolutionNotes?: string) {
  const ctx = await requireStaff();
  const current = await prisma.request.findFirst({
    where: { id: requestId, unitId: ctx.activeUnitId },
    select: { status: true },
  });
  if (!current) throw new Error("Solicitação não encontrada");
  if (current.status === next) return;

  const data: Record<string, unknown> = { status: next };
  if (next === "IN_PROGRESS") {
    data.acknowledgedAt = new Date();
    data.assignedToEmployeeId = ctx.employeeId;
  }
  if (next === "RESOLVED" || next === "DISMISSED") {
    data.resolvedAt = new Date();
    data.resolvedByEmployeeId = ctx.employeeId;
    if (resolutionNotes) data.resolutionNotes = resolutionNotes;
  }

  const updated = await prisma.request.update({
    where: { id: requestId },
    data,
    include: { tableSession: { include: { table: { select: { number: true } } } } },
  });

  await emitEvent({
    unitId: ctx.activeUnitId,
    type: STATUS_EVENT[next],
    entityType: "Request",
    entityId: updated.id,
    payload: requestDto(updated),
  });
}

export async function ackRequest(requestId: string) {
  await setStatus(requestId, "IN_PROGRESS");
}
export async function resolveRequest(requestId: string, formData: FormData) {
  const notes = String(formData.get("resolutionNotes") ?? "").trim() || undefined;
  await setStatus(requestId, "RESOLVED", notes);
}
export async function dismissRequest(requestId: string) {
  await setStatus(requestId, "DISMISSED");
}
