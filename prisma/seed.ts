/**
 * Seed de dados para desenvolvimento — Fillmore Ipiranga.
 *
 * Popula:
 *   - Tenant "Fillmore" + Unit "Fillmore Ipiranga"
 *   - 1 Employee ADMIN (credenciais em SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *   - ApiClient para o agent-hub (OAuth2 client_credentials)
 *   - Estrutura do cardápio (seções, categorias, subcategorias de exemplo)
 *   - Option groups reaproveitáveis (Ponto da carne, Gás, Gelo)
 *   - Itens de exemplo (Croque Madame, Coca-Cola Zero, Big Breakfast)
 *   - FAQ inicial (6 itens — restante adicionar pelo CMS)
 *   - Mesas 1–10
 *   - Entradinha do dia
 *
 * Rodar: `npm run seed`
 */

import { config as loadDotenv } from "dotenv";
import path from "path";

// Carrega .env.local antes de importar Prisma para garantir DATABASE_URL.
loadDotenv({ path: path.resolve(process.cwd(), ".env.local") });
loadDotenv({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient, EmployeeRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomQrToken(): string {
  return randomBytes(16).toString("hex");
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@fillmore.com.br";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "senha1234";

  // -------------------------------------------------------------------------
  // Tenant + Unit
  // -------------------------------------------------------------------------
  const tenant = await prisma.tenant.upsert({
    where: { agentHubClientId: "placeholder-fillmore-client" },
    update: {},
    create: {
      agentHubClientId: "placeholder-fillmore-client",
      name: "Fillmore",
      slug: "fillmore",
    },
  });

  const unit = await prisma.unit.upsert({
    where: { agentHubAgentId: "placeholder-fillmore-ipiranga-agent" },
    update: {},
    create: {
      tenantId: tenant.id,
      agentHubAgentId: "placeholder-fillmore-ipiranga-agent",
      name: "Fillmore Ipiranga",
      slug: "ipiranga",
      phone: "(11) 99119-5922",
      whatsapp: "(11) 99119-5922",
      instagram: "@fillmore.ipiranga",
      description: "Restaurante e cafeteria com estilo americano.",
      addressStreet: "Av. Nazaré",
      addressNumber: "1732",
      addressNeighborhood: "Ipiranga",
      addressCity: "São Paulo",
      addressState: "SP",
      addressZipcode: "04262-300",
      addressCountry: "BR",
      timezone: "America/Sao_Paulo",
      currency: "BRL",
      locale: "pt-BR",
      operatingHours: {
        monday:    [{ open: "08:00", close: "22:00" }],
        tuesday:   [{ open: "08:00", close: "22:00" }],
        wednesday: [{ open: "08:00", close: "22:00" }],
        thursday:  [{ open: "08:00", close: "22:00" }],
        friday:    [{ open: "08:00", close: "22:00" }],
        saturday:  [{ open: "08:00", close: "22:00" }],
        sunday:    [{ open: "08:00", close: "22:00" }],
      },
    },
  });

  console.log(`✓ Tenant: ${tenant.name} / Unit: ${unit.name}`);

  // -------------------------------------------------------------------------
  // Employee ADMIN
  // -------------------------------------------------------------------------
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.employee.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
    update: { passwordHash, role: EmployeeRole.ADMIN, isActive: true },
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      passwordHash,
      name: "Admin Fillmore",
      role: EmployeeRole.ADMIN,
    },
  });

  await prisma.employeeUnit.upsert({
    where: { employeeId_unitId: { employeeId: admin.id, unitId: unit.id } },
    update: {},
    create: { employeeId: admin.id, unitId: unit.id },
  });

  console.log(`✓ Admin: ${admin.email} (senha: ${adminPassword})`);

  // -------------------------------------------------------------------------
  // ApiClient (agent-hub)
  // -------------------------------------------------------------------------
  const apiClientId = "vw_fillmore_dev";
  const apiClientSecret = "dev_secret_change_me_" + randomBytes(16).toString("hex");
  await prisma.apiClient.upsert({
    where: { clientId: apiClientId },
    update: {},
    create: {
      tenantId: tenant.id,
      clientId: apiClientId,
      clientSecretHash: sha256(apiClientSecret),
      name: "agent-hub dev",
      scopes: "od.all",
    },
  });
  console.log(`✓ ApiClient: ${apiClientId}`);
  console.log(`  secret (anote agora — não será exibido de novo): ${apiClientSecret}`);

  // -------------------------------------------------------------------------
  // Option Groups reutilizáveis
  // -------------------------------------------------------------------------
  const ogPontoCarne = await prisma.optionGroup.create({
    data: {
      unitId: unit.id,
      name: "Ponto da carne",
      isMandatory: true,
      minSelection: 1,
      maxSelection: 1,
      options: {
        create: [
          { name: "Malpassada",  priceDelta: 0, sortOrder: 1 },
          { name: "Ao ponto",    priceDelta: 0, sortOrder: 2 },
          { name: "Bem passada", priceDelta: 0, sortOrder: 3 },
        ],
      },
    },
  });

  const ogGas = await prisma.optionGroup.create({
    data: {
      unitId: unit.id,
      name: "Com ou sem gás",
      isMandatory: true,
      minSelection: 1,
      maxSelection: 1,
      options: {
        create: [
          { name: "Com gás", priceDelta: 0, sortOrder: 1 },
          { name: "Sem gás", priceDelta: 0, sortOrder: 2 },
        ],
      },
    },
  });

  const ogGelo = await prisma.optionGroup.create({
    data: {
      unitId: unit.id,
      name: "Gelo e limão",
      isMandatory: false,
      minSelection: 0,
      maxSelection: 2,
      options: {
        create: [
          { name: "Gelo",            priceDelta: 0, sortOrder: 1 },
          { name: "Limão em rodela", priceDelta: 0, sortOrder: 2 },
          { name: "Limão espremido", priceDelta: 0, sortOrder: 3 },
        ],
      },
    },
  });

  const ogCocaVariante = await prisma.optionGroup.create({
    data: {
      unitId: unit.id,
      name: "Variante da Coca",
      isMandatory: true,
      minSelection: 1,
      maxSelection: 1,
      options: {
        create: [
          { name: "Normal", priceDelta: 0, sortOrder: 1 },
          { name: "Zero",   priceDelta: 0, sortOrder: 2 },
        ],
      },
    },
  });

  console.log("✓ OptionGroups criados");

  // -------------------------------------------------------------------------
  // Cardápio — seções, categorias, itens
  // -------------------------------------------------------------------------
  const sectionBrunch = await prisma.menuSection.create({
    data: { unitId: unit.id, name: "Brunch / Lanches", sortOrder: 1 },
  });
  const sectionPratos = await prisma.menuSection.create({
    data: { unitId: unit.id, name: "Pratos Principais", sortOrder: 2 },
  });
  const sectionDoces = await prisma.menuSection.create({
    data: { unitId: unit.id, name: "Doces / Sobremesas", sortOrder: 3 },
  });
  const sectionBebidas = await prisma.menuSection.create({
    data: { unitId: unit.id, name: "Bebidas", sortOrder: 4 },
  });
  const sectionAlcoolicas = await prisma.menuSection.create({
    data: { unitId: unit.id, name: "Bebidas Alcoólicas", sortOrder: 5 },
  });
  const sectionDiversos = await prisma.menuSection.create({
    data: { unitId: unit.id, name: "Diversos", sortOrder: 6 },
  });

  const catSanduiches = await prisma.menuCategory.create({
    data: { sectionId: sectionBrunch.id, name: "Sanduíches", sortOrder: 1 },
  });
  const catAmericanBrunch = await prisma.menuCategory.create({
    data: { sectionId: sectionBrunch.id, name: "American Brunch", sortOrder: 2 },
  });
  const catCarnes = await prisma.menuCategory.create({
    data: { sectionId: sectionPratos.id, name: "Carnes", sortOrder: 1 },
  });
  const catAguaSoft = await prisma.menuCategory.create({
    data: { sectionId: sectionBebidas.id, name: "Água e Soft Drinks", sortOrder: 1 },
  });
  const subRefri = await prisma.menuSubcategory.create({
    data: { categoryId: catAguaSoft.id, name: "Refrigerantes", sortOrder: 1 },
  });
  const subAgua = await prisma.menuSubcategory.create({
    data: { categoryId: catAguaSoft.id, name: "Água", sortOrder: 2 },
  });

  // Itens
  const croqueMadame = await prisma.menuItem.create({
    data: {
      categoryId: catSanduiches.id,
      name: "Croque Madame",
      description: "Sanduíche francês com presunto, queijo gruyère e ovo por cima.",
      basePrice: 48.00,
      sortOrder: 1,
    },
  });

  const bigBreakfast = await prisma.menuItem.create({
    data: {
      categoryId: catAmericanBrunch.id,
      name: "Big Breakfast",
      description: "Dois ovos, bacon, batatas rústicas, tomate grelhado, feijão branco e tostas.",
      basePrice: 54.90,
      sortOrder: 1,
    },
  });

  const steak = await prisma.menuItem.create({
    data: {
      categoryId: catCarnes.id,
      name: "Ribeye 300g",
      description: "Corte nobre grelhado no ponto de sua preferência.",
      basePrice: 129.00,
      sortOrder: 1,
      optionGroups: {
        create: [{ optionGroupId: ogPontoCarne.id, sortOrder: 1 }],
      },
    },
  });

  const cocaCola = await prisma.menuItem.create({
    data: {
      categoryId: catAguaSoft.id,
      subcategoryId: subRefri.id,
      name: "Coca-Cola",
      description: "Lata 350 ml.",
      basePrice: 9.00,
      sortOrder: 1,
      optionGroups: {
        create: [
          { optionGroupId: ogCocaVariante.id, sortOrder: 1 },
          { optionGroupId: ogGelo.id,         sortOrder: 2 },
        ],
      },
    },
  });

  const agua = await prisma.menuItem.create({
    data: {
      categoryId: catAguaSoft.id,
      subcategoryId: subAgua.id,
      name: "Água mineral 500 ml",
      basePrice: 6.00,
      sortOrder: 1,
      optionGroups: {
        create: [
          { optionGroupId: ogGas.id,  sortOrder: 1 },
          { optionGroupId: ogGelo.id, sortOrder: 2 },
        ],
      },
    },
  });

  console.log("✓ Menu: 6 seções, 4 categorias, 2 subcategorias, 5 itens de exemplo");

  // -------------------------------------------------------------------------
  // FAQ (6 itens iniciais — adicionar o restante pelo CMS)
  // -------------------------------------------------------------------------
  const faq = [
    { category: "Identificação de mesa", question: "Como eu informo o número da minha mesa?",
      answer: "O número da mesa é identificado automaticamente pelo QR Code que você escaneou." },
    { category: "Identificação de mesa", question: "E se a minha mesa não tiver número visível?",
      answer: "Peça para a equipe informar o número correto ou a comanda associada." },
    { category: "Pagamento",             question: "Posso pagar pelo WhatsApp?",
      answer: "Não. O pagamento é feito no salão com o garçom. Solicite a conta e um atendente levará até sua mesa." },
    { category: "Pagamento",             question: "Quais formas de pagamento vocês aceitam?",
      answer: "Cartão de crédito, débito, dinheiro e Pix." },
    { category: "Funcionamento",         question: "Qual o horário de funcionamento?",
      answer: "Todos os dias, das 8h às 22h." },
    { category: "Wi-Fi",                  question: "Vocês têm Wi-Fi?",
      answer: "Sim. Peça a senha para qualquer atendente." },
  ];
  for (const [i, f] of faq.entries()) {
    await prisma.fAQItem.create({
      data: { unitId: unit.id, sortOrder: i, ...f },
    });
  }
  console.log(`✓ FAQ: ${faq.length} itens iniciais`);

  // -------------------------------------------------------------------------
  // Entradinha do dia (hoje)
  // -------------------------------------------------------------------------
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.dailyFeature.upsert({
    where: { unitId_date: { unitId: unit.id, date: today } },
    update: {},
    create: {
      unitId: unit.id,
      date: today,
      name: "Bruschetta de tomate com manjericão",
      description: "Pão italiano grelhado com tomate fresco, manjericão e azeite extravirgem.",
    },
  });
  console.log("✓ Entradinha do dia cadastrada");

  // -------------------------------------------------------------------------
  // Mesas 1–10
  // -------------------------------------------------------------------------
  for (let n = 1; n <= 10; n++) {
    await prisma.table.upsert({
      where: { unitId_number: { unitId: unit.id, number: String(n) } },
      update: {},
      create: {
        unitId: unit.id,
        number: String(n),
        qrToken: randomQrToken(),
      },
    });
  }
  console.log("✓ Mesas 1–10 criadas");

  console.log("\nSeed concluído com sucesso.");
  console.log(`\nLogin admin:     ${adminEmail} / ${adminPassword}`);
  console.log(`API client ID:   ${apiClientId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
