"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/cms/context";

// ApiClient = credencial OAuth2 client_credentials usada por integrações
// externas (ex.: agent-hub) para autenticar nas rotas /v1/*.

const createSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
});

function sha256(v: string): string {
  return createHash("sha256").update(v).digest("hex");
}

function generateClientId(tenantSlug: string): string {
  return `vw_${tenantSlug}_${randomBytes(6).toString("hex")}`;
}

function generateClientSecret(): string {
  return `vws_${randomBytes(32).toString("base64url")}`;
}

export async function createApiClient(formData: FormData) {
  const ctx = await requireAdmin();
  const parsed = createSchema.safeParse({
    name: formData.get("name") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Inválido");

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { slug: true },
  });
  if (!tenant) throw new Error("Tenant não encontrado");

  const clientId = generateClientId(tenant.slug);
  const clientSecret = generateClientSecret();

  const created = await prisma.apiClient.create({
    data: {
      tenantId: ctx.tenantId,
      clientId,
      clientSecretHash: sha256(clientSecret),
      name: parsed.data.name,
      scopes: "od.all",
    },
  });

  revalidatePath("/admin/integrations");
  // Exibe o secret UMA VEZ via query param (não persiste). Após refresh, some.
  redirect(
    `/admin/integrations?created=${created.id}&clientId=${encodeURIComponent(clientId)}&secret=${encodeURIComponent(clientSecret)}`
  );
}

export async function revokeApiClient(apiClientId: string) {
  const ctx = await requireAdmin();
  await prisma.apiClient.updateMany({
    where: { id: apiClientId, tenantId: ctx.tenantId, revokedAt: null },
    data: { revokedAt: new Date(), isActive: false },
  });
  revalidatePath("/admin/integrations");
}

export async function reactivateApiClient(apiClientId: string) {
  const ctx = await requireAdmin();
  await prisma.apiClient.updateMany({
    where: { id: apiClientId, tenantId: ctx.tenantId },
    data: { revokedAt: null, isActive: true },
  });
  revalidatePath("/admin/integrations");
}
