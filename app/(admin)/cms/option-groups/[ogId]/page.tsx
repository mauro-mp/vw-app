import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionGroupForm } from "./form";
import { addOption, deleteOption, deleteOptionGroup } from "../actions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ ogId: string }> };

export default async function OptionGroupEditorPage({ params }: Params) {
  const ctx = await requireAdmin();
  const { ogId } = await params;

  const og = await prisma.optionGroup.findFirst({
    where: { id: ogId, unitId: ctx.activeUnitId },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      items: {
        include: { menuItem: { select: { id: true, name: true } } },
      },
    },
  });
  if (!og) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <div className="text-xs text-[color:var(--muted)]">
          <Link href="/cms/option-groups" className="hover:underline">
            Option groups
          </Link>{" "}
          / {og.name}
        </div>
        <h1 className="text-2xl font-bold">{og.name}</h1>
      </header>

      <section className="rounded-lg border border-[color:var(--border)] p-4">
        <h2 className="font-semibold mb-3 text-sm">Configuração</h2>
        <OptionGroupForm og={og} />
      </section>

      <section className="rounded-lg border border-[color:var(--border)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Opções ({og.options.length})</h2>
        </div>
        {og.options.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">
            Nenhuma opção cadastrada. Adicione pelo menos uma abaixo.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--border)] border border-[color:var(--border)] rounded-md">
            {og.options.map((opt) => (
              <li key={opt.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{opt.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[color:var(--muted)]">
                    Δ R$ {Number(opt.priceDelta).toFixed(2).replace(".", ",")}
                  </span>
                  <form action={deleteOption.bind(null, og.id, opt.id)}>
                    <Button type="submit" variant="ghost" size="sm">
                      Remover
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form action={addOption.bind(null, og.id)} className="flex gap-2 items-end pt-2">
          <div className="flex-1">
            <label className="text-xs font-medium mb-1 block">Nome</label>
            <Input name="name" placeholder="Ex: Ao ponto" required />
          </div>
          <div className="w-32">
            <label className="text-xs font-medium mb-1 block">Preço extra (R$)</label>
            <Input name="priceDelta" defaultValue="0,00" placeholder="0,00" />
          </div>
          <Button type="submit" size="sm">
            + opção
          </Button>
        </form>
      </section>

      {og.items.length > 0 ? (
        <section className="rounded-lg border border-[color:var(--border)] p-4 text-sm space-y-2">
          <h2 className="font-semibold">Itens que usam este grupo ({og.items.length})</h2>
          <ul className="text-[color:var(--muted)] space-y-0.5">
            {og.items.map((link) => (
              <li key={link.menuItem.id}>
                <Link
                  href={`/cms/menu/items/${link.menuItem.id}`}
                  className="hover:underline text-[color:var(--foreground)]"
                >
                  {link.menuItem.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg border border-[color:var(--destructive)] p-4 space-y-2">
        <h2 className="font-semibold text-[color:var(--destructive)]">Excluir grupo</h2>
        <p className="text-xs text-[color:var(--muted)]">
          Remove permanentemente. Itens vinculados perdem este grupo de opções.
        </p>
        <form action={deleteOptionGroup.bind(null, og.id)}>
          <Button type="submit" variant="destructive" size="sm">
            Excluir permanentemente
          </Button>
        </form>
      </section>
    </div>
  );
}
