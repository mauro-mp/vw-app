import type { EmployeeRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: EmployeeRole;
      tenantId: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: EmployeeRole;
    tenantId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: EmployeeRole;
    tenantId: string;
  }
}
