import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
p.unit.updateMany({ where: {}, data: { agentHubAgentId: "agent-phil-fillmore" } })
  .then(r => console.log("Atualizado:", r.count, "unit(s)"))
  .finally(() => p.$disconnect());
