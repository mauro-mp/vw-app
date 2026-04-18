import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { EmployeeRole } from "@prisma/client";

// Helpers para route handlers autenticados (staff interno).

export type AuthenticatedSession = {
  userId: string;
  email: string;
  name: string;
  role: EmployeeRole;
  tenantId: string;
};

export async function requireStaffAuth():
  Promise<{ session: AuthenticatedSession; error: null } | { session: null; error: NextResponse }> {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const u = session.user as {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
    tenantId?: string;
  };
  if (!u.id || !u.tenantId || !u.role) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return {
    session: {
      userId: u.id,
      email: u.email ?? "",
      name: u.name ?? "",
      role: u.role as EmployeeRole,
      tenantId: u.tenantId,
    },
    error: null,
  };
}

export function requireAdmin(session: AuthenticatedSession): NextResponse | null {
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — requires ADMIN" }, { status: 403 });
  }
  return null;
}
