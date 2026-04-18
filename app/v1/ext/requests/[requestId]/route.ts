import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { EventLogType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { emitEvent } from "@/lib/events";
import { requestDto } from "@/lib/request-dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"]).optional(),
  assignedToEmployeeId: z.string().optional(),
  resolutionNotes: z.string().max(1000).optional(),
});

const STATUS_EVENT: Record<string, EventLogType> = {
  OPEN: "REQUEST_CREATED",
  IN_PROGRESS: "REQUEST_ACKNOWLEDGED",
  RESOLVED: "REQUEST_RESOLVED",
  DISMISSED: "REQUEST_DISMISSED",
};

type Params = { params: Promise<{ requestId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;
  const { requestId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", "Body JSON inválido.", 400);
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("invalid_request", "Payload inválido.", 400);
  }
  const d = parsed.data;

  const current = await prisma.request.findFirst({
    where: { id: requestId, unitId: ctx.unitId },
    select: { status: true },
  });
  if (!current) return errorResponse("not_found", "Solicitação não encontrada.", 404);

  const data: Record<string, unknown> = {};
  if (d.status) {
    data.status = d.status;
    if (d.status === "IN_PROGRESS") data.acknowledgedAt = new Date();
    if (d.status === "RESOLVED" || d.status === "DISMISSED") data.resolvedAt = new Date();
  }
  if (d.assignedToEmployeeId !== undefined) {
    data.assignedToEmployeeId = d.assignedToEmployeeId || null;
  }
  if (d.resolutionNotes !== undefined) {
    data.resolutionNotes = d.resolutionNotes || null;
  }

  const updated = await prisma.request.update({
    where: { id: requestId },
    data,
    include: { tableSession: { include: { table: { select: { number: true } } } } },
  });

  if (d.status && d.status !== current.status) {
    await emitEvent({
      unitId: ctx.unitId,
      type: STATUS_EVENT[d.status],
      entityType: "Request",
      entityId: updated.id,
      payload: requestDto(updated),
    });
  }

  return NextResponse.json(requestDto(updated));
}
