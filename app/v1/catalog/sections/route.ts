import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const sections = await prisma.menuSection.findMany({
    where: { unitId: ctx.unitId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, sortOrder: true, isAvailable: true },
  });

  return NextResponse.json(sections);
}
