import { requireStaff } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { orderDto } from "@/lib/order-dto";
import { OrdersLiveBoard, type OrderView } from "./live-board";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const ctx = await requireStaff();

  const recent = await prisma.order.findMany({
    where: {
      unitId: ctx.activeUnitId,
      status: { in: ["CREATED", "CONFIRMED", "PREPARING", "CONCLUDED", "CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 60, // suficiente para 4 colunas em horário de pico
    include: {
      items: true,
      tableSession: { include: { table: { select: { number: true } } } },
    },
  });

  const initial = recent.map(orderDto) as unknown as OrderView[];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Fila operacional em tempo real. Novos pedidos chegam via WhatsApp (Phil) e aparecem na
          coluna "Novos".
        </p>
      </header>
      <OrdersLiveBoard initial={initial} />
    </div>
  );
}
