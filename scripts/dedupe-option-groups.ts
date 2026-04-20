/**
 * Consolida OptionGroups duplicados.
 *
 * Dois grupos são considerados equivalentes se tiverem:
 *   - mesmo unitId
 *   - mesmo name (case-insensitive, trim)
 *   - mesmo isMandatory, minSelection, maxSelection
 *   - mesma lista de opções (comparação por nome lowercased, ordenada)
 *
 * Para cada conjunto de duplicados:
 *   - elege o mais antigo como canônico (createdAt)
 *   - reaponta todos os MenuItemOptionGroup para o canônico
 *   - deleta os outros OptionGroups (Options são removidas por cascade)
 *
 * Run:
 *   npx ts-node -P tsconfig.seed.json scripts/dedupe-option-groups.ts
 *
 * Flags:
 *   --dry-run   — mostra o que seria consolidado sem persistir
 *   --unit-id=X — restringe a uma unit específica
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes("--dry-run");
const UNIT_ID = process.argv.find((a) => a.startsWith("--unit-id="))?.split("=")[1];

// ---------------------------------------------------------------------------

function norm(s: string): string {
  return s.trim().toLowerCase();
}

interface OptionGroupWithOptions {
  id: string;
  unitId: string;
  name: string;
  isMandatory: boolean;
  minSelection: number;
  maxSelection: number;
  createdAt: Date;
  options: { name: string }[];
}

function equivalenceKey(og: OptionGroupWithOptions): string {
  const optionNames = og.options
    .map((o) => norm(o.name))
    .sort()
    .join("|");
  return [
    og.unitId,
    norm(og.name),
    og.isMandatory ? "1" : "0",
    og.minSelection,
    og.maxSelection,
    optionNames,
  ].join("::");
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`🔎 Carregando OptionGroups${UNIT_ID ? ` da unit ${UNIT_ID}` : ""}…`);

  const groups = await prisma.optionGroup.findMany({
    where: UNIT_ID ? { unitId: UNIT_ID } : {},
    include: {
      options: { select: { name: true } },
      items: { select: { menuItemId: true, sortOrder: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`   ${groups.length} grupo(s) total${DRY_RUN ? " [DRY RUN]" : ""}\n`);

  // Agrupa por chave de equivalência
  const buckets = new Map<string, typeof groups>();
  for (const g of groups) {
    const key = equivalenceKey(g);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(g);
  }

  const dupSets = Array.from(buckets.values()).filter((arr) => arr.length > 1);

  if (dupSets.length === 0) {
    console.log("✅ Nenhum duplicado encontrado.");
    return;
  }

  console.log(`📦 ${dupSets.length} conjunto(s) com duplicados:\n`);

  let totalRemoved = 0;
  let totalRelinked = 0;

  for (const set of dupSets) {
    // Ordena por createdAt asc — primeiro é o canônico
    set.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const [canonical, ...duplicates] = set;

    const preview = canonical.options.map((o) => o.name).join(", ");
    console.log(
      `🔗 "${canonical.name}" [${canonical.isMandatory ? "obrig" : "opcional"}] ` +
      `${canonical.minSelection}/${canonical.maxSelection} (${preview})`
    );
    console.log(`   canônico: ${canonical.id} (${canonical.items.length} vínculo(s))`);
    for (const dup of duplicates) {
      console.log(`   duplicado: ${dup.id} (${dup.items.length} vínculo(s)) → consolidar`);
    }

    if (DRY_RUN) {
      totalRemoved += duplicates.length;
      console.log();
      continue;
    }

    // Reaponta MenuItemOptionGroup dos duplicados para o canônico
    await prisma.$transaction(async (tx) => {
      // Já existe vínculo do canônico a quais itens?
      const canonicalItems = await tx.menuItemOptionGroup.findMany({
        where: { optionGroupId: canonical.id },
        select: { menuItemId: true },
      });
      const canonicalItemIds = new Set(canonicalItems.map((c) => c.menuItemId));

      for (const dup of duplicates) {
        const dupLinks = await tx.menuItemOptionGroup.findMany({
          where: { optionGroupId: dup.id },
        });

        for (const link of dupLinks) {
          if (canonicalItemIds.has(link.menuItemId)) {
            // Canônico já está vinculado — apenas remove o vínculo duplicado
            await tx.menuItemOptionGroup.delete({
              where: {
                menuItemId_optionGroupId: {
                  menuItemId: link.menuItemId,
                  optionGroupId: dup.id,
                },
              },
            });
          } else {
            // Migra o vínculo para o canônico
            await tx.menuItemOptionGroup.delete({
              where: {
                menuItemId_optionGroupId: {
                  menuItemId: link.menuItemId,
                  optionGroupId: dup.id,
                },
              },
            });
            await tx.menuItemOptionGroup.create({
              data: {
                menuItemId: link.menuItemId,
                optionGroupId: canonical.id,
                sortOrder: link.sortOrder,
              },
            });
            canonicalItemIds.add(link.menuItemId);
            totalRelinked++;
          }
        }

        // Agora remove o grupo duplicado (options cascade)
        await tx.optionGroup.delete({ where: { id: dup.id } });
        totalRemoved++;
      }
    });

    console.log(`   ✅ consolidado\n`);
  }

  console.log(
    `🎉 Concluído.${DRY_RUN ? " [DRY RUN — nada persistido]" : ""}\n` +
    `   ${totalRemoved} grupo(s) removido(s), ${totalRelinked} vínculo(s) migrado(s).`
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
