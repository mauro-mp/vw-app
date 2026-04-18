import Link from "next/link";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { EmployeeForm } from "../form";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const ctx = await requireAdmin();
  const units = await prisma.unit.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <div className="text-xs text-[color:var(--muted)]">
          <Link href="/admin/employees" className="hover:underline">
            Staff
          </Link>{" "}
          / Novo
        </div>
        <h1 className="text-2xl font-bold">Novo staff</h1>
      </header>

      <EmployeeForm mode="create" units={units} />
    </div>
  );
}
