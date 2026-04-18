import { requireStaff } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { TablesLiveGrid, type TableView } from "./live-grid";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const ctx = await requireStaff();

  const tables = await prisma.table.findMany({
    where: { unitId: ctx.activeUnitId },
    orderBy: { number: "asc" },
    include: {
      sessions: {
        where: { status: "ACTIVE" },
        take: 1,
        include: {
          _count: {
            select: {
              orders: true,
              requests: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
            },
          },
        },
      },
    },
  });

  const view: TableView[] = tables.map((t) => {
    const sess = t.sessions[0];
    return {
      id: t.id,
      number: t.number,
      label: t.label,
      status: t.status,
      activeSession: sess
        ? {
            id: sess.id,
            customerPhone: sess.customerPhone,
            startedAt: sess.startedAt.toISOString(),
            orderCount: sess._count.orders,
            openRequests: sess._count.requests,
          }
        : null,
    };
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Mesas</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Estado das mesas em tempo real. Clique em uma mesa para ver detalhes da sessão ativa.
        </p>
      </header>
      <TablesLiveGrid initial={view} />
    </div>
  );
}
