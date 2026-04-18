import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ItemForm } from "./form";
import { attachOptionGroup, detachOptionGroup, deleteItem } from "./actions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ itemId: string }> };

export default async function ItemEditorPage({ params }: Params) {
  const ctx = await requireAdmin();
  const { itemId } = await params;

  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, category: { section: { unitId: ctx.activeUnitId } } },
    include: {
      optionGroups: { include: { optionGroup: true } },
    },
  });
  if (!item) notFound();

  const [categories, allOptionGroups] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { section: { unitId: ctx.activeUnitId } },
      orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        name: true,
        section: { select: { name: true } },
        subcategories: { select: { id: true, name: true } },
      },
    }),
    prisma.optionGroup.findMany({
      where: { unitId: ctx.activeUnitId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isMandatory: true, _count: { select: { options: true } } },
    }),
  ]);

  const linkedOptionGroupIds = new Set(item.optionGroups.map((og) => og.optionGroupId));
  const availableOptionGroups = allOptionGroups.filter((og) => !linkedOptionGroupIds.has(og.id));

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <div className="text-xs text-[color:var(--muted)]">
          <Link href="/cms/menu" className="hover:underline">
            Cardápio
          </Link>{" "}
          / Item
        </div>
        <h1 className="text-2xl font-bold">{item.name}</h1>
      </header>

      <ItemForm
        item={{
          id: item.id,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          basePrice: item.basePrice.toString(),
          isAvailable: item.isAvailable,
          ean: item.ean,
          agentInstructions: item.agentInstructions,
          categoryId: item.categoryId,
          subcategoryId: item.subcategoryId,
        }}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          sectionName: c.section.name,
          subcategories: c.subcategories,
        }))}
      />

      {/* Option groups */}
      <section className="rounded-lg border border-[color:var(--border)] p-4 space-y-3">
        <div>
          <h2 className="font-semibold">Option groups vinculados</h2>
          <p className="text-xs text-[color:var(--muted)]">
            Grupos de opções (ex.: ponto da carne, tamanho) que o cliente pode escolher ao pedir este
            item. Gerencie a lista global em{" "}
            <Link href="/cms/option-groups" className="text-[color:var(--primary)] hover:underline">
              /cms/option-groups
            </Link>
            .
          </p>
        </div>

        {item.optionGroups.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">Nenhum grupo vinculado.</p>
        ) : (
          <ul className="space-y-1">
            {item.optionGroups.map((link) => (
              <li
                key={link.optionGroupId}
                className="flex items-center justify-between text-sm border border-[color:var(--border)] rounded px-3 py-1.5"
              >
                <span>
                  {link.optionGroup.name}{" "}
                  {link.optionGroup.isMandatory ? (
                    <span className="text-xs text-[color:var(--muted)]">(obrigatório)</span>
                  ) : null}
                </span>
                <form action={detachOptionGroup.bind(null, item.id, link.optionGroupId)}>
                  <Button variant="ghost" size="sm" type="submit">
                    Remover
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {availableOptionGroups.length > 0 ? (
          <form action={attachOptionGroup.bind(null, item.id)} className="flex gap-2 items-end pt-2">
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block">Adicionar grupo</label>
              <select
                name="optionGroupId"
                className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm bg-[color:var(--background)]"
                required
              >
                {availableOptionGroups.map((og) => (
                  <option key={og.id} value={og.id}>
                    {og.name} ({og._count.options} opções)
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Vincular
            </Button>
          </form>
        ) : null}
      </section>

      {/* Zona de perigo */}
      <section className="rounded-lg border border-[color:var(--destructive)] p-4 space-y-2">
        <h2 className="font-semibold text-[color:var(--destructive)]">Excluir item</h2>
        <p className="text-xs text-[color:var(--muted)]">
          Remove permanentemente. Pedidos passados mantêm o snapshot do item.
        </p>
        <form action={deleteItem.bind(null, item.id)}>
          <Button type="submit" variant="destructive" size="sm">
            Excluir permanentemente
          </Button>
        </form>
      </section>
    </div>
  );
}
