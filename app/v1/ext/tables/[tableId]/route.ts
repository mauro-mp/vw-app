import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "DISABLED"]).optional(),
  label: z.string().max(80).optional(),
});

type Params = { params: Promise<{ tableId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;
  const { tableId } = await params;

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

  const existing = await prisma.table.findFirst({
    where: { id: tableId, unitId: ctx.unitId },
    select: { id: true },
  });
  if (!existing) return errorResponse("not_found", "Mesa não encontrada.", 404);

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.label !== undefined ? { label: parsed.data.label || null } : {}),
    },
    select: { id: true, unitId: true, number: true, label: true, status: true, qrToken: true },
  });
  return NextResponse.json(updated);
}
