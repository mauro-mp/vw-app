import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
p.unit.findMany({ select: { name: true, agentHubAgentId: true } })
  .then(units => { units.forEach(u => console.log(`${u.name}: ${u.agentHubAgentId}`)); })
  .finally(() => p.$disconnect());
