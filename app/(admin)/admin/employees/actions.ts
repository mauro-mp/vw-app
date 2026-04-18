"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/cms/context";
import { Prisma } from "@prisma/client";

const emailSchema = z.string().trim().email().toLowerCase().max(200);
const nameSchema = z.string().trim().min(1, "Nome obrigatório").max(120);
const passwordSchema = z.string().min(8, "Senha precisa de ao menos 8 caracteres").max(200);
const roleSchema = z.enum(["ADMIN", "OPERATOR"]);

export type EmpSaveState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

const createSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
  role: roleSchema,
  unitIds: z.array(z.string()).default([]),
});

const editSchema = createSchema.omit({ password: true }).extend({
  password: z.string().optional(), // opcional em edição
});

function parseUnitIds(formData: FormData): string[] {
  return formData.getAll("unitIds").map(String).filter(Boolean);
}

export async function createEmployee(
  _prev: EmpSaveState,
  formData: FormData
): Promise<EmpSaveState> {
  const ctx = await requireAdmin();

  const parsed = createSchema.safeParse({
    email: formData.get("email") ?? "",
    name: formData.get("name") ?? "",
    password: formData.get("password") ?? "",
    role: formData.get("role") ?? "OPERATOR",
    unitIds: parseUnitIds(formData),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] = i.message;
    return { error: "Corrija os campos destacados.", fieldErrors: fe };
  }
  const d = parsed.data;

  // Valida que todas as units pertencem ao tenant do admin
  if (d.unitIds.length > 0) {
    const owned = await prisma.unit.count({
      where: { id: { in: d.unitIds }, tenantId: ctx.tenantId },
    });
    if (owned !== d.unitIds.length) {
      return { error: "Uma ou mais unidades não pertencem ao seu tenant." };
    }
  }

  const passwordHash = await bcrypt.hash(d.password, 12);

  try {
    await prisma.employee.create({
      data: {
        tenantId: ctx.tenantId,
        email: d.email,
        name: d.name,
        passwordHash,
        role: d.role,
        employeeUnits: { create: d.unitIds.map((unitId) => ({ unitId })) },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Já existe staff com esse email neste tenant.", fieldErrors: { email: "Email em uso" } };
    }
    throw e;
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

export async function updateEmployee(
  employeeId: string,
  _prev: EmpSaveState,
  formData: FormData
): Promise<EmpSaveState> {
  const ctx = await requireAdmin();

  const parsed = editSchema.safeParse({
    email: formData.get("email") ?? "",
    name: formData.get("name") ?? "",
    password: (formData.get("password") ?? "") || undefined,
    role: formData.get("role") ?? "OPERATOR",
    unitIds: parseUnitIds(formData),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] = i.message;
    return { error: "Corrija os campos destacados.", fieldErrors: fe };
  }
  const d = parsed.data;

  const target = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!target) return { error: "Staff não encontrado." };

  if (d.unitIds.length > 0) {
    const owned = await prisma.unit.count({
      where: { id: { in: d.unitIds }, tenantId: ctx.tenantId },
    });
    if (owned !== d.unitIds.length) {
      return { error: "Uma ou mais unidades não pertencem ao seu tenant." };
    }
  }

  let passwordHash: string | undefined;
  if (d.password) {
    if (d.password.length < 8) return { fieldErrors: { password: "Mínimo 8 caracteres." } };
    passwordHash = await bcrypt.hash(d.password, 12);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          email: d.email,
          name: d.name,
          role: d.role,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });
      await tx.employeeUnit.deleteMany({ where: { employeeId } });
      if (d.unitIds.length > 0) {
        await tx.employeeUnit.createMany({
          data: d.unitIds.map((unitId) => ({ employeeId, unitId })),
        });
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Outro staff já usa esse email.", fieldErrors: { email: "Email em uso" } };
    }
    throw e;
  }

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${employeeId}`);
  return undefined;
}

export async function toggleEmployeeActive(employeeId: string, isActive: boolean) {
  const ctx = await requireAdmin();

  if (!isActive && employeeId === ctx.employeeId) {
    throw new Error("Você não pode desativar sua própria conta.");
  }

  await prisma.employee.updateMany({
    where: { id: employeeId, tenantId: ctx.tenantId },
    data: { isActive },
  });
  revalidatePath("/admin/employees");
}
