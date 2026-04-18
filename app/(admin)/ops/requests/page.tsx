import { requireStaff } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { requestDto } from "@/lib/request-dto";
import { RequestsLiveInbox, type RequestView } from "./live-inbox";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const ctx = await requireStaff();
  const recent = await prisma.request.findMany({
    where: { unitId: ctx.activeUnitId },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { tableSession: { include: { table: { select: { number: true } } } } },
  });
  const initial = recent.map(requestDto) as unknown as RequestView[];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Solicitações</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Pedidos operacionais do salão: chamar garçom, cardápio físico, fechar conta, reclamações.
        </p>
      </header>
      <RequestsLiveInbox initial={initial} />
    </div>
  );
}
