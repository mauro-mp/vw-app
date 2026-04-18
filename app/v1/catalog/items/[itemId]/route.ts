import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { itemDto, type MenuItemFull } from "@/lib/dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ itemId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const { itemId } = await params;

  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, category: { section: { unitId: ctx.unitId } } },
    include: {
      optionGroups: {
        include: { optionGroup: { include: { options: true } } },
      },
    },
  });

  if (!item) return errorResponse("not_found", "Item não encontrado.", 404);
  return NextResponse.json(itemDto(item as unknown as MenuItemFull));
}
