import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function resolveUnit(req: NextRequest) {
  const agentId = req.headers.get("x-agent-id");
  if (!agentId) return null;
  return prisma.unit.findUnique({
    where: { agentHubAgentId: agentId },
    select: { id: true, name: true },
  });
}

export function unauthorized() {
  return Response.json(
    { error: "X-Agent-Id ausente ou inválido." },
    { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
  );
}

export const corsHeaders = { "Access-Control-Allow-Origin": "*" };
