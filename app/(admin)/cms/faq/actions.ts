"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/cms/context";

const faqSchema = z.object({
  category: z.string().trim().min(1, "Categoria obrigatória").max(80),
  question: z.string().trim().min(1, "Pergunta obrigatória").max(300),
  answer: z.string().trim().min(1, "Resposta obrigatória").max(2000),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isPublished: z.enum(["on", "off"]).optional(),
});

export type FaqSaveState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

export async function createFaq(_prev: FaqSaveState, formData: FormData): Promise<FaqSaveState> {
  const ctx = await requireAdmin();
  const parsed = faqSchema.safeParse({
    category: formData.get("category") ?? "",
    question: formData.get("question") ?? "",
    answer: formData.get("answer") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isPublished: formData.get("isPublished") === "on" ? "on" : "off",
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] = i.message;
    return { error: "Corrija os campos destacados.", fieldErrors: fe };
  }
  const d = parsed.data;
  await prisma.fAQItem.create({
    data: {
      unitId: ctx.activeUnitId,
      category: d.category,
      question: d.question,
      answer: d.answer,
      sortOrder: d.sortOrder,
      isPublished: d.isPublished === "on",
    },
  });
  revalidatePath("/cms/faq");
  redirect("/cms/faq");
}

export async function updateFaq(
  faqId: string,
  _prev: FaqSaveState,
  formData: FormData
): Promise<FaqSaveState> {
  const ctx = await requireAdmin();
  const parsed = faqSchema.safeParse({
    category: formData.get("category") ?? "",
    question: formData.get("question") ?? "",
    answer: formData.get("answer") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isPublished: formData.get("isPublished") === "on" ? "on" : "off",
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] = i.message;
    return { error: "Corrija os campos destacados.", fieldErrors: fe };
  }
  const d = parsed.data;
  const { count } = await prisma.fAQItem.updateMany({
    where: { id: faqId, unitId: ctx.activeUnitId },
    data: {
      category: d.category,
      question: d.question,
      answer: d.answer,
      sortOrder: d.sortOrder,
      isPublished: d.isPublished === "on",
    },
  });
  if (!count) return { error: "FAQ não encontrada." };
  revalidatePath("/cms/faq");
  revalidatePath(`/cms/faq/${faqId}`);
  return undefined;
}

export async function togglePublished(faqId: string, isPublished: boolean) {
  const ctx = await requireAdmin();
  await prisma.fAQItem.updateMany({
    where: { id: faqId, unitId: ctx.activeUnitId },
    data: { isPublished },
  });
  revalidatePath("/cms/faq");
}

export async function deleteFaq(faqId: string) {
  const ctx = await requireAdmin();
  await prisma.fAQItem.deleteMany({ where: { id: faqId, unitId: ctx.activeUnitId } });
  revalidatePath("/cms/faq");
}
