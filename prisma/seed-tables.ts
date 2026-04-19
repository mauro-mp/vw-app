/**
 * Cria as mesas 1–10 para a Unit existente no banco.
 * Seguro para rodar em produção — usa upsert, não apaga nada.
 *
 * Rodar: npx tsx prisma/seed-tables.ts
 */

import { config as loadDotenv } from "dotenv";
import path from "path";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local") });
loadDotenv({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes } from "crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function randomQrToken(): string {
  return randomBytes(16).toString("hex");
}

async function main() {
  const units = await prisma.unit.findMany({ select: { id: true, name: true } });

  if (units.length === 0) {
    console.error("Nenhuma Unit encontrada no banco. Rode o seed principal primeiro.");
    process.exit(1);
  }

  // Usa a primeira unit encontrada (Fillmore Ipiranga)
  const unit = units[0];
  console.log(`Criando mesas para: ${unit.name} (${unit.id})`);

  for (let n = 1; n <= 10; n++) {
    const table = await prisma.table.upsert({
      where: { unitId_number: { unitId: unit.id, number: String(n) } },
      update: {},
      create: {
        unitId: unit.id,
        number: String(n),
        qrToken: randomQrToken(),
      },
    });
    console.log(`  Mesa ${n}: qrToken = ${table.qrToken}`);
  }

  console.log("\nMesas criadas com sucesso.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
