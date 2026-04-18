import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { EmployeeRole } from "@prisma/client";

export type StaffContext = {
  employeeId: string;
  email: string;
  name: string;
  role: EmployeeRole;
  tenantId: string;
  activeUnitId: string;
  activeUnitName: string;
};

// Usado em Server Components (páginas admin). Redireciona para /login se não
// autenticado. Também resolve a unidade ativa (MVP: primeira do tenant).
export async function requireStaff(): Promise<StaffContext> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const u = session.user as {
    id: string;
    email?: string | null;
    name?: string | null;
    role: EmployeeRole;
    tenantId: string;
  };

  const unit = await prisma.unit.findFirst({
    where: { tenantId: u.tenantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (!unit) redirect("/login");

  return {
    employeeId: u.id,
    email: u.email ?? "",
    name: u.name ?? "",
    role: u.role,
    tenantId: u.tenantId,
    activeUnitId: unit.id,
    activeUnitName: unit.name,
  };
}

export async function requireAdmin(): Promise<StaffContext> {
  const ctx = await requireStaff();
  if (ctx.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }
  return ctx;
}
