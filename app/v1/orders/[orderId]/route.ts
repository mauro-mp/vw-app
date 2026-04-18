import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { orderDto } from "@/lib/order-dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ orderId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const { orderId } = await params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, unitId: ctx.unitId },
    include: {
      items: true,
      tableSession: { include: { table: { select: { number: true } } } },
    },
  });
  if (!order) return errorResponse("not_found", "Pedido não encontrado.", 404);
  return NextResponse.json(orderDto(order));
}
