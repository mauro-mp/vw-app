import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { merchantDto, type UnitFull } from "@/lib/dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const unit = await prisma.unit.findUnique({
    where: { id: ctx.unitId },
    include: {
      menuSections: {
        orderBy: { sortOrder: "asc" },
        include: {
          categories: {
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                // Evita duplicar itens que estão em subcategorias.
                where: { subcategoryId: null },
                orderBy: { sortOrder: "asc" },
                include: {
                  optionGroups: {
                    include: {
                      optionGroup: { include: { options: true } },
                    },
                  },
                },
              },
              subcategories: {
                orderBy: { sortOrder: "asc" },
                include: {
                  items: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                      optionGroups: {
                        include: {
                          optionGroup: { include: { options: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!unit) return errorResponse("not_found", "Unidade não encontrada.", 404);

  return NextResponse.json(merchantDto(unit as unknown as UnitFull));
}
