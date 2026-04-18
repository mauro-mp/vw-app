"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/cms/context";

// ---------------------------------------------------------------------------
// Option Group
// ---------------------------------------------------------------------------

const ogSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
  isMandatory: z.enum(["on", "off"]).optional(),
  minSelection: z.coerce.number().int().min(0).max(20),
  maxSelection: z.coerce.number().int().min(1).max(20),
});

export type OgSaveState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

export async function createOptionGroup(_prev: OgSaveState, formData: FormData): Promise<OgSaveState> {
  const ctx = await requireAdmin();
  const parsed = ogSchema.safeParse({
    name: formData.get("name") ?? "",
    isMandatory: formData.get("isMandatory") === "on" ? "on" : "off",
    minSelection: formData.get("minSelection") ?? 0,
    maxSelection: formData.get("maxSelection") ?? 1,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] = i.message;
    return { error: "Corrija os campos destacados.", fieldErrors: fe };
  }
  const d = parsed.data;
  if (d.maxSelection < d.minSelection) {
    return { error: "Máximo precisa ser ≥ mínimo.", fieldErrors: { maxSelection: "Inválido" } };
  }
  const og = await prisma.optionGroup.create({
    data: {
      unitId: ctx.activeUnitId,
      name: d.name,
      isMandatory: d.isMandatory === "on",
      minSelection: d.minSelection,
      maxSelection: d.maxSelection,
    },
  });
  revalidatePath("/cms/option-groups");
  redirect(`/cms/option-groups/${og.id}`);
}

export async function updateOptionGroup(
  ogId: string,
  _prev: OgSaveState,
  formData: FormData
): Promise<OgSaveState> {
  const ctx = await requireAdmin();
  const parsed = ogSchema.safeParse({
    name: formData.get("name") ?? "",
    isMandatory: formData.get("isMandatory") === "on" ? "on" : "off",
    minSelection: formData.get("minSelection") ?? 0,
    maxSelection: formData.get("maxSelection") ?? 1,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] = i.message;
    return { error: "Corrija os campos destacados.", fieldErrors: fe };
  }
  const d = parsed.data;
  if (d.maxSelection < d.minSelection) {
    return { error: "Máximo precisa ser ≥ mínimo.", fieldErrors: { maxSelection: "Inválido" } };
  }

  const { count } = await prisma.optionGroup.updateMany({
    where: { id: ogId, unitId: ctx.activeUnitId },
    data: {
      name: d.name,
      isMandatory: d.isMandatory === "on",
      minSelection: d.minSelection,
      maxSelection: d.maxSelection,
    },
  });
  if (!count) return { error: "Grupo não encontrado." };
  revalidatePath("/cms/option-groups");
  revalidatePath(`/cms/option-groups/${ogId}`);
  return undefined;
}

export async function deleteOptionGroup(ogId: string) {
  const ctx = await requireAdmin();
  await prisma.optionGroup.deleteMany({ where: { id: ogId, unitId: ctx.activeUnitId } });
  revalidatePath("/cms/option-groups");
  redirect("/cms/option-groups");
}

// ---------------------------------------------------------------------------
// Option (children)
// ---------------------------------------------------------------------------

const optionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  priceDelta: z
    .string()
    .trim()
    .refine((v) => /^-?\d+([.,]\d{1,2})?$/.test(v || "0"), "Delta inválido"),
});

function parsePrice(v: string): Prisma.Decimal {
  return new Prisma.Decimal((v || "0").replace(",", "."));
}

export async function addOption(ogId: string, formData: FormData) {
  const ctx = await requireAdmin();
  const og = await prisma.optionGroup.findFirst({
    where: { id: ogId, unitId: ctx.activeUnitId },
    select: { id: true, options: { select: { sortOrder: true } } },
  });
  if (!og) throw new Error("Grupo não encontrado.");

  const parsed = optionSchema.parse({
    name: formData.get("name") ?? "",
    priceDelta: formData.get("priceDelta") ?? "0",
  });
  const maxOrder = og.options.reduce((m, o) => Math.max(m, o.sortOrder), 0);

  await prisma.option.create({
    data: {
      optionGroupId: ogId,
      name: parsed.name,
      priceDelta: parsePrice(parsed.priceDelta),
      sortOrder: maxOrder + 1,
    },
  });
  revalidatePath(`/cms/option-groups/${ogId}`);
}

export async function deleteOption(ogId: string, optionId: string) {
  const ctx = await requireAdmin();
  await prisma.option.deleteMany({
    where: { id: optionId, optionGroup: { id: ogId, unitId: ctx.activeUnitId } },
  });
  revalidatePath(`/cms/option-groups/${ogId}`);
}
