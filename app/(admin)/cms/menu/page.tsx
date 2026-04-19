import Link from "next/link";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  createSection,
  createCategory,
  createSubcategory,
  deleteSection,
  deleteCategory,
  deleteSubcategory,
  createItemAndEdit,
} from "./actions";
import { MenuPdfUpload } from "./MenuPdfUpload";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const ctx = await requireAdmin();

  const unit = await prisma.unit.findUnique({
    where: { id: ctx.activeUnitId },
    select: { menuPdfUrl: true },
  });

  const sections = await prisma.menuSection.findMany({
    where: { unitId: ctx.activeUnitId },
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          subcategories: {
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                orderBy: { sortOrder: "asc" },
                select: { id: true, name: true, basePrice: true, isAvailable: true },
              },
            },
          },
          items: {
            where: { subcategoryId: null },
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, basePrice: true, isAvailable: true },
          },
        },
      },
    },
  });

  return (
    <div className="max-w-5xl space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Cardápio</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Estrutura em três níveis: seção → categoria → (opcional) subcategoria → item.
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-xs text-[color:var(--muted)]">Cardápio em PDF</span>
          <MenuPdfUpload currentUrl={unit?.menuPdfUrl ?? null} />
        </div>
      </header>

      {/* Criar seção */}
      <section className="rounded-lg border border-[color:var(--border)] p-4">
        <h2 className="font-semibold mb-2 text-sm">Nova seção</h2>
        <form action={createSection} className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="new-section-name">Nome</Label>
            <Input
              id="new-section-name"
              name="name"
              required
              placeholder="Ex: Brunch / Lanches"
            />
          </div>
          <div className="w-24">
            <Label htmlFor="new-section-order">Ordem</Label>
            <Input id="new-section-order" name="sortOrder" type="number" defaultValue={0} />
          </div>
          <Button type="submit">Criar</Button>
        </form>
      </section>

      {/* Árvore */}
      <section className="space-y-4">
        {sections.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">Nenhuma seção cadastrada ainda.</p>
        ) : null}
        {sections.map((section) => (
          <div
            key={section.id}
            className="rounded-lg border border-[color:var(--border)] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{section.name}</h3>
                <p className="text-xs text-[color:var(--muted)]">
                  {section.categories.length}{" "}
                  {section.categories.length === 1 ? "categoria" : "categorias"} ·{" "}
                  {section.isAvailable ? "visível" : "oculta"}
                </p>
              </div>
              <form action={deleteSection.bind(null, section.id)}>
                <Button variant="ghost" size="sm" type="submit">
                  Excluir seção
                </Button>
              </form>
            </div>

            {/* Nova categoria */}
            <form
              action={createCategory}
              className="flex gap-2 items-end bg-[color:var(--border)]/30 rounded-md p-2"
            >
              <input type="hidden" name="sectionId" value={section.id} />
              <Input name="name" placeholder="Nova categoria" required />
              <Button type="submit" size="sm" variant="secondary">
                + categoria
              </Button>
            </form>

            {/* Categorias */}
            <ul className="space-y-3 pl-4">
              {section.categories.map((cat) => (
                <li
                  key={cat.id}
                  className="rounded-md border border-[color:var(--border)] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{cat.name}</div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {cat.items.length + cat.subcategories.reduce((a, s) => a + s.items.length, 0)}{" "}
                        itens
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <form action={createItemAndEdit.bind(null, cat.id, undefined)}>
                        <Button type="submit" size="sm">
                          + item
                        </Button>
                      </form>
                      <form action={deleteCategory.bind(null, cat.id)}>
                        <Button variant="ghost" size="sm" type="submit">
                          Excluir
                        </Button>
                      </form>
                    </div>
                  </div>

                  {/* Nova subcategoria */}
                  <form action={createSubcategory} className="flex gap-2 items-center">
                    <input type="hidden" name="categoryId" value={cat.id} />
                    <Input name="name" placeholder="Nova subcategoria (opcional)" />
                    <Button type="submit" size="sm" variant="secondary">
                      + sub
                    </Button>
                  </form>

                  {/* Itens diretos */}
                  {cat.items.length > 0 ? (
                    <ul className="space-y-1 pl-3">
                      {cat.items.map((it) => (
                        <li key={it.id} className="flex items-center justify-between text-sm">
                          <span
                            className={
                              it.isAvailable ? "" : "text-[color:var(--muted)] line-through"
                            }
                          >
                            {it.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[color:var(--muted)]">
                              R$ {Number(it.basePrice).toFixed(2).replace(".", ",")}
                            </span>
                            <Link
                              href={`/cms/menu/items/${it.id}`}
                              className="text-xs text-[color:var(--primary)] hover:underline"
                            >
                              editar
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {/* Subcategorias */}
                  {cat.subcategories.map((sub) => (
                    <div
                      key={sub.id}
                      className="border border-dashed border-[color:var(--border)] rounded p-2 ml-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{sub.name}</span>
                        <div className="flex gap-1">
                          <form action={createItemAndEdit.bind(null, cat.id, sub.id)}>
                            <Button type="submit" size="sm" variant="secondary">
                              + item
                            </Button>
                          </form>
                          <form action={deleteSubcategory.bind(null, sub.id)}>
                            <Button variant="ghost" size="sm" type="submit">
                              Excluir
                            </Button>
                          </form>
                        </div>
                      </div>
                      {sub.items.length > 0 ? (
                        <ul className="space-y-0.5 pl-2">
                          {sub.items.map((it) => (
                            <li key={it.id} className="flex items-center justify-between text-xs">
                              <span
                                className={
                                  it.isAvailable ? "" : "text-[color:var(--muted)] line-through"
                                }
                              >
                                {it.name}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-[color:var(--muted)]">
                                  R$ {Number(it.basePrice).toFixed(2).replace(".", ",")}
                                </span>
                                <Link
                                  href={`/cms/menu/items/${it.id}`}
                                  className="text-[color:var(--primary)] hover:underline"
                                >
                                  editar
                                </Link>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
