import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth, errorResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Status de operação da unidade. No MVP, derivado do campo operatingHours.
// Retorna OPEN se o horário atual está dentro da janela de funcionamento,
// caso contrário CLOSED. PAUSED não é modelado ainda.

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const unit = await prisma.unit.findUnique({
    where: { id: ctx.unitId },
    select: { operatingHours: true, timezone: true },
  });
  if (!unit) return errorResponse("not_found", "Unidade não encontrada.", 404);

  const status = isOpenNow(unit.operatingHours) ? "OPEN" : "CLOSED";
  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
  });
}

function isOpenNow(hours: unknown): boolean {
  if (!hours || typeof hours !== "object") return false;
  const now = new Date();
  const day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
    now.getDay()
  ];
  const today = (hours as Record<string, unknown>)[day];
  if (!Array.isArray(today)) return false;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  for (const w of today) {
    if (
      w &&
      typeof w === "object" &&
      "open" in w &&
      "close" in w &&
      typeof (w as Record<string, unknown>).open === "string" &&
      typeof (w as Record<string, unknown>).close === "string"
    ) {
      const openT = (w as Record<string, string>).open;
      const closeT = (w as Record<string, string>).close;
      if (hhmm >= openT && hhmm <= closeT) return true;
    }
  }
  return false;
}
