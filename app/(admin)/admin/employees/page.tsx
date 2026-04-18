import Link from "next/link";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { toggleEmployeeActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const ctx = await requireAdmin();

  const employees = await prisma.employee.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      employeeUnits: { include: { unit: { select: { id: true, name: true } } } },
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Usuários com acesso ao console. ADMIN vê tudo; OPERATOR só as unidades selecionadas.
          </p>
        </div>
        <Link
          href="/admin/employees/new"
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:opacity-90"
        >
          + Novo staff
        </Link>
      </header>

      <section className="rounded-lg border border-[color:var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--border)]/30 text-xs text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Unidades</th>
              <th className="px-3 py-2 font-medium">Último login</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr
                key={e.id}
                className={`border-t border-[color:var(--border)] ${e.isActive ? "" : "bg-[color:var(--border)]/20"}`}
              >
                <td className="px-3 py-2 font-medium">
                  {e.name}
                  {!e.isActive ? (
                    <span className="text-xs text-[color:var(--muted)] ml-2">(inativo)</span>
                  ) : null}
                  {e.id === ctx.employeeId ? (
                    <span className="text-xs text-[color:var(--muted)] ml-2">(você)</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{e.email}</td>
                <td className="px-3 py-2">
                  <code className="text-xs bg-[color:var(--border)] px-1.5 py-0.5 rounded">
                    {e.role}
                  </code>
                </td>
                <td className="px-3 py-2 text-xs">
                  {e.role === "ADMIN"
                    ? "todas"
                    : e.employeeUnits.map((eu) => eu.unit.name).join(", ") || "—"}
                </td>
                <td className="px-3 py-2 text-xs text-[color:var(--muted)]">
                  {e.lastLoginAt ? new Date(e.lastLoginAt).toLocaleString("pt-BR") : "nunca"}
                </td>
                <td className="px-3 py-2 text-right space-x-1">
                  <Link
                    href={`/admin/employees/${e.id}`}
                    className="text-xs text-[color:var(--primary)] hover:underline"
                  >
                    editar
                  </Link>
                  {e.id !== ctx.employeeId ? (
                    <form
                      action={toggleEmployeeActive.bind(null, e.id, !e.isActive)}
                      className="inline"
                    >
                      <Button type="submit" variant="ghost" size="sm">
                        {e.isActive ? "Desativar" : "Reativar"}
                      </Button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
