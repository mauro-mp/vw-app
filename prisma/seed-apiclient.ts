/**
 * Cria um novo ApiClient ativo para o agent-hub e imprime as credenciais.
 * Rodar: npx tsx prisma/seed-apiclient.ts
 */

import { config as loadDotenv } from "dotenv";
import path from "path";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local") });
loadDotenv({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, createHash } from "crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function sha256(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ select: { id: true, name: true } });
  if (!tenant) {
    console.error("Nenhum Tenant encontrado. Rode o seed principal primeiro.");
    process.exit(1);
  }

  const clientId = `agenthub-${Date.now()}`;
  const clientSecret = randomBytes(32).toString("hex");

  await prisma.apiClient.create({
    data: {
      tenantId: tenant.id,
      clientId,
      clientSecretHash: sha256(clientSecret),
      name: "Agent Hub (gerado automaticamente)",
      scopes: "od.all",
      isActive: true,
    },
  });

  console.log("\n✅ ApiClient criado com sucesso!\n");
  console.log("=== COPIE ESTES VALORES PARA O AGENT-HUB ===");
  console.log(`Client ID:     ${clientId}`);
  console.log(`Client Secret: ${clientSecret}`);
  console.log("=============================================");
  console.log("\n⚠️  O Client Secret não pode ser recuperado depois. Guarde agora.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
