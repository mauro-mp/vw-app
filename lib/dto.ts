// Transformadores Prisma → DTO Open Delivery + extensões x-dinein.
// Centraliza a serialização para o contrato público.

import type {
  Unit,
  MenuSection,
  MenuCategory,
  MenuSubcategory,
  MenuItem,
  OptionGroup,
  Option,
  MenuItemOptionGroup,
  FAQItem,
  DailyFeature,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
type Decimal = Prisma.Decimal;

// ---------------------------------------------------------------------------
// Price / Decimal helpers
// ---------------------------------------------------------------------------

function priceOf(amount: Decimal | number | string, currency = "BRL") {
  const n = typeof amount === "object" && amount !== null ? Number(amount) : Number(amount);
  return { amount: Number(n.toFixed(2)), currency };
}

// ---------------------------------------------------------------------------
// Catalog types (agregados vindos com include profundo)
// ---------------------------------------------------------------------------

export type OptionWithParent = Option;

export type OptionGroupWithOptions = OptionGroup & {
  options: OptionWithParent[];
};

export type MenuItemOptionGroupHydrated = MenuItemOptionGroup & {
  optionGroup: OptionGroupWithOptions;
};

export type MenuItemFull = MenuItem & {
  optionGroups: MenuItemOptionGroupHydrated[];
};

export type MenuSubcategoryFull = MenuSubcategory & {
  items: MenuItemFull[];
};

export type MenuCategoryFull = MenuCategory & {
  subcategories: MenuSubcategoryFull[];
  items: MenuItemFull[];
};

export type MenuSectionFull = MenuSection & {
  categories: MenuCategoryFull[];
};

export type UnitFull = Unit & {
  menuSections: MenuSectionFull[];
};

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

export function optionDto(opt: Option) {
  return {
    id: opt.id,
    name: opt.name,
    priceDelta: priceOf(opt.priceDelta),
    isAvailable: opt.isAvailable,
  };
}

export function optionGroupDto(og: OptionGroupWithOptions) {
  return {
    id: og.id,
    name: og.name,
    isMandatory: og.isMandatory,
    minSelection: og.minSelection,
    maxSelection: og.maxSelection,
    options: og.options
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(optionDto),
  };
}

export function itemDto(item: MenuItemFull) {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    imageUrl: item.imageUrl ?? undefined,
    ean: item.ean ?? undefined,
    isAvailable: item.isAvailable,
    agentInstructions: item.agentInstructions ?? undefined,
    offer: { price: priceOf(item.basePrice) },
    optionGroups: item.optionGroups
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((mig) => optionGroupDto(mig.optionGroup)),
  };
}

export function subcategoryDto(sub: MenuSubcategoryFull) {
  return {
    id: sub.id,
    name: sub.name,
    sortOrder: sub.sortOrder,
    items: sub.items
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(itemDto),
  };
}

export function categoryDto(cat: MenuCategoryFull) {
  return {
    id: cat.id,
    name: cat.name,
    sortOrder: cat.sortOrder,
    isAvailable: cat.isAvailable,
    agentInstructions: cat.agentInstructions ?? undefined,
    items: cat.items
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(itemDto),
    subcategories: cat.subcategories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(subcategoryDto),
  };
}

export function sectionDto(sec: MenuSectionFull) {
  return {
    id: sec.id,
    name: sec.name,
    sortOrder: sec.sortOrder,
    isAvailable: sec.isAvailable,
    categories: sec.categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(categoryDto),
  };
}

export function merchantDto(unit: UnitFull) {
  return {
    id: unit.id,
    basicInfo: {
      name: unit.name,
      description: unit.description ?? undefined,
      phone: unit.phone ?? undefined,
      whatsapp: unit.whatsapp ?? undefined,
      website: unit.website ?? undefined,
      instagram: unit.instagram ?? undefined,
      address: {
        street: unit.addressStreet ?? undefined,
        number: unit.addressNumber ?? undefined,
        complement: unit.addressComplement ?? undefined,
        neighborhood: unit.addressNeighborhood ?? undefined,
        city: unit.addressCity ?? undefined,
        state: unit.addressState ?? undefined,
        zipcode: unit.addressZipcode ?? undefined,
        country: unit.addressCountry ?? "BR",
        latitude: unit.latitude ?? undefined,
        longitude: unit.longitude ?? undefined,
      },
      timezone: unit.timezone,
      currency: unit.currency,
      locale: unit.locale,
    },
    services: [
      {
        type: "DINE_IN",
        operatingHours: operatingHoursDto(unit.operatingHours),
      },
    ],
    menu: {
      sections: unit.menuSections
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(sectionDto),
    },
  };
}

function operatingHoursDto(raw: unknown): Array<{ dayOfWeek: string; open: string; close: string }> {
  if (!raw || typeof raw !== "object") return [];
  const days: Record<string, string> = {
    monday: "MONDAY",
    tuesday: "TUESDAY",
    wednesday: "WEDNESDAY",
    thursday: "THURSDAY",
    friday: "FRIDAY",
    saturday: "SATURDAY",
    sunday: "SUNDAY",
  };
  const out: Array<{ dayOfWeek: string; open: string; close: string }> = [];
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const day = days[k];
    if (!day || !Array.isArray(v)) continue;
    for (const w of v) {
      if (
        w &&
        typeof w === "object" &&
        "open" in w &&
        "close" in w &&
        typeof (w as Record<string, unknown>).open === "string" &&
        typeof (w as Record<string, unknown>).close === "string"
      ) {
        out.push({
          dayOfWeek: day,
          open: (w as Record<string, string>).open,
          close: (w as Record<string, string>).close,
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Extensões x-dinein
// ---------------------------------------------------------------------------

export function faqDto(f: FAQItem) {
  return {
    id: f.id,
    category: f.category,
    question: f.question,
    answer: f.answer,
    sortOrder: f.sortOrder,
  };
}

export function dailyFeatureDto(d: DailyFeature) {
  return {
    date: d.date.toISOString().slice(0, 10),
    name: d.name,
    description: d.description ?? undefined,
  };
}
