import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { emitEvent } from "@/lib/events";
import { orderDto } from "@/lib/order-dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const selectedOptionSchema = z.object({
  optionGroupId: z.string().min(1),
  optionId: z.string().min(1),
});

const itemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  observations: z.string().max(500).optional(),
  selectedOptions: z.array(selectedOptionSchema).optional(),
});

const createSchema = z.object({
  tableSessionId: z.string().optional(),
  agentHubConversationId: z.string().optional(),
  agentHubMessageId: z.string().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(itemSchema).min(1),
});

// -----------------------------------------------------------------------------
// POST /v1/orders — criação
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

  // Idempotência — retorna existente se já houver.
  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { unitId_idempotencyKey: { unitId: ctx.unitId, idempotencyKey } },
      include: {
        items: true,
        tableSession: { include: { table: { select: { number: true } } } },
      },
    });
    if (existing) return NextResponse.json(orderDto(existing), { status: 200 });
  }

  // Resolve tableSession (se houver) — precisa pertencer à mesma unit.
  if (d.tableSessionId) {
    const s = await prisma.tableSession.findFirst({
      where: { id: d.tableSessionId, unitId: ctx.unitId },
      select: { id: true, status: true },
    });
    if (!s) return errorResponse("not_found", "Sessão de mesa não encontrada.", 404);
    if (s.status !== "ACTIVE") {
      return errorResponse("invalid_request", "Sessão de mesa não está ativa.", 409);
    }
  }

  // Carrega itens do cardápio citados e valida ownership em massa.
  const menuItemIds = [...new Set(d.items.map((i) => i.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      category: { section: { unitId: ctx.unitId } },
    },
    include: {
      optionGroups: {
        include: {
          optionGroup: { include: { options: true } },
        },
      },
    },
  });
  if (menuItems.length !== menuItemIds.length) {
    return errorResponse("invalid_request", "Um ou mais itens não pertencem a esta unidade.", 400);
  }
  const menuItemById = new Map(menuItems.map((m) => [m.id, m]));

  // Monta OrderItems validando options + preços.
  type Built = {
    menuItemId: string;
    itemName: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
    observations: string | null;
    selectedOptions: unknown;
  };
  const built: Built[] = [];
  let subtotal = new Prisma.Decimal(0);

  for (const reqItem of d.items) {
    const mi = menuItemById.get(reqItem.menuItemId)!;
    const validGroups = new Map(mi.optionGroups.map((mog) => [mog.optionGroupId, mog.optionGroup]));

    let extra = new Prisma.Decimal(0);
    const snapshots: Array<{
      optionGroupId: string;
      optionGroupName: string;
      optionId: string;
      optionName: string;
      priceDelta: { amount: number; currency: string };
    }> = [];

    for (const sel of reqItem.selectedOptions ?? []) {
      const og = validGroups.get(sel.optionGroupId);
      if (!og) {
        return errorResponse(
          "invalid_request",
          `Option group ${sel.optionGroupId} não pertence ao item ${mi.name}.`,
          400
        );
      }
      const opt = og.options.find((o) => o.id === sel.optionId);
      if (!opt) {
        return errorResponse(
          "invalid_request",
          `Opção ${sel.optionId} não pertence ao grupo ${og.name}.`,
          400
        );
      }
      extra = extra.add(opt.priceDelta);
      snapshots.push({
        optionGroupId: og.id,
        optionGroupName: og.name,
        optionId: opt.id,
        optionName: opt.name,
        priceDelta: { amount: Number(Number(opt.priceDelta).toFixed(2)), currency: "BRL" },
      });
    }

    // Valida seleções obrigatórias / min-max por grupo.
    for (const mog of mi.optionGroups) {
      const chosen = (reqItem.selectedOptions ?? []).filter(
        (s) => s.optionGroupId === mog.optionGroupId
      );
      if (chosen.length < mog.optionGroup.minSelection) {
        return errorResponse(
          "invalid_request",
          `Grupo "${mog.optionGroup.name}" exige pelo menos ${mog.optionGroup.minSelection} opção(ões).`,
          400
        );
      }
      if (chosen.length > mog.optionGroup.maxSelection) {
        return errorResponse(
          "invalid_request",
          `Grupo "${mog.optionGroup.name}" aceita no máximo ${mog.optionGroup.maxSelection} opção(ões).`,
          400
        );
      }
    }

    const unitPrice = new Prisma.Decimal(mi.basePrice).add(extra);
    const totalPrice = unitPrice.mul(reqItem.quantity);
    subtotal = subtotal.add(totalPrice);

    built.push({
      menuItemId: mi.id,
      itemName: mi.name,
      quantity: reqItem.quantity,
      unitPrice,
      totalPrice,
      observations: reqItem.observations ?? null,
      selectedOptions: snapshots,
    });
  }

  // Persiste.
  let order;
  try {
    order = await prisma.order.create({
      data: {
        unitId: ctx.unitId,
        tableSessionId: d.tableSessionId ?? null,
        agentHubConversationId: d.agentHubConversationId ?? null,
        agentHubMessageId: d.agentHubMessageId ?? null,
        idempotencyKey: idempotencyKey ?? null,
        status: "CREATED",
        subtotal,
        total: subtotal,
        notes: d.notes ?? null,
        items: {
          create: built.map((b) => ({
            menuItemId: b.menuItemId,
            itemName: b.itemName,
            quantity: b.quantity,
            unitPrice: b.unitPrice,
            totalPrice: b.totalPrice,
            observations: b.observations,
            selectedOptions: b.selectedOptions as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        items: true,
        tableSession: { include: { table: { select: { number: true } } } },
      },
    });
  } catch (e) {
    // Corrida de idempotência — outra requisição criou no intervalo.
    if (
      idempotencyKey &&
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const existing = await prisma.order.findUnique({
        where: { unitId_idempotencyKey: { unitId: ctx.unitId, idempotencyKey } },
        include: {
          items: true,
          tableSession: { include: { table: { select: { number: true } } } },
        },
      });
      if (existing) return NextResponse.json(orderDto(existing), { status: 200 });
    }
    throw e;
  }

  await emitEvent({
    unitId: ctx.unitId,
    type: "ORDER_CREATED",
    entityType: "Order",
    entityId: order.id,
    payload: orderDto(order),
  });

  return NextResponse.json(orderDto(order), { status: 201 });
}

// -----------------------------------------------------------------------------
// GET /v1/orders — lista com filtros
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const statusParams = searchParams.getAll("status");
  const tableSessionId = searchParams.get("tableSessionId");
  const since = searchParams.get("since");
  const limitRaw = Number(searchParams.get("limit") ?? 50);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 100);

  const validStatuses = ["CREATED", "CONFIRMED", "PREPARING", "CONCLUDED", "CANCELLED"] as const;
  const statusFilter = statusParams.filter((s) =>
    (validStatuses as readonly string[]).includes(s)
  ) as (typeof validStatuses)[number][];

  const orders = await prisma.order.findMany({
    where: {
      unitId: ctx.unitId,
      ...(statusFilter.length ? { status: { in: statusFilter } } : {}),
      ...(tableSessionId ? { tableSessionId } : {}),
      ...(since ? { createdAt: { gte: new Date(since) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      items: true,
      tableSession: { include: { table: { select: { number: true } } } },
    },
  });

  return NextResponse.json(orders.map(orderDto));
}
