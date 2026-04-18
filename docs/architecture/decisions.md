# Decisões arquiteturais — VW app

Registro das decisões travadas na Fase 0 (desenho). Cada entrada tem: contexto, decisão, rationale e alternativas descartadas.

---

## ADR-001 — Contrato base: Open Delivery v1.7.0 + extensões `x-dinein`

**Contexto.** O VW app deve expor um contrato REST ao agent-hub para consulta de cardápio, registro de pedidos e operações de salão. Existem três caminhos: (a) padrão aberto de mercado, (b) contrato proprietário, (c) ambos.

**Decisão.** Adotar o Open Delivery v1.7.0 (ABRASEL) como base, com extensões proprietárias documentadas via `x-dinein: true` em paths e schemas, e namespace `/v1/ext/*` para recursos não cobertos pela spec oficial (sessões de mesa, mesas, solicitações, FAQ, entradinha, SSE de eventos). O valor `DINE_IN` é adicionado ao enum `Service.type` via extensão `x-service-type-extension`.

**Rationale.** O Open Delivery é o padrão brasileiro consolidado para integração restaurante↔marketplace. Adotá-lo: (i) facilita interoperabilidade futura com XMenu e outros POS que já falam o padrão, (ii) reusa modelagem madura de catálogo (`Merchant`, `Menu`, `Category`, `Item`, `OptionGroup`, `Option`, `Order`), (iii) alinha o vocabulário da casa ao mercado, (iv) se a ABRASEL evoluir para cobrir dine-in, nossas extensões migram naturalmente ao padrão oficial.

**Alternativas descartadas.**
- Contrato proprietário 100% customizado — perderia interop.
- Só Open Delivery sem extensões — não cobre mesa, solicitações, FAQ, entradinha.
- `serviceType: TAKEOUT` + flag `x-dineIn: true` — semanticamente torto.
- `/v1/ext/dine-in-orders` paralelo sem reusar `Order` — quebra promessa de swap com XMenu.

---

## ADR-002 — Autenticação máquina-a-máquina: OAuth2 `client_credentials`

**Contexto.** O agent-hub precisa autenticar ao chamar a API do VW. O Open Delivery exige OAuth2 `client_credentials` com escopo `od.all`.

**Decisão.** Implementar `POST /oauth/token` com OAuth2 `client_credentials`. Cada tenant do VW emite credenciais (`client_id` + `client_secret`) pela tela `/admin/integrations`. O `client_secret` é armazenado hashed (`ApiClient.clientSecretHash`). O agent-hub armazena as credenciais criptografadas no seu próprio `ClientIntegration.apiKey` (padrão já existente no `custom-tool-executor`).

**Rationale.** Aderência ao padrão Open Delivery + reuso da infra de `ClientIntegration` no agent-hub. Emitimos JWTs curtos (`expires_in: 3600`) assinados com chave por tenant.

**Alternativas descartadas.** API Key estática (menos seguro, sem expiração), mTLS (excesso de complexidade para MVP).

---

## ADR-003 — Real-time no console operacional: SSE (Server-Sent Events)

**Contexto.** O painel operacional precisa receber em tempo real novos pedidos, novas solicitações e mudanças de status.

**Decisão.** Endpoint único `GET /v1/ext/events/stream` com `Content-Type: text/event-stream`. Tipos de evento: `ORDER_CREATED`, `ORDER_CONFIRMED`, `ORDER_PREPARING`, `ORDER_CONCLUDED`, `ORDER_CANCELLED`, `REQUEST_CREATED`, `REQUEST_ACKNOWLEDGED`, `REQUEST_RESOLVED`, `REQUEST_DISMISSED`, `TABLE_OCCUPIED`, `TABLE_RELEASED`, `MENU_UPDATED`, `DAILY_FEATURE_UPDATED`. Cliente filtra os tipos que lhe interessam. Suporte a `Last-Event-ID` para replay na reconexão (buffer em memória/Redis de ~1h).

**Rationale.** Console é consumidor de eventos (unidirecional servidor→cliente). SSE é HTTP-compliant, passa por proxies/firewalls sem configuração extra, tem reconexão automática nativa no navegador e é trivial de implementar em Next.js route handler.

**Alternativas descartadas.**
- WebSocket — bidirecionalidade desnecessária; adiciona complexidade (upgrade handshake, libs, infra).
- Polling — latência alta, tráfego alto.
- Webhooks — não se aplica (o consumidor é um navegador, não outro servidor).

---

## ADR-004 — Repositório separado do agent-hub

**Contexto.** O VW app é conceitualmente independente do agent-hub (domínio restaurante vs. orquestração de IA).

**Decisão.** Repositório Git separado (`vw-app/`), deploy independente.

