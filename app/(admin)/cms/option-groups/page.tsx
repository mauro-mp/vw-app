import Link from "next/link";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OptionGroupsListPage() {
  const ctx = await requireAdmin();

  const groups = await prisma.optionGroup.findMany({
    where: { unitId: ctx.activeUnitId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { options: true, items: true } },
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Option groups</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Grupos de opções reutilizáveis entre itens (ex.: Ponto da carne, Tamanho, Com/sem gás).
          </p>
        </div>
        <Link
          href="/cms/option-groups/new"
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:opacity-90"
        >
          + Novo grupo
        </Link>
      </header>

      <section className="rounded-lg border border-[color:var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--border)]/30 text-xs text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Obrigatório</th>
              <th className="px-3 py-2 font-medium">Min / Max</th>
              <th className="px-3 py-2 font-medium text-right">Opções</th>
              <th className="px-3 py-2 font-medium text-right">Itens vinculados</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[color:var(--muted)]">
                  Nenhum grupo cadastrado.
                </td>
              </tr>
            ) : null}
            {groups.map((g) => (
              <tr key={g.id} className="border-t border-[color:var(--border)]">
                <td className="px-3 py-2 font-medium">{g.name}</td>
                <td className="px-3 py-2">{g.isMandatory ? "sim" : "não"}</td>
                <td className="px-3 py-2">
                  {g.minSelection} / {g.maxSelection}
                </td>
                <td className="px-3 py-2 text-right">{g._count.options}</td>
                <td className="px-3 py-2 text-right">{g._count.items}</td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/cms/option-groups/${g.id}`}
                    className="text-[color:var(--primary)] hover:underline"
                  >
                    editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
