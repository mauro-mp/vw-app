import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUnit, unauthorized, corsHeaders } from "../_auth";

export async function GET(req: NextRequest) {
  const unit = await resolveUnit(req);
  if (!unit) return unauthorized();

  const { searchParams } = new URL(req.url);
  const sectionFilter = searchParams.get("section")?.trim() || null;
  const categoryFilter = searchParams.get("category")?.trim() || null;

  const sections = await prisma.menuSection.findMany({
    where: {
      unitId: unit.id,
      isAvailable: true,
      ...(sectionFilter ? { name: { contains: sectionFilter, mode: "insensitive" } } : {}),
    },
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        where: {
          isAvailable: true,
          ...(categoryFilter ? { name: { contains: categoryFilter, mode: "insensitive" } } : {}),
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
