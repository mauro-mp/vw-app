import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { emitEvent } from "@/lib/events";
import { tableSessionDto } from "@/lib/session-dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Aceita duas formas equivalentes de identificar a mesa:
//   - tableQrToken: token opaco gerado na criação da mesa (preferido — não enumerável)
//   - tableNumber:  número da mesa no contexto da unit ativa do tenant (conveniência
//                    para o caso em que o template do WhatsApp traz só "Mesa XX")
// O unitId é sempre resolvido do JWT OAuth2 (ctx.unitId), nunca do body.
const schema = z
  .object({
    tableQrToken: z.string().min(1).optional(),
    tableNumber: z.string().min(1).optional(),
    customerPhone: z.string().optional(),
    agentHubConversationId: z.string().optional(),
  })
  .refine((d) => Boolean(d.tableQrToken) || Boolean(d.tableNumber), {
    message: "Informe tableQrToken ou tableNumber.",
    path: ["tableQrToken"],
  });

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", "Body JSON inválido.", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Payload inválido.",
      400
    );
  }
  const d = parsed.data;

  const table = await prisma.table.findFirst({
    where: {
      unitId: ctx.unitId,
      ...(d.tableQrToken
        ? { qrToken: d.tableQrToken }
        : { number: d.tableNumber }),
    },
  });
  if (!table) {
    return errorResponse(
      "not_found",
      d.tableQrToken ? "Mesa não encontrada pelo QR." : "Mesa não encontrada pelo número.",
      404
    );
  }

  // Reaproveita sessão ativa se já existe para esta mesa.
  const active = await prisma.tableSession.findFirst({
    where: { tableId: table.id, status: "ACTIVE" },
    include: { table: { select: { number: true } } },
  });
  if (active) {
    if (d.customerPhone && !active.customerPhone) {
      const updated = await prisma.tableSession.update({
        where: { id: active.id },
        data: {
          customerPhone: d.customerPhone,
          ...(d.agentHubConversationId
            ? { agentHubConversationId: d.agentHubConversationId }
            : {}),
        },
        include: { table: { select: { number: true } } },
      });
      return NextResponse.json(tableSessionDto(updated), { status: 200 });
    }
    return NextResponse.json(tableSessionDto(active), { status: 200 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.create({
      data: {
        unitId: ctx.unitId,
        tableId: table.id,
        customerPhone: d.customerPhone ?? null,
        agentHubConversationId: d.agentHubConversationId ?? null,
      },
      include: { table: { select: { number: true } } },
    });
    await tx.table.update({
      where: { id: table.id },
      data: { status: "OCCUPIED" },
    });
    return session;
  });

  await emitEvent({
    unitId: ctx.unitId,
    type: "TABLE_OCCUPIED",
    entityType: "Table",
    entityId: table.id,
    payload: { tableId: table.id, tableNumber: table.number, sessionId: created.id },
  });

  return NextResponse.json(tableSessionDto(created), { status: 201 });
}
