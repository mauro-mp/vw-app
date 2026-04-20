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
    take: 200,
    include: { tableSession: { include: { table: { select: { number: true } } } } },
  });
  const initial = recent.map(requestDto) as unknown as RequestView[];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          Solicitações
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          Chamar garçom, conta, reclamações e pedidos do Phil.
        </p>
      </header>
      <RequestsLiveInbox initial={initial} />
    </div>
  );
}
