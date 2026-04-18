import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

// Helpers para endpoints /v1/* consumidos via OAuth2 client_credentials.

export type ApiContext = {
  tenantId: string;
  unitId: string;
  clientId: string;
  scope: string;
};

type AuthResult =
  | { ctx: ApiContext; error: null }
  | { ctx: null; error: NextResponse };

const JWT_ISSUER = "vw-app";

export async function requireApiAuth(req: NextRequest): Promise<AuthResult> {
  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return { ctx: null, error: errorResponse("invalid_token", "Token ausente.", 401) };
  }
  const token = header.slice(7).trim();

  const secret = process.env.OAUTH_JWT_SECRET;
  if (!secret) {
    return {
      ctx: null,
      error: errorResponse("server_error", "OAUTH_JWT_SECRET não configurado.", 500),
    };
  }

  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: JWT_ISSUER,
    });
    payload = verified.payload;
  } catch {
    return { ctx: null, error: errorResponse("invalid_token", "Token inválido ou expirado.", 401) };
  }

  const tenantId = payload.tenant_id as string | undefined;
  const clientId = payload.client_id as string | undefined;
  const scope = (payload.scope as string | undefined) ?? "od.all";
  if (!tenantId || !clientId) {
    return { ctx: null, error: errorResponse("invalid_token", "Claims ausentes.", 401) };
  }

  // MVP: uma ApiClient é tenant-scoped; a Unit consultada é a primeira do tenant.
  // Em multi-unidade, mover para uma abordagem onde a ApiClient referencia Unit.
  const unit = await prisma.unit.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!unit) {
    return { ctx: null, error: errorResponse("not_found", "Nenhuma unidade para este tenant.", 404) };
  }

  return {
    ctx: { tenantId, unitId: unit.id, clientId, scope },
    error: null,
  };
}

export function errorResponse(code: string, message: string, status: number, details?: unknown) {
  const body: Record<string, unknown> = { code, message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}
