import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const items = await prisma.fAQItem.findMany({
    where: { unitId: ctx.unitId, isPublished: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: { category: true, question: true, answer: true },
  });

  const grouped: Record<string, { question: string; answer: string }[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({ question: item.question, answer: item.answer });
  }

  return Response.json({ faq: grouped }, { headers: corsHeaders });
}
