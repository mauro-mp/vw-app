import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";
import { dailyFeatureDto } from "@/lib/dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const feature = await prisma.dailyFeature.findFirst({
    where: { unitId: ctx.unitId, date: today, isActive: true },
  });

  if (!feature) {
    return errorResponse("not_found", "Nenhuma entradinha cadastrada para hoje.", 404);
  }
  return NextResponse.json(dailyFeatureDto(feature));
}
