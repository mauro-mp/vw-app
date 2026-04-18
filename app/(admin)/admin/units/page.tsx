import Link from "next/link";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const ctx = await requireAdmin();

  const units = await prisma.unit.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      addressCity: true,
      addressState: true,
      phone: true,
      agentHubAgentId: true,
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Unidades</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Cada unidade é um "merchant" no contrato Open Delivery. Edite nome, endereço,
          contatos e horários.
        </p>
      </header>

      <section className="rounded-lg border border-[color:var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--border)]/30 text-xs text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Cidade / UF</th>
              <th className="px-3 py-2 font-medium">Telefone</th>
              <th className="px-3 py-2 font-medium">Agent ID (agent-hub)</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-t border-[color:var(--border)]">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2 text-xs">
                  {u.addressCity ?? "—"}
                  {u.addressState ? ` / ${u.addressState}` : ""}
                </td>
                <td className="px-3 py-2 text-xs">{u.phone ?? "—"}</td>
                <td className="px-3 py-2 text-xs font-mono truncate max-w-[16ch]">
                  {u.agentHubAgentId}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/units/${u.id}`}
                    className="text-xs text-[color:var(--primary)] hover:underline"
                  >
                    editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-[color:var(--muted)]">
        A criação de novas unidades requer também cadastro do Agent correspondente no agent-hub.
        No MVP, essa operação não está exposta via CMS.
      </p>
    </div>
  );
}