**Rationale.** Ciclos de release desacoplados (alterar cardápio não re-deploya o agente). Possibilidade de atribuir equipes/contribuidores distintos. Troca plug-and-play por XMenu exige que o VW seja externo ao agent-hub por definição.

**Alternativas descartadas.** Monorepo — acoplamento indesejado; `ClientIntegration` no agent-hub já supõe provedor externo.

---

## ADR-005 — Stack igual ao agent-hub

**Contexto.** Escolher stack do VW app.

**Decisão.** Next.js 16 + TypeScript + Prisma + PostgreSQL + NextAuth + Tailwind.

**Rationale.** Paridade com agent-hub → zero curva de aprendizado; dev-flow, libs, patterns e tooling (Vitest, Prisma, Next.js App Router) idênticos; facilita contratação e rotação de pessoas entre os dois projetos.

**Observação.** O `CLAUDE.md` do agent-hub alerta que Next.js 16 traz breaking changes vs. versões anteriores. Mesmo alerta vale aqui — consultar `node_modules/next/dist/docs/` antes de escrever código novo na Fase 1+.

---

## ADR-006 — Multi-tenancy desde o dia 1 (schema ready, MVP com 1 tenant)

**Contexto.** O agent-hub é multi-tenant (`Client` → `Agent`). O VW app pode ser mono ou multi-tenant.

**Decisão.** Schema multi-tenant desde o início (`Tenant`, `Unit`, `Employee.tenantId`, `UnitId` em toda entidade de domínio). MVP roda com 1 tenant ativo (Fillmore). Isolamento lógico no backend (middleware impõe `tenantId` em toda query).

**Rationale.** Custo de começar multi-tenant é baixo se feito desde o início; retrofit é caro. Todo domain data (menu, FAQ, pedidos, solicitações, staff) naturalmente isolado por unidade/tenant — é a estrutura natural.

**Alternativas descartadas.** Mono-tenant inicialmente com retrofit depois (risco alto); uma instância por cliente (complexidade operacional multiplicada).

---

## ADR-007 — Idempotência via `Idempotency-Key` header

**Contexto.** `POST /orders` e `POST /requests` podem ser retried pelo agent-hub (retry automático em caso de timeout ou erro de rede). Duplicação é inaceitável.

**Decisão.** Ambos aceitam o header `Idempotency-Key` (tipicamente o `messageId` do WhatsApp). O banco tem `@@unique([unitId, idempotencyKey])`. Segunda chamada com mesma chave retorna `200 OK` com a entidade já criada (em vez de `201 Created` do novo recurso).

**Rationale.** Padrão RFC draft-ietf-httpapi-idempotency-key; semântica clara; chave natural já existente (`messageId`).

---

## ADR-008 — W-API exclusivamente no agent-hub

**Contexto.** Quem envia mensagens WhatsApp? VW ou agent-hub?

**Decisão.** **Exclusivamente o agent-hub.** O VW app nunca chama a W-API. Dados do VW são lidos/escritos por HTTP pelo agent-hub, que então decide o que mandar ao WhatsApp.

**Rationale.** Evita duplicação de integração, credenciais e lógica de envio. O agent-hub já tem `wapi-client.ts`, rate-limiter, circuit-breaker. O VW fica simples.

---

## ADR-009 — Correlação cross-system via `agentHub*Id`

**Contexto.** Rastreabilidade entre mundos (qual conversa originou qual pedido?).

**Decisão.** Toda entidade de domínio do VW (`Order`, `Request`, `TableSession`) carrega:
- `agentHubConversationId` — id da `Conversation` no agent-hub
- `agentHubMessageId` — id da `Message` específica que disparou a ação

**Rationale.** Auditoria completa; debugging simplificado; base para relatórios futuros (ex.: "quanto tempo entre pedido verbal e confirmação?").

---

## ADR-010 — Enum `OrderStatus` restrito ao subset dine-in

**Contexto.** Open Delivery tem 14+ estados de pedido (inclui DISPATCHED, DELIVERED, PICKED_UP etc. — específicos de entrega).

**Decisão.** No contrato VW (`OrderStatusDineIn`), enum limitado a `CREATED → CONFIRMED → PREPARING → CONCLUDED | CANCELLED`. `CONCLUDED` substitui semanticamente o `DELIVERED` (pedido servido na mesa). Estados de logística são omitidos.

**Rationale.** Não faz sentido um pedido dine-in passar por `DISPATCHED`. Simplicidade operacional > aderência completa à spec.

**Trade-off.** Um consumidor Open Delivery genérico pode esperar `DELIVERED`. Documentado em `x-dinein` + descrição do enum para mitigar confusão.
