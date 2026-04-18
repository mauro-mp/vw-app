import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { emitEvent } from "@/lib/events";
import { requestDto } from "@/lib/request-dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REQUEST_TYPES = [
  "CALL_WAITER",
  "PHYSICAL_MENU",
  "CHECK",
  "COMPLAINT",
  "ORDER_CHANGE",
  "ORDER_STATUS",
  "ORDER_CANCEL",
  "ALLERGY_INFO",
  "CUSTOM_ITEM",
  "OTHER",
] as const;

const REQUEST_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"] as const;

const createSchema = z.object({
  tableSessionId: z.string().optional(),
  agentHubConversationId: z.string().optional(),
  agentHubMessageId: z.string().optional(),
  type: z.enum(REQUEST_TYPES),
  description: z.string().trim().min(1).max(1000),
});

// -----------------------------------------------------------------------------
// POST /v1/ext/requests
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", "Body JSON inválido.", 400);
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      "Payload inválido.",
      400,
      parsed.error.issues.map((i) => ({ path: i.path, message: i.message }))
    );
  }
  const d = parsed.data;
  const idempotencyKey = req.headers.get("idempotency-key") ?? undefined;

  if (idempotencyKey) {
    const existing = await prisma.request.findUnique({
      where: { unitId_idempotencyKey: { unitId: ctx.unitId, idempotencyKey } },
      include: { tableSession: { include: { table: { select: { number: true } } } } },
    });
    if (existing) return NextResponse.json(requestDto(existing), { status: 200 });
  }

  if (d.tableSessionId) {
    const s = await prisma.tableSession.findFirst({
      where: { id: d.tableSessionId, unitId: ctx.unitId },
      select: { id: true },
    });
    if (!s) return errorResponse("not_found", "Sessão de mesa não encontrada.", 404);
  }

  let created;
  try {
    created = await prisma.request.create({
      data: {
        unitId: ctx.unitId,
        tableSessionId: d.tableSessionId ?? null,
        agentHubConversationId: d.agentHubConversationId ?? null,
        agentHubMessageId: d.agentHubMessageId ?? null,
        idempotencyKey: idempotencyKey ?? null,
        type: d.type,
        description: d.description,
        status: "OPEN",
      },
      include: { tableSession: { include: { table: { select: { number: true } } } } },
    });
  } catch (e) {
    if (
      idempotencyKey &&
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const existing = await prisma.request.findUnique({
        where: { unitId_idempotencyKey: { unitId: ctx.unitId, idempotencyKey } },
        include: { tableSession: { include: { table: { select: { number: true } } } } },
      });
      if (existing) return NextResponse.json(requestDto(existing), { status: 200 });
    }
    throw e;
  }

  await emitEvent({
    unitId: ctx.unitId,
    type: "REQUEST_CREATED",
    entityType: "Request",
    entityId: created.id,
    payload: requestDto(created),
  });

  return NextResponse.json(requestDto(created), { status: 201 });
}

// -----------------------------------------------------------------------------
// GET /v1/ext/requests
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const statusParams = searchParams.getAll("status");
  const typeParams = searchParams.getAll("type");
  const tableSessionId = searchParams.get("tableSessionId");
  const since = searchParams.get("since");
  const limitRaw = Number(searchParams.get("limit") ?? 50);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 100);

  const statusFilter = statusParams.filter((s) =>
    (REQUEST_STATUSES as readonly string[]).includes(s)
  ) as (typeof REQUEST_STATUSES)[number][];
  const typeFilter = typeParams.filter((t) =>
    (REQUEST_TYPES as readonly string[]).includes(t)
  ) as (typeof REQUEST_TYPES)[number][];

  const rows = await prisma.request.findMany({
    where: {
      unitId: ctx.unitId,
      ...(statusFilter.length ? { status: { in: statusFilter } } : {}),
      ...(typeFilter.length ? { type: { in: typeFilter } } : {}),
      ...(tableSessionId ? { tableSessionId } : {}),
      ...(since ? { createdAt: { gte: new Date(since) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { tableSession: { include: { table: { select: { number: true } } } } },
  });
  return NextResponse.json(rows.map(requestDto));
}
