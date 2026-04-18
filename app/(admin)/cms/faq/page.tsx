import Link from "next/link";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { togglePublished, deleteFaq } from "./actions";

export const dynamic = "force-dynamic";

export default async function FaqListPage() {
  const ctx = await requireAdmin();

  const items = await prisma.fAQItem.findMany({
    where: { unitId: ctx.activeUnitId },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { question: "asc" }],
  });

  // Agrupa por categoria preservando ordem
  const groups = new Map<string, typeof items>();
  for (const it of items) {
    const g = groups.get(it.category) ?? [];
    g.push(it);
    groups.set(it.category, g);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">FAQ</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Base de perguntas e respostas consumida pelo agente Phil via tool{" "}
            <code>get_faq</code>. Apenas itens <strong>publicados</strong> são retornados pela API.
          </p>
        </div>
        <Link
          href="/cms/faq/new"
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:opacity-90"
        >
          + Nova pergunta
        </Link>
      </header>

      {items.length === 0 ? (
        <section className="rounded-lg border border-dashed border-[color:var(--border)] p-8 text-center text-sm text-[color:var(--muted)]">
          Nenhuma pergunta cadastrada ainda.
        </section>
      ) : null}

      {[...groups.entries()].map(([category, list]) => (
        <section
          key={category}
          className="rounded-lg border border-[color:var(--border)] overflow-hidden"
        >
          <header className="bg-[color:var(--border)]/30 px-4 py-2 text-sm font-semibold flex items-center justify-between">
            <span>{category}</span>
            <span className="text-xs text-[color:var(--muted)] font-normal">
              {list.length} {list.length === 1 ? "item" : "itens"}
            </span>
          </header>
          <ul className="divide-y divide-[color:var(--border)]">
            {list.map((f) => (
              <li key={f.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${
                      f.isPublished ? "" : "text-[color:var(--muted)]"
                    }`}
                  >
                    {f.question}
                    {!f.isPublished ? (
                      <span className="ml-2 text-xs text-[color:var(--muted)]">(rascunho)</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[color:var(--muted)] mt-1 line-clamp-2">
                    {f.answer}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <form action={togglePublished.bind(null, f.id, !f.isPublished)}>
                    <Button type="submit" variant="ghost" size="sm">
                      {f.isPublished ? "Despublicar" : "Publicar"}
                    </Button>
                  </form>
                  <Link
                    href={`/cms/faq/${f.id}`}
                    className="text-xs text-[color:var(--primary)] hover:underline px-2"
                  >
                    editar
                  </Link>
                  <form action={deleteFaq.bind(null, f.id)}>
                    <Button type="submit" variant="ghost" size="sm">
                      Excluir
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
