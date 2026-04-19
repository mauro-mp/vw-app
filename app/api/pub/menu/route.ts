import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUnit, unauthorized, corsHeaders } from "../_auth";

export async function GET(req: NextRequest) {
  const unit = await resolveUnit(req);
  if (!unit) return unauthorized();

  const { searchParams } = new URL(req.url);
  const sectionFilter = searchParams.get("section")?.trim() || null;
  const categoryFilter = searchParams.get("category")?.trim() || null;

  // Tenta primeiro por seção; se não encontrar nada, trata o sectionFilter como categoria
  let effectiveSectionFilter = sectionFilter;
  let effectiveCategoryFilter = categoryFilter;

  if (sectionFilter && !categoryFilter) {
    const sectionExists = await prisma.menuSection.count({
      where: { unitId: unit.id, isAvailable: true, name: { contains: sectionFilter, mode: "insensitive" } },
    });
    if (sectionExists === 0) {
      effectiveSectionFilter = null;
      effectiveCategoryFilter = sectionFilter;
    }
  }

  const sections = await prisma.menuSection.findMany({
    where: {
      unitId: unit.id,
      isAvailable: true,
      ...(effectiveSectionFilter ? { name: { contains: effectiveSectionFilter, mode: "insensitive" } } : {}),
    },
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        where: {
          isAvailable: true,
          ...(effectiveCategoryFilter ? { name: { contains: effectiveCategoryFilter, mode: "insensitive" } } : {}),
        },
        orderBy: { sortOrder: "asc" },
        include: {
          subcategories: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                where: { isAvailable: true },
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  basePrice: true,
                  imageUrl: true,
                  agentInstructions: true,
                },
              },
            },
          },
          items: {
            where: { isAvailable: true, subcategoryId: null },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              description: true,
              basePrice: true,
              imageUrl: true,
              agentInstructions: true,
            },
          },
        },
      },
    },
  });

  const data = {
    unit: unit.name,
    sections: sections
      .map((sec) => ({
        name: sec.name,
        categories: sec.categories.map((cat) => ({
          name: cat.name,
          items: cat.items.map((it) => ({
            id: it.id,
            name: it.name,
            description: it.description ?? undefined,
            price: Number(it.basePrice),
            imageUrl: it.imageUrl ?? undefined,
            agentInstructions: it.agentInstructions ?? undefined,
          })),
          subcategories: cat.subcategories.map((sub) => ({
            name: sub.name,
            items: sub.items.map((it) => ({
              id: it.id,
              name: it.name,
              description: it.description ?? undefined,
              price: Number(it.basePrice),
              imageUrl: it.imageUrl ?? undefined,
              agentInstructions: it.agentInstructions ?? undefined,
            })),
          })),
        })),
      }))
      .filter((sec) => sec.categories.length > 0),
  };

  return Response.json(data, { headers: corsHeaders });
}
