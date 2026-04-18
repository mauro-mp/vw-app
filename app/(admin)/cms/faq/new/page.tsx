import Link from "next/link";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { FaqForm } from "../form";

export const dynamic = "force-dynamic";

export default async function NewFaqPage() {
  const ctx = await requireAdmin();

  const existing = await prisma.fAQItem.findMany({
    where: { unitId: ctx.activeUnitId },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <div className="text-xs text-[color:var(--muted)]">
          <Link href="/cms/faq" className="hover:underline">
            FAQ
          </Link>{" "}
          / Nova pergunta
        </div>
        <h1 className="text-2xl font-bold">Nova pergunta</h1>
      </header>

      <FaqForm mode="create" existingCategories={existing.map((e) => e.category)} />
    </div>
  );
}
