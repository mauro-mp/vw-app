import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { EmployeeForm } from "../form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ employeeId: string }> };

export default async function EditEmployeePage({ params }: Params) {
  const ctx = await requireAdmin();
  const { employeeId } = await params;

  const [employee, units] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: employeeId, tenantId: ctx.tenantId },
      include: { employeeUnits: { select: { unitId: true } } },
    }),
    prisma.unit.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!employee) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <div className="text-xs text-[color:var(--muted)]">
          <Link href="/admin/employees" className="hover:underline">
            Staff
          </Link>{" "}
          / Editar
        </div>
        <h1 className="text-2xl font-bold">{employee.name}</h1>
      </header>

      <EmployeeForm
        mode="edit"
        employee={{
          id: employee.id,
          email: employee.email,
          name: employee.name,
          role: employee.role,
          isActive: employee.isActive,
          unitIds: employee.employeeUnits.map((eu) => eu.unitId),
        }}
        units={units}
      />
    </div>
  );
}
