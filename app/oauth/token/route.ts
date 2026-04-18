import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-auth";

// POST /oauth/token
// OAuth2 client_credentials flow — emite JWT para consumo de /v1/*.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  grant_type: z.literal("client_credentials"),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  scope: z.string().optional(),
});

function sha256(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

export async function POST(req: NextRequest) {
  const ctype = req.headers.get("content-type") ?? "";
  let body: Record<string, string | null>;

  if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
    const fd = await req.formData();
    body = {
      grant_type: fd.get("grant_type")?.toString() ?? null,
      client_id: fd.get("client_id")?.toString() ?? null,
      client_secret: fd.get("client_secret")?.toString() ?? null,
      scope: fd.get("scope")?.toString() ?? null,
    };
  } else if (ctype.includes("application/json")) {
    body = (await req.json()) as Record<string, string | null>;
  } else {
    return errorResponse(
      "invalid_request",
      "Content-Type deve ser application/x-www-form-urlencoded ou application/json.",
      400
    );
  }

  const parsed = bodySchema.safeParse({
    grant_type: body.grant_type,
    client_id: body.client_id,
    client_secret: body.client_secret,
    scope: body.scope ?? undefined,
  });
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      "Parâmetros inválidos.",
      400,
      parsed.error.issues.map((i) => ({ path: i.path, message: i.message }))
    );
  }

  const { client_id, client_secret } = parsed.data;

  const client = await prisma.apiClient.findFirst({
    where: { clientId: client_id, isActive: true, revokedAt: null },
  });
  if (!client) {
    return errorResponse("invalid_client", "Credenciais inválidas.", 401);
  }
  if (sha256(client_secret) !== client.clientSecretHash) {
    return errorResponse("invalid_client", "Credenciais inválidas.", 401);
  }

  const secret = process.env.OAUTH_JWT_SECRET;
  if (!secret) {
    return errorResponse("server_error", "OAUTH_JWT_SECRET não configurado.", 500);
  }
  const ttl = Number(process.env.OAUTH_ACCESS_TOKEN_TTL_SECONDS ?? 3600);

  const token = await new SignJWT({
    client_id: client.clientId,
    tenant_id: client.tenantId,
    scope: client.scopes,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .setIssuer("vw-app")
    .setSubject(client.clientId)
    .sign(new TextEncoder().encode(secret));

  await prisma.apiClient
    .update({ where: { id: client.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return NextResponse.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: ttl,
    scope: client.scopes,
  });
}
