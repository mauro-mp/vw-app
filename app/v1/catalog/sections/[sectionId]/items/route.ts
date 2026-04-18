import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { sectionDto, type MenuSectionFull } from "@/lib/dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ sectionId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const { sectionId } = await params;

  const section = await prisma.menuSection.findFirst({
    where: { id: sectionId, unitId: ctx.unitId },
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
                include: { optionGroup: { include: { options: true } } },
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
                    include: { optionGroup: { include: { options: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!section) return errorResponse("not_found", "Seção não encontrada.", 404);
  return NextResponse.json(sectionDto(section as unknown as MenuSectionFull));
}
