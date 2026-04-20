/**
 * Gera OptionGroups a partir do campo agentInstructions de cada MenuItem.
 *
 * Itens elegíveis: têm agentInstructions preenchido e nenhum OptionGroup vinculado.
 *
 * Requer:
 *   DATABASE_URL  — já está no .env.local
 *   OPENROUTER_API_KEY — chave da OpenRouter (ex: do agent-hub)
 *
 * Run:
 *   OPENROUTER_API_KEY=sk-or-... npx ts-node -P tsconfig.seed.json scripts/generate-option-groups.ts
 *
 * Flags:
 *   --dry-run   — mostra o que seria criado sem persistir
 *   --item-id=X — processa apenas o item com esse ID
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_ITEM = process.argv.find((a) => a.startsWith("--item-id="))?.split("=")[1];
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_KEY) {
  console.error("❌ OPENROUTER_API_KEY não definida.");
  process.exit(1);
}

// ---------------------------------------------------------------------------

interface ParsedGroup {
  name: string;
  isMandatory: boolean;
  minSelection: number;
  maxSelection: number;
  options: string[];
}

async function parseInstructions(
  itemName: string,
  instructions: string
): Promise<ParsedGroup[]> {
  const systemPrompt = `Você é um assistente que converte instruções de atendimento de restaurante em grupos de opções estruturados (option groups) para cardápio digital.

Regras:
- Analise o texto e extraia grupos de personalização do item.
- Cada grupo tem: nome, se é obrigatório, min/max seleções, e lista de opções.
- Retorne APENAS um array JSON válido, sem markdown, sem explicação.
- Se não houver opções claras para estruturar, retorne um array vazio: [].
- Opções de variação (ex: Normal/Zero, P/M/G) → isMandatory: true, min: 1, max: 1.
- Opções de preparo/extras → isMandatory: false, min: 0, max: 1.
- Nomes das opções em português, capitalizada.

Formato de saída (exemplo):
[
  {"name":"Tipo","isMandatory":true,"minSelection":1,"maxSelection":1,"options":["Normal","Zero"]},
  {"name":"Preparo","isMandatory":false,"minSelection":0,"maxSelection":1,"options":["Com gelo","Com gelo e limão","Sem gelo"]}
]`;

  const userPrompt = `Item: ${itemName}\nInstruções: ${instructions}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vw.local",
      "X-Title": "VW OptionGroup Generator",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${res.status}: ${body}`);
  }

  const json = await res.json();
  const raw: unknown = json?.choices?.[0]?.message?.content;
  const text = typeof raw === "string" ? raw : "";

  // Extrai JSON mesmo que venha com markdown fences
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    console.warn(`  ⚠️  LLM não retornou JSON array. Resposta: ${text.slice(0, 200)}`);
    return [];
  }

  try {
    const parsed = JSON.parse(match[0]) as ParsedGroup[];
    // Normaliza opções: LLM às vezes retorna objetos {name, priceDelta} em vez de strings
    return parsed.map((g) => ({
      ...g,
      options: g.options
        .map((o) => (typeof o === "string" ? o : (o as { name?: string }).name ?? ""))
        .filter((o) => o.trim() !== ""),
    })).filter((g) => g.options.length > 0); // remove grupos sem opções
  } catch {
    console.warn(`  ⚠️  Falha ao parsear JSON: ${match[0].slice(0, 200)}`);
    return [];
  }
}

// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Busca um OptionGroup existente com mesma identidade (unit + nome + regras +
 * conjunto de opções). Se encontrar, reutiliza — senão cria um novo.
 *
 * Identidade = (unitId, name normalizado, isMandatory, min, max, opções ordenadas).
 */
async function findOrCreateOptionGroup(
  unitId: string,
  g: ParsedGroup
): Promise<{ id: string; _reused: boolean }> {
  const candidates = await prisma.optionGroup.findMany({
    where: {
      unitId,
      isMandatory: g.isMandatory,
      minSelection: g.minSelection,
      maxSelection: g.maxSelection,
    },
    include: { options: { select: { name: true } } },
  });

  const wantName = normalize(g.name);
  const wantOpts = g.options.map(normalize).sort().join("|");

  for (const c of candidates) {
    if (normalize(c.name) !== wantName) continue;
    const haveOpts = c.options.map((o) => normalize(o.name)).sort().join("|");
    if (haveOpts === wantOpts) {
      return { id: c.id, _reused: true };
    }
  }

  const created = await prisma.optionGroup.create({
    data: {
      unitId,
      name: g.name,
      isMandatory: g.isMandatory,
      minSelection: g.minSelection,
      maxSelection: g.maxSelection,
      options: {
        create: g.options.map((name, idx) => ({
          name,
          priceDelta: 0,
          isAvailable: true,
          sortOrder: idx,
        })),
      },
    },
  });
  return { id: created.id, _reused: false };
}

// ---------------------------------------------------------------------------

async function main() {
  const whereClause = ONLY_ITEM
    ? { id: ONLY_ITEM }
    : { agentInstructions: { not: null as null }, optionGroups: { none: {} } };

  const items = await prisma.menuItem.findMany({
    where: whereClause,
    include: {
      category: {
        include: { section: { select: { unitId: true } } },
      },
    },
  });

  if (items.length === 0) {
    console.log("✅ Nenhum item elegível encontrado.");
    return;
  }

  console.log(`🔍 ${items.length} item(ns) encontrado(s)${DRY_RUN ? " [DRY RUN]" : ""}\n`);

  for (const item of items) {
    if (!item.agentInstructions) continue;
    const unitId = item.category.section.unitId;

    console.log(`📦 ${item.name} (ID: ${item.id})`);
    console.log(`   Instruções: "${item.agentInstructions}"`);

    const groups = await parseInstructions(item.name, item.agentInstructions);

    if (groups.length === 0) {
      console.log(`   → Nenhum option group gerado.\n`);
      continue;
    }

    for (const g of groups) {
      console.log(
        `   + [${g.isMandatory ? "obrigatório" : "opcional"}] ${g.name}: ${g.options.join(", ")}`
      );
    }

    if (DRY_RUN) {
      console.log("   → [dry-run] pulando persistência.\n");
      continue;
    }

    // Persiste cada grupo e vincula ao item — reutiliza grupos equivalentes
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];

      const og = await findOrCreateOptionGroup(unitId, g);

      // Idempotente: se o vínculo já existe, apenas atualiza sortOrder
      await prisma.menuItemOptionGroup.upsert({
        where: {
          menuItemId_optionGroupId: { menuItemId: item.id, optionGroupId: og.id },
        },
        create: {
          menuItemId: item.id,
          optionGroupId: og.id,
          sortOrder: i,
        },
        update: { sortOrder: i },
      });

      console.log(`   ✅ OptionGroup "${og.id}" (${og._reused ? "reutilizado" : "novo"}) vinculado.`);
    }

    console.log();
  }

  console.log("🎉 Concluído.");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
