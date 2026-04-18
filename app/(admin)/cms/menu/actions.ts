"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/cms/context";

// Server actions para CRUD do cardápio: Sections, Categories, Subcategories.
// Toda action valida (i) autenticação ADMIN e (ii) que a entidade pertence à
// unit ativa do staff (evita IDOR entre tenants).

const nameSchema = z.string().trim().min(1, "Nome obrigatório").max(120);

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function createSection(formData: FormData) {
  const ctx = await requireAdmin();
  const name = nameSchema.parse(formData.get("name"));
  const sortOrderRaw = Number(formData.get("sortOrder") ?? 0);
  const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : 0;

  await prisma.menuSection.create({
    data: { unitId: ctx.activeUnitId, name, sortOrder },
  });
  revalidatePath("/cms/menu");
}

export async function renameSection(sectionId: string, formData: FormData) {
  const ctx = await requireAdmin();
  const name = nameSchema.parse(formData.get("name"));

  const { count } = await prisma.menuSection.updateMany({
    where: { id: sectionId, unitId: ctx.activeUnitId },
    data: { name },
  });
  if (!count) throw new Error("Seção não encontrada");
  revalidatePath("/cms/menu");
}

export async function toggleSection(sectionId: string, isAvailable: boolean) {
  const ctx = await requireAdmin();
  await prisma.menuSection.updateMany({
    where: { id: sectionId, unitId: ctx.activeUnitId },
    data: { isAvailable },
  });
  revalidatePath("/cms/menu");
}

export async function deleteSection(sectionId: string) {
  const ctx = await requireAdmin();
  await prisma.menuSection.deleteMany({
    where: { id: sectionId, unitId: ctx.activeUnitId },
  });
  revalidatePath("/cms/menu");
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(formData: FormData) {
  const ctx = await requireAdmin();
  const sectionId = String(formData.get("sectionId") ?? "");
  const name = nameSchema.parse(formData.get("name"));

  const section = await prisma.menuSection.findFirst({
    where: { id: sectionId, unitId: ctx.activeUnitId },
    select: { id: true },
  });
  if (!section) throw new Error("Seção não encontrada");

  await prisma.menuCategory.create({
    data: { sectionId, name },
  });
  revalidatePath("/cms/menu");
}

export async function deleteCategory(categoryId: string) {
  const ctx = await requireAdmin();
  await prisma.menuCategory.deleteMany({
    where: { id: categoryId, section: { unitId: ctx.activeUnitId } },
  });
  revalidatePath("/cms/menu");
}

// ---------------------------------------------------------------------------
// Subcategories
// ---------------------------------------------------------------------------

export async function createSubcategory(formData: FormData) {
  const ctx = await requireAdmin();
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = nameSchema.parse(formData.get("name"));

  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, section: { unitId: ctx.activeUnitId } },
    select: { id: true },
  });
  if (!category) throw new Error("Categoria não encontrada");

  await prisma.menuSubcategory.create({ data: { categoryId, name } });
  revalidatePath("/cms/menu");
}

export async function deleteSubcategory(subcategoryId: string) {
  const ctx = await requireAdmin();
  await prisma.menuSubcategory.deleteMany({
    where: {
      id: subcategoryId,
      category: { section: { unitId: ctx.activeUnitId } },
    },
  });
  revalidatePath("/cms/menu");
}

// ---------------------------------------------------------------------------
// Redirect helpers (create-and-edit pattern)
// ---------------------------------------------------------------------------

export async function createItemAndEdit(categoryId: string, subcategoryId?: string) {
  const ctx = await requireAdmin();

  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, section: { unitId: ctx.activeUnitId } },
    select: { id: true },
  });
  if (!category) throw new Error("Categoria não encontrada");

  const item = await prisma.menuItem.create({
    data: {
      categoryId,
      subcategoryId: subcategoryId || null,
      name: "Novo item",
      basePrice: 0,
      isAvailable: false,
    },
  });
  redirect(`/cms/menu/items/${item.id}`);
}
