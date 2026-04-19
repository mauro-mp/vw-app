import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const sections = await prisma.menuSection.findMany({
    where: { unitId: ctx.unitId, isAvailable: true },
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        where: { isAvailable: true },
        orderBy: { sortOrder: "asc" },
        include: {
          subcategories: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                where: { isAvailable: true },
                orderBy: { sortOrder: "asc" },
                select: { id: true, name: true, description: true, basePrice: true, agentInstructions: true },
              },
            },
          },
          items: {
            where: { isAvailable: true, subcategoryId: null },
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, description: true, basePrice: true, agentInstructions: true },
          },
        },
      },
    },
  });

  const data = {
    sections: sections.map((sec) => ({
      name: sec.name,
      categories: sec.categories.map((cat) => ({
        name: cat.name,
        items: cat.items.map((it) => ({
          id: it.id,
          name: it.name,
          description: it.description ?? undefined,
          price: Number(it.basePrice),
          agentInstructions: it.agentInstructions ?? undefined,
        })),
        subcategories: cat.subcategories.map((sub) => ({
          name: sub.name,
          items: sub.items.map((it) => ({
            id: it.id,
            name: it.name,
            description: it.description ?? undefined,
            price: Number(it.basePrice),
            agentInstructions: it.agentInstructions ?? undefined,
          })),
        })),
      })),
    })),
  };

  return Response.json(data, { headers: corsHeaders });
}
