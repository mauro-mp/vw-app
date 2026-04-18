"use server";

import { revalidatePath } from "next/cache";
import type { TableStatus } from "@prisma/client";
import { requireStaff } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/events";

export async function setTableStatus(tableId: string, status: TableStatus) {
  const ctx = await requireStaff();
  await prisma.table.updateMany({
    where: { id: tableId, unitId: ctx.activeUnitId },
    data: { status },
  });
  revalidatePath("/ops/tables");
}

export async function closeActiveSession(tableId: string) {
  const ctx = await requireStaff();
  const session = await prisma.tableSession.findFirst({
    where: { tableId, unitId: ctx.activeUnitId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!session) {
    // Sem sessão ativa — só libera a mesa.
    await prisma.table.updateMany({
      where: { id: tableId, unitId: ctx.activeUnitId },
      data: { status: "AVAILABLE" },
    });
    revalidatePath("/ops/tables");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.tableSession.update({
      where: { id: session.id },
      data: { status: "CLOSED", endedAt: new Date() },
    });
    await tx.table.update({
      where: { id: tableId },
      data: { status: "AVAILABLE" },
    });
  });

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { id: true, number: true },
  });
  if (table) {
    await emitEvent({
      unitId: ctx.activeUnitId,
      type: "TABLE_RELEASED",
      entityType: "Table",
      entityId: table.id,
      payload: { tableId: table.id, tableNumber: table.number, sessionId: session.id },
    });
  }

  revalidatePath("/ops/tables");
}
