import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { UnitForm } from "../form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ unitId: string }> };

export default async function EditUnitPage({ params }: Params) {
  const ctx = await requireAdmin();
  const { unitId } = await params;

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, tenantId: ctx.tenantId },
  });
  if (!unit) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <div className="text-xs text-[color:var(--muted)]">
          <Link href="/admin/units" className="hover:underline">
            Unidades
          </Link>{" "}
          / Editar
        </div>
        <h1 className="text-2xl font-bold">{unit.name}</h1>
      </header>

      <UnitForm
        unit={{
          id: unit.id,
          name: unit.name,
          description: unit.description,
          phone: unit.phone,
          whatsapp: unit.whatsapp,
          instagram: unit.instagram,
          website: unit.website,
          addressStreet: unit.addressStreet,
          addressNumber: unit.addressNumber,
          addressComplement: unit.addressComplement,
          addressNeighborhood: unit.addressNeighborhood,
          addressCity: unit.addressCity,
          addressState: unit.addressState,
          addressZipcode: unit.addressZipcode,
          timezone: unit.timezone,
          currency: unit.currency,
          locale: unit.locale,
          operatingHours: unit.operatingHours as Record<
            string,
            Array<{ open: string; close: string }>
          > | null,
        }}
      />
    </div>
  );
}
