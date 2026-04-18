import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const tables = await prisma.table.findMany({
    where: {
      unitId: ctx.unitId,
      ...(status ? { status: status as "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DISABLED" } : {}),
    },
    orderBy: { number: "asc" },
    select: { id: true, unitId: true, number: true, label: true, status: true, qrToken: true },
  });

  return NextResponse.json(tables);
}
