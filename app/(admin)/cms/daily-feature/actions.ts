"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/cms/context";

const saveSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)"),
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  description: z.string().trim().max(500).optional(),
  isActive: z.enum(["on", "off"]).optional(),
});

export type DfSaveState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function dateOnlyUtc(iso: string): Date {
  // "2026-04-17" → 2026-04-17T00:00:00Z
  return new Date(`${iso}T00:00:00.000Z`);
}

export async function saveDailyFeature(
  _prev: DfSaveState,
  formData: FormData
): Promise<DfSaveState> {
  const ctx = await requireAdmin();
  const parsed = saveSchema.safeParse({
    date: formData.get("date") ?? "",
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    isActive: formData.get("isActive") === "on" ? "on" : "off",
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] = i.message;
    return { error: "Corrija os campos destacados.", fieldErrors: fe };
  }
  const d = parsed.data;
  const date = dateOnlyUtc(d.date);
  await prisma.dailyFeature.upsert({
    where: { unitId_date: { unitId: ctx.activeUnitId, date } },
    create: {
      unitId: ctx.activeUnitId,
      date,
      name: d.name,
      description: d.description || null,
      isActive: d.isActive === "on",
    },
    update: {
      name: d.name,
      description: d.description || null,
      isActive: d.isActive === "on",
    },
  });
  revalidatePath("/cms/daily-feature");
  return undefined;
}

export async function deleteDailyFeature(id: string) {
  const ctx = await requireAdmin();
  await prisma.dailyFeature.deleteMany({
    where: { id, unitId: ctx.activeUnitId },
  });
  revalidatePath("/cms/daily-feature");
}
