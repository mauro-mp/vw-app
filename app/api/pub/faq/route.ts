import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUnit, unauthorized, corsHeaders } from "../_auth";

export async function GET(req: NextRequest) {
  const unit = await resolveUnit(req);
  if (!unit) return unauthorized();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || null;
  const categoryFilter = searchParams.get("category")?.trim() || null;

  const tokens = q ? q.split(/\s+/).map((t) => t.trim()).filter((t) => t.length >= 2) : [];

  const items = await prisma.fAQItem.findMany({
    where: {
      unitId: unit.id,
      isPublished: true,
      ...(categoryFilter ? { category: { contains: categoryFilter, mode: "insensitive" } } : {}),
      ...(tokens.length > 0 ? {
        OR: tokens.flatMap((t) => [
          { question: { contains: t, mode: "insensitive" as const } },
          { answer: { contains: t, mode: "insensitive" as const } },
        ]),
      } : {}),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: { category: true, question: true, answer: true },
  });

  const grouped: Record<string, { question: string; answer: string }[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({ question: item.question, answer: item.answer });
  }

  return Response.json({ unit: unit.name, faq: grouped }, { headers: corsHeaders });
}
