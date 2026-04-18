"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/cms/context";

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM");

const dayHoursSchema = z
  .object({
    open: hhmm,
    close: hhmm,
  })
  .refine((v) => v.open < v.close, "Fechamento precisa ser após abertura");

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
type Day = (typeof DAYS)[number];

const saveSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  instagram: z.string().trim().max(80).optional(),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  addressStreet: z.string().trim().max(200).optional(),
  addressNumber: z.string().trim().max(20).optional(),
  addressComplement: z.string().trim().max(80).optional(),
  addressNeighborhood: z.string().trim().max(100).optional(),
  addressCity: z.string().trim().max(100).optional(),
  addressState: z.string().trim().max(10).optional(),
  addressZipcode: z.string().trim().max(20).optional(),
  timezone: z.string().trim().max(60),
  currency: z.string().trim().length(3),
  locale: z.string().trim().min(2).max(10),
});

export type UnitSaveState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

export async function updateUnit(
  unitId: string,
  _prev: UnitSaveState,
  formData: FormData
): Promise<UnitSaveState> {
  const ctx = await requireAdmin();

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!unit) return { error: "Unidade não encontrada." };

  const parsed = saveSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    instagram: formData.get("instagram") ?? "",
    website: formData.get("website") ?? "",
    addressStreet: formData.get("addressStreet") ?? "",
    addressNumber: formData.get("addressNumber") ?? "",
    addressComplement: formData.get("addressComplement") ?? "",
    addressNeighborhood: formData.get("addressNeighborhood") ?? "",
    addressCity: formData.get("addressCity") ?? "",
    addressState: formData.get("addressState") ?? "",
    addressZipcode: formData.get("addressZipcode") ?? "",
    timezone: formData.get("timezone") ?? "America/Sao_Paulo",
    currency: formData.get("currency") ?? "BRL",
    locale: formData.get("locale") ?? "pt-BR",
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] = i.message;
    return { error: "Corrija os campos destacados.", fieldErrors: fe };
  }

  // Monta operatingHours a partir dos campos por dia (open-<day> / close-<day> / closed-<day>)
  const hours: Record<Day, Array<{ open: string; close: string }>> = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
  const hoursFieldErrors: Record<string, string> = {};
  for (const day of DAYS) {
    if (formData.get(`closed-${day}`) === "on") continue;
    const open = String(formData.get(`open-${day}`) ?? "");
    const close = String(formData.get(`close-${day}`) ?? "");
    if (!open && !close) continue;
    const d = dayHoursSchema.safeParse({ open, close });
    if (!d.success) {
      hoursFieldErrors[`hours.${day}`] = d.error.issues[0]?.message ?? "Inválido";
      continue;
    }
    hours[day].push(d.data);
  }
  if (Object.keys(hoursFieldErrors).length > 0) {
    return { error: "Horários inválidos em alguns dias.", fieldErrors: hoursFieldErrors };
  }

  const d = parsed.data;
  await prisma.unit.update({
    where: { id: unitId },
    data: {
      name: d.name,
      description: d.description || null,
      phone: d.phone || null,
      whatsapp: d.whatsapp || null,
      instagram: d.instagram || null,
      website: d.website || null,
      addressStreet: d.addressStreet || null,
      addressNumber: d.addressNumber || null,
      addressComplement: d.addressComplement || null,
      addressNeighborhood: d.addressNeighborhood || null,
      addressCity: d.addressCity || null,
      addressState: d.addressState || null,
      addressZipcode: d.addressZipcode || null,
      timezone: d.timezone,
      currency: d.currency,
      locale: d.locale,
      operatingHours: hours,
    },
  });

  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${unitId}`);
  return undefined;
}
