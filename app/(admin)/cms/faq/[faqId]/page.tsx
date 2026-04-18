import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { FaqForm } from "../form";
import { deleteFaq } from "../actions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ faqId: string }> };

export default async function EditFaqPage({ params }: Params) {
  const ctx = await requireAdmin();
  const { faqId } = await params;

  const [item, categoriesRaw] = await Promise.all([
    prisma.fAQItem.findFirst({ where: { id: faqId, unitId: ctx.activeUnitId } }),
    prisma.fAQItem.findMany({
      where: { unitId: ctx.activeUnitId },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);
  if (!item) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <div className="text-xs text-[color:var(--muted)]">
          <Link href="/cms/faq" className="hover:underline">
            FAQ
          </Link>{" "}
          / Editar
        </div>
        <h1 className="text-2xl font-bold">{item.question}</h1>
      </header>

      <FaqForm
        mode="edit"
        item={{
          id: item.id,
          category: item.category,
          question: item.question,
          answer: item.answer,
          sortOrder: item.sortOrder,
          isPublished: item.isPublished,
        }}
        existingCategories={categoriesRaw.map((c) => c.category)}
      />

      <section className="rounded-lg border border-[color:var(--destructive)] p-4 space-y-2">
        <h2 className="font-semibold text-[color:var(--destructive)]">Excluir pergunta</h2>
        <form action={deleteFaq.bind(null, item.id)}>
          <Button type="submit" variant="destructive" size="sm">
            Excluir permanentemente
          </Button>
        </form>
      </section>
    </div>
  );
}
