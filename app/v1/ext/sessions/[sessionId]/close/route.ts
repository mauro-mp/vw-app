import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { emitEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;
  const { sessionId } = await params;

  const s = await prisma.tableSession.findFirst({
    where: { id: sessionId, unitId: ctx.unitId },
    select: { id: true, tableId: true, status: true },
  });
  if (!s) return errorResponse("not_found", "Sessão não encontrada.", 404);
  if (s.status !== "ACTIVE") {
    return errorResponse("invalid_state", "Sessão não está ativa.", 409);
  }

  const table = await prisma.$transaction(async (tx) => {
    await tx.tableSession.update({
      where: { id: s.id },
      data: { status: "CLOSED", endedAt: new Date() },
    });
    return tx.table.update({
      where: { id: s.tableId },
      data: { status: "AVAILABLE" },
      select: { id: true, number: true },
    });
  });

  await emitEvent({
    unitId: ctx.unitId,
    type: "TABLE_RELEASED",
    entityType: "Table",
    entityId: table.id,
    payload: { tableId: table.id, tableNumber: table.number, sessionId: s.id },
  });

  return new NextResponse(null, { status: 204 });
}
