import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { tableSessionDto } from "@/lib/session-dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;
  const { sessionId } = await params;

  const s = await prisma.tableSession.findFirst({
    where: { id: sessionId, unitId: ctx.unitId },
    include: { table: { select: { number: true } } },
  });
  if (!s) return errorResponse("not_found", "Sessão não encontrada.", 404);
  return NextResponse.json(tableSessionDto(s));
}
