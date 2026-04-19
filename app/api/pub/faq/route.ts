import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUnit, unauthorized, corsHeaders } from "../_auth";

export async function GET(req: NextRequest) {
  const unit = await resolveUnit(req);
  if (!unit) return unauthorized();

  const items = await prisma.fAQItem.findMany({
    where: { unitId: unit.id, isPublished: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: { category: true, question: true, answer: true },
  });

  // Agrupa por categoria
  const grouped: Record<string, { question: string; answer: string }[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({ question: item.question, answer: item.answer });
  }

  return Response.json({ unit: unit.name, faq: grouped }, { headers: corsHeaders });
}
