# VW app

Backend + frontend do domínio **restaurante** (cardápio, FAQ, entradinha, mesas, pedidos, solicitações) consumido pelo agente de IA **Phil** hospedado no `agent-hub`.

Parte do programa de migração do garçom virtual (Virtual Waiter) de uma automação N8N para a plataforma Arklab `agent-hub`, com contrato API-first compatível com o padrão [Open Delivery v1.7.0 (ABRASEL)](https://github.com/Abrasel-Nacional/opendelivery) estendido com extensões `x-dinein` para o caso de uso de consumo no salão.

## Papel no ecossistema

```
┌──────────────────────┐      ┌─────────────────────────────┐
│     agent-hub        │ →→→  │ Integração "RestaurantPOS"  │
│ (plataforma genérica │      │  (contrato único via REST)  │
│   de agentes)        │      └────────────┬────────────────┘
│                      │                   │
│  - Phil (agente)     │      ┌────────────┴──────────────┐
│  - Tools via contrato│      │                           │
│  - Conversations     │      ▼                           ▼
│  - WhatsApp I/O      │   [VW app — MVP]         [XMenu — v2]
└──────────────────────┘
```

- O **VW app** (este repo) implementa o contrato para o cliente Fillmore no MVP.
- O **XMenu** (POS futuro do cliente) implementará o mesmo contrato e substituirá o VW app transparentemente.
- O **agent-hub** nunca acessa banco do VW diretamente — sempre via API REST do contrato.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript 5** (strict)
- **Prisma 7** + **PostgreSQL** (adapter `@prisma/adapter-pg`)
- **NextAuth 5 (beta)** — auth staff interno, roles `ADMIN` | `OPERATOR`
- **OAuth2 `client_credentials`** para máquina-a-máquina (agent-hub → VW)
- **SSE** (Server-Sent Events) para o console operacional em tempo real
- **Tailwind 4** (via `@tailwindcss/postcss`, sem arquivo `tailwind.config.*`)
- **Zod** para validação
- **Vitest** para testes

## Status

**Fase 1.0 — Scaffolding (em andamento).**
Esta fase entregou o skeleton runnable da aplicação. Próximas fases adicionarão auth, endpoints públicos do contrato e o CMS.

### Estrutura atual

```
vw-app/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── prisma.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── docker-compose.yml            # Postgres local
├── .env.example
├── .gitignore
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # placeholder
│   ├── globals.css               # Tailwind 4
│   └── api/
│       └── health/route.ts       # GET /api/health
├── lib/
│   ├── prisma.ts                 # Prisma singleton (adapter Postgres)
│   └── env.ts                    # Validação de env com Zod
├── prisma/
│   ├── schema.prisma             # 20 models + enums + índices
│   └── seed.ts                   # Dados de exemplo Fillmore
└── docs/
    ├── api/openapi.yaml          # Contrato Open Delivery + x-dinein
    ├── architecture/decisions.md # ADRs
    └── wireframes/screen-map.md  # Telas (texto)
```

## Setup local — primeira vez

Pré-requisitos:

- Node.js 20+
- Docker (para Postgres local) — ou um Postgres remoto (Neon, Supabase etc.)
- npm / pnpm / yarn

```bash
# 1) Clonar e instalar
cd C:\Arklab\vw-app
npm install

# 2) Subir Postgres local (porta 5433, para não conflitar com outros serviços)
docker-compose up -d

# 3) Copiar .env.example e preencher
cp .env.example .env.local
# Gerar segredos:
#   openssl rand -base64 48      -> NEXTAUTH_SECRET
#   openssl rand -base64 48      -> OAUTH_JWT_SECRET
#   openssl rand -hex 32         -> ENCRYPTION_KEY

# 4) Gerar cliente Prisma e rodar primeira migration
npm run db:generate
npm run db:migrate     # cria tabelas a partir do schema

# 5) Popular com dados do Fillmore
npm run seed
# Anote o client_secret do ApiClient exibido — não será mostrado de novo.

# 6) Subir o dev server
npm run dev
# -> http://localhost:3001
# -> http://localhost:3001/api/health   (sanity check)
```

**Credenciais padrão do admin** (configuráveis em `.env.local`):

- Email: `admin@fillmore.com.br`
- Senha: `senha1234`

## Scripts

| Comando | Efeito |
|---|---|
| `npm run dev`         | Dev server (Turbopack) em `:3001` |
| `npm run build`       | Build de produção |
| `npm run start`       | Start do build (após `npm run build`) |
| `npm run db:generate` | Gera o Prisma Client TypeScript |
| `npm run db:migrate`  | Cria/aplica migrations em dev |
| `npm run db:push`     | Sincroniza schema sem migration (rápido, **não use em prod**) |
| `npm run db:studio`   | UI visual do banco (`http://localhost:5555`) |
| `npm run seed`        | Popula banco com dados do Fillmore |
| `npm run lint`        | ESLint |
| `npm test`            | Vitest |

## Plano de execução

| Fase | Escopo | Estimativa |
|---|---|---|
| 0 | OpenAPI + Prisma + wireframes | 3–5 d — **concluído** |
| 1.0 | Scaffolding Next.js + Prisma + seed | 1–2 d — **em andamento** |
| 1.1 | Auth staff (NextAuth + login) | 2–3 d |
| 1.2 | Endpoints do contrato (leitura: merchant, menu, faq, daily-feature, oauth) | 3–4 d |
| 1.3 | CMS frontend (menu, FAQ, entradinha, staff, integrações) | 4–5 d |
| 2 | Console operacional + SSE + mesas + pedidos + solicitações | 5–7 d |
| 3 | Integração no agent-hub (requer autorização explícita para tocar no agent-hub) | 10–14 d |
| 4 | Cutover e desligamento do N8N | 3–5 d |
| 5 (futura) | Adapter XMenu contra o mesmo contrato | — |

## Artefatos de desenho

| Arquivo | Conteúdo |
|---|---|
| [docs/api/openapi.yaml](docs/api/openapi.yaml) | Contrato OpenAPI 3.0.3 — Open Delivery + extensões `x-dinein` |
| [docs/architecture/decisions.md](docs/architecture/decisions.md) | 10 ADRs com rationale |
| [docs/wireframes/screen-map.md](docs/wireframes/screen-map.md) | 12 telas com layout textual |
| [prisma/schema.prisma](prisma/schema.prisma) | 20 models + enums + índices |
