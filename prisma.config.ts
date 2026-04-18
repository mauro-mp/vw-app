import { defineConfig } from "prisma/config";
import { config as loadDotenv } from "dotenv";
import path from "path";

// Prisma CLI não carrega .env.local automaticamente (só .env). Carregamos
// explicitamente aqui para que migrate/seed encontrem DATABASE_URL quando
// o dev usa .env.local (padrão Next.js).
loadDotenv({ path: path.resolve(process.cwd(), ".env.local") });
loadDotenv({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
