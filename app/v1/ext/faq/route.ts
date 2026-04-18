import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { faqDto } from "@/lib/dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const where = { unitId: ctx.unitId, isPublished: true, ...(category ? { category } : {}) };

  const faq = await prisma.fAQItem.findMany({
    where,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json(faq.map(faqDto));
}
