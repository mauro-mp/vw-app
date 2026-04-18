"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/cms/context";

const priceSchema = z
  .string()
  .trim()
  .refine((v) => /^\d+([.,]\d{1,2})?$/.test(v), "Preço inválido (use formato 29,90)");

const saveSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  basePrice: priceSchema,
  isAvailable: z.enum(["on", "off"]).optional(),
  ean: z.string().trim().max(50).optional(),
  agentInstructions: z.string().trim().max(1000).optional(),
  categoryId: z.string().trim().min(1),
  subcategoryId: z.string().trim().optional(),
});

export type ItemSaveState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

function parsePrice(v: string): Prisma.Decimal {
  return new Prisma.Decimal(v.replace(",", "."));
}

export async function saveItem(
  itemId: string,
  _prev: ItemSaveState,
  formData: FormData
): Promise<ItemSaveState> {
  const ctx = await requireAdmin();

  const existing = await prisma.menuItem.findFirst({
    where: { id: itemId, category: { section: { unitId: ctx.activeUnitId } } },
    select: { id: true },
  });
  if (!existing) return { error: "Item não encontrado." };

  const raw = {
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    basePrice: formData.get("basePrice") ?? "",
    isAvailable: formData.get("isAvailable") ?? undefined,
    ean: formData.get("ean") ?? "",
    agentInstructions: formData.get("agentInstructions") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    subcategoryId: formData.get("subcategoryId") ?? "",
  };
  const parsed = saveSchema.safeParse({
    name: raw.name,
    description: raw.description || undefined,
    imageUrl: raw.imageUrl,
    basePrice: raw.basePrice,
    isAvailable: raw.isAvailable === "on" ? "on" : "off",
    ean: raw.ean || undefined,
    agentInstructions: raw.agentInstructions || undefined,
    categoryId: raw.categoryId,
    subcategoryId: raw.subcategoryId || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const iss of parsed.error.issues) {
      fieldErrors[iss.path.join(".")] = iss.message;
    }
    return { error: "Corrija os campos destacados.", fieldErrors };
  }

  const d = parsed.data;

  // Valida que categoria (e subcategoria, se houver) pertencem à unit ativa.
  const category = await prisma.menuCategory.findFirst({
    where: { id: d.categoryId, section: { unitId: ctx.activeUnitId } },
    include: { subcategories: { select: { id: true } } },
  });
  if (!category) return { error: "Categoria inválida." };
  if (d.subcategoryId && !category.subcategories.some((s) => s.id === d.subcategoryId)) {
    return { error: "Subcategoria não pertence à categoria." };
  }

  await prisma.menuItem.update({
    where: { id: itemId },
    data: {
      name: d.name,
      description: d.description || null,
      imageUrl: d.imageUrl || null,
      basePrice: parsePrice(d.basePrice),
      isAvailable: d.isAvailable === "on",
      ean: d.ean || null,
      agentInstructions: d.agentInstructions || null,
      categoryId: d.categoryId,
      subcategoryId: d.subcategoryId || null,
    },
  });

  revalidatePath("/cms/menu");
  revalidatePath(`/cms/menu/items/${itemId}`);
  return undefined;
}

// ---------------------------------------------------------------------------
// Option group bindings
// ---------------------------------------------------------------------------

export async function attachOptionGroup(itemId: string, formData: FormData) {
  const ctx = await requireAdmin();
  const optionGroupId = String(formData.get("optionGroupId") ?? "");

  // Valida ownership
  const [item, og] = await Promise.all([
    prisma.menuItem.findFirst({
      where: { id: itemId, category: { section: { unitId: ctx.activeUnitId } } },
      select: { id: true },
    }),
    prisma.optionGroup.findFirst({
      where: { id: optionGroupId, unitId: ctx.activeUnitId },
      select: { id: true },
    }),
  ]);
  if (!item || !og) throw new Error("Entidade inválida.");

  await prisma.menuItemOptionGroup.upsert({
    where: { menuItemId_optionGroupId: { menuItemId: itemId, optionGroupId } },
    create: { menuItemId: itemId, optionGroupId },
    update: {},
  });
  revalidatePath(`/cms/menu/items/${itemId}`);
}

export async function detachOptionGroup(itemId: string, optionGroupId: string) {
  const ctx = await requireAdmin();
  await prisma.menuItemOptionGroup.deleteMany({
    where: {
      menuItemId: itemId,
      optionGroupId,
      menuItem: { category: { section: { unitId: ctx.activeUnitId } } },
    },
  });
  revalidatePath(`/cms/menu/items/${itemId}`);
}

export async function deleteItem(itemId: string) {
  const ctx = await requireAdmin();
  await prisma.menuItem.deleteMany({
    where: { id: itemId, category: { section: { unitId: ctx.activeUnitId } } },
  });
  revalidatePath("/cms/menu");
  redirect("/cms/menu");
}
