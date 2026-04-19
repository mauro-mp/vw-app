/**
 * Importa o cardápio Fillmore a partir do arquivo Menu Fillmore.txt.
 * Uso: npx tsx prisma/seed-menu.ts
 */

import { config as loadDotenv } from "dotenv";
import path from "path";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local") });
loadDotenv({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

interface MenuRaw {
  section_id: number;
  section: string;
  category: string;
  subcategory: string;
  item: string;
  portion: string;
  variations: string;
  description: string;
  badges: string;
  price: string;
  constraints: string;
  custom_instructions: string;
  image_url: string;
}

function parsePrice(raw: string): number {
  // Pega o primeiro valor "R$ X,XX" encontrado
  const match = raw.match(/R\$\s*([\d.]+),([\d]{2})/);
  if (!match) return 0;
  return parseFloat(`${match[1].replace(/\./g, "")}.${match[2]}`);
}

function nullIfDash(v: string): string | null {
  return !v || v.trim() === "-" ? null : v.trim();
}

function imageUrl(v: string): string | null {
  if (!v || v.trim() === "-" || v.includes("placehold.co")) return null;
  return v.trim();
}

async function main() {
  // ── Carrega e parseia o arquivo ────────────────────────────────────────────
  const filePath = "C:\\Users\\mauro\\OneDrive\\Desktop\\Menu Fillmore.txt";
  const raw = readFileSync(filePath, "utf-8");
  // Remove "const items = " do início e parseia como JSON
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Array JSON não encontrado no arquivo.");
  const items: MenuRaw[] = JSON.parse(raw.substring(start, end + 1));

  console.log(`\n  Itens carregados: ${items.length}`);

  // ── Encontra a unit ────────────────────────────────────────────────────────
  const unit = await prisma.unit.findFirst({ orderBy: { createdAt: "asc" } });
  if (!unit) throw new Error("Nenhuma unit encontrada. Rode o iniciar.bat primeiro.");
  console.log(`  Unit: ${unit.name} (${unit.id})`);

  // ── Limpa o cardápio existente ────────────────────────────────────────────
  // Remove OrderItems que referenciam itens desta unit antes de apagar o cardápio
  await prisma.orderItem.deleteMany({
    where: { menuItem: { category: { section: { unitId: unit.id } } } },
  });
  await prisma.menuSection.deleteMany({ where: { unitId: unit.id } });
  console.log("  Cardápio anterior removido.\n");

  // ── Monta estrutura agrupada ──────────────────────────────────────────────
  // sectionKey → categoryKey → subcategoryKey → itens
  type GroupedItems = Map<
    string,
    { sectionId: number; section: string; categories: Map<string, Map<string, MenuRaw[]>> }
  >;

  const grouped: GroupedItems = new Map();

  for (const row of items) {
    const sk = row.section;
    if (!grouped.has(sk)) {
      grouped.set(sk, { sectionId: row.section_id, section: sk, categories: new Map() });
    }
    const secGroup = grouped.get(sk)!;

    const ck = row.category;
    if (!secGroup.categories.has(ck)) secGroup.categories.set(ck, new Map());
    const catGroup = secGroup.categories.get(ck)!;

    const subk = row.subcategory.trim() === "-" ? "__none__" : row.subcategory.trim();
    if (!catGroup.has(subk)) catGroup.set(subk, []);
    catGroup.get(subk)!.push(row);
  }

  // ── Insere no banco ───────────────────────────────────────────────────────
  let sectionOrder = 0;

  for (const [, sec] of grouped) {
    const section = await prisma.menuSection.create({
      data: { unitId: unit.id, name: sec.section, sortOrder: sectionOrder++ },
    });
    console.log(`  [seção] ${section.name}`);

    let catOrder = 0;

    for (const [catName, subMap] of sec.categories) {
      const category = await prisma.menuCategory.create({
        data: { sectionId: section.id, name: catName, sortOrder: catOrder++ },
      });
      console.log(`    [categoria] ${catName}`);

      let subOrder = 0;

      for (const [subName, rows] of subMap) {
        const hasSubcategory = subName !== "__none__";
        let subcategoryId: string | null = null;

        if (hasSubcategory) {
          const sub = await prisma.menuSubcategory.create({
            data: { categoryId: category.id, name: subName, sortOrder: subOrder++ },
          });
          subcategoryId = sub.id;
          console.log(`      [subcategoria] ${subName}`);
        }

        let itemOrder = 0;

        for (const row of rows) {
          const instructions: string[] = [];
          if (nullIfDash(row.custom_instructions)) instructions.push(row.custom_instructions.trim());
          if (nullIfDash(row.constraints)) instructions.push(`Restrição: ${row.constraints.trim()}`);
          if (nullIfDash(row.variations)) instructions.push(`Variações: ${row.variations.trim()}`);
          if (nullIfDash(row.badges)) instructions.push(`Destaque: ${row.badges.trim()}`);

          await prisma.menuItem.create({
            data: {
              categoryId: category.id,
              subcategoryId,
              name: row.item.trim(),
              description: nullIfDash(row.description),
              imageUrl: imageUrl(row.image_url),
              basePrice: parsePrice(row.price),
              isAvailable: true,
              sortOrder: itemOrder++,
              agentInstructions: instructions.length ? instructions.join(" | ") : null,
            },
          });
          console.log(`        - ${row.item.trim()} (R$ ${parsePrice(row.price).toFixed(2).replace(".", ",")})`);
        }
      }
    }
  }

  console.log("\n  ✓ Cardápio importado com sucesso!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
