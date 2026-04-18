# VW app — Screen Map

Mapa textual das telas do MVP. Serve como briefing funcional para designer e guia para o implementador. **Não** substitui wireframes visuais — apenas define layout macro, regiões, campos e ações por tela.

Convenções:

- `[ texto ]` → botão
- `{ campo }` → input
- `( opção )` → radio/checkbox
- `→ /rota` → destino da navegação
- `SSE` → conteúdo atualizado em tempo real via `GET /v1/ext/events/stream`

---

## Mapa de navegação

```
/login
   │
   ▼ (após autenticar)
/dashboard ───────────────────────┐
   │                              │
   ├─ Operacional                 │
   │    ├─ /ops/orders           (SSE, role: ADMIN | OPERATOR)
   │    ├─ /ops/requests         (SSE, role: ADMIN | OPERATOR)
   │    └─ /ops/tables           (role: ADMIN | OPERATOR)
   │
   ├─ Cadastros (CMS)            (role: ADMIN)
   │    ├─ /cms/menu
   │    │    ├─ /cms/menu/sections/:id
   │    │    ├─ /cms/menu/categories/:id
   │    │    └─ /cms/menu/items/:id
   │    ├─ /cms/option-groups
   │    ├─ /cms/faq
   │    └─ /cms/daily-feature
   │
   └─ Administração              (role: ADMIN)
        ├─ /admin/employees
        ├─ /admin/units
        └─ /admin/integrations   (credenciais OAuth2 para agent-hub)
```

---

## S1 — Login (`/login`)

Público. Sem header/sidebar.

```
┌─────────────────────────────────────────────┐
│                                             │
│              [ logo VW app ]                │
│                                             │
│              Entrar na unidade              │
│                                             │
│      Email      : { email@restaurante.com } │
│      Senha      : { ******************** }  │
│                                             │
│                       [ Entrar ]            │
│                                             │
│            Esqueceu a senha?                │
│                                             │
└─────────────────────────────────────────────┘
```

- Erro de credencial → mensagem inline abaixo dos campos.
- Após autenticar: redireciona para `/dashboard`.
- Token JWT armazenado em cookie httpOnly.

---

## S2 — Dashboard (`/dashboard`)

Autenticado. Landing page comum a todos os roles.

Layout padrão da aplicação (aplicado a todas as telas a partir daqui):

```
┌────────────┬──────────────────────────────────────────────┐
│            │ [unidade ▾ Fillmore Ipiranga]   [ sino 3 ]   │
│  VW app    │                                  { mauro ▾ } │
│            ├──────────────────────────────────────────────┤
│ > Dash     │                                              │
│   Ops      │          conteúdo da tela aqui               │
│    Pedidos │                                              │
│    Solicit │                                              │
│    Mesas   │                                              │
│   CMS      │                                              │
│    Menu    │                                              │
│    Option  │                                              │
│    FAQ     │                                              │
│    Entrada │                                              │
│   Admin    │                                              │
│    Staff   │                                              │
│    Unidad  │                                              │
│    Integr. │                                              │
│            │                                              │
│  [ sair ]  │                                              │
└────────────┴──────────────────────────────────────────────┘
```

Conteúdo do Dashboard:

- **Cards de resumo (hoje)**: pedidos abertos, solicitações abertas, mesas ocupadas, ticket médio do dia.
- **Feed ao vivo (últimos 20 eventos)** via SSE: mistura pedidos e solicitações recém-criados.
- Role `OPERATOR` vê só o feed e os cards; não vê cards de receita/ticket.
- Seletor de unidade (topo direita) aparece se o usuário tem acesso a mais de uma unidade.

---

## S3 — Operacional › Pedidos (`/ops/orders`)  *[SSE]*

Target principal do dia a dia operacional.

```
┌──────────────────────────────────────────────────────────┐
│ Pedidos                                                  │
│ [Filtros: status ▾] [mesa ▾] [desde ▾]         [ ⟳ SSE ] │
├──────────────────────────────────────────────────────────┤
│ Fila em tempo real (colunas por status)                  │
│                                                          │
│ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐     │
│ │CREATED 4│ │CONFIRM. 2│ │PREPAR. 3 │ │CONCLUDED   │     │
│ │         │ │          │ │          │ │  (últimos) │     │
│ │ [card]  │ │ [card]   │ │ [card]   │ │ [card]     │     │
│ │ [card]  │ │ [card]   │ │ [card]   │ │            │     │
│ │ [card]  │ │          │ │ [card]   │ │            │     │
│ │ [card]  │ │          │ │          │ │            │     │
│ └─────────┘ └──────────┘ └──────────┘ └────────────┘     │
└──────────────────────────────────────────────────────────┘
```

Card de pedido (todos os status):

```
┌──────────────────────────────────┐
│ #A1F3  •  Mesa 12       14:32    │
│ ────────────────────────────     │
│ 1x Croque Madame                 │
│ 1x Coca-Cola Zero (só gelo)      │
│ Obs.: sem pimenta                │
│ ────────────────────────────     │
│ Total: R$ 54,90                  │
│ [ Confirmar ]  [ Cancelar ]      │
└──────────────────────────────────┘
```

- Novos pedidos aparecem com highlight + som de notificação (configurável por usuário).
- Ações no card avançam o status (`POST /v1/orders/{id}/confirm` → `preparing` → `concluded`).
- Clique no card → drawer lateral com detalhes completos e histórico.

---

## S4 — Operacional › Solicitações (`/ops/requests`)  *[SSE]*

```
┌──────────────────────────────────────────────────────────┐
│ Solicitações                                             │
│ [Filtros: status ▾] [tipo ▾] [mesa ▾]           [ ⟳ SSE ]│
├──────────────────────────────────────────────────────────┤
│ Inbox cronológica (mais recente no topo)                 │
│                                                          │
│ ● OPEN      CALL_WAITER    Mesa 7    há 1 min            │
│   "Cliente quer fazer uma pergunta."                     │
│   [ Assumir ]  [ Resolver ]  [ Dispensar ]               │
│                                                          │
│ ● OPEN      CHECK          Mesa 3    há 4 min            │
│   "Cliente pediu a conta."                               │
│   [ Assumir ]  [ Resolver ]  [ Dispensar ]               │
│                                                          │
│ ○ IN_PROG.  PHYSICAL_MENU  Mesa 12   há 8 min            │
│   Responsável: João (Operador)                           │
│   [ Resolver ]                                           │
└──────────────────────────────────────────────────────────┘
```

- Badge colorido por tipo (cor semântica: CALL_WAITER=azul, CHECK=verde, COMPLAINT=vermelho etc.).
- Assumir → `PATCH /requests/{id}` com `status: IN_PROGRESS` e `assignedToEmployeeId`.
- Resolver → drawer pede `resolutionNotes` opcional.

---

## S5 — Operacional › Mesas (`/ops/tables`)

```
┌──────────────────────────────────────────────────────────┐
│ Mesas                                  [+ Nova mesa]     │
├──────────────────────────────────────────────────────────┤
│  Grid visual                                             │
│                                                          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                      │
│  │ 01 │ │ 02 │ │ 03 │ │ 04 │ │ 05 │                      │
│  │ 🟢 │ │ 🔴 │ │ 🟢 │ │ 🟡 │ │ 🟢 │                      │
│  └────┘ └────┘ └────┘ └────┘ └────┘                      │
│   livre  ocup. livre  reser. livre                       │
│                                                          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                      │
│  │ 06 │ │ 07 │ │ 08 │ │ 09 │ │ 10 │ ...                  │
│  └────┘ └────┘ └────┘ └────┘ └────┘                      │
└──────────────────────────────────────────────────────────┘
```

- Clique em mesa ocupada → drawer com sessão ativa (duração, pedidos, solicitações, telefone do cliente, link p/ conversa).
- Nova mesa → modal com `{número}`, `{label opcional}`; ao salvar, sistema gera `qrToken` e oferece download do QR em PDF.

---

## S6 — CMS › Menu (`/cms/menu`)

Vista em árvore editável, três níveis:

```
┌──────────────────────────────────────────────────────────┐
│ Cardápio                             [+ Nova seção]      │
├──────────────────────────────────────────────────────────┤
│ ▼ Brunch / Lanches                        [✎] [⋮]        │
│   ▼ American Brunch                       [✎] [⋮]        │
│     ▸ Big Breakfast                 R$ 54,90  [✎] [⋮]    │
│     ▸ Eggs Benedict                 R$ 48,00  [✎] [⋮]    │
│   ▸ Sanduíches (8 itens)                  [✎] [⋮]        │
│   ▸ Salgados (6 itens)                    [✎] [⋮]        │
│                                                          │
│ ▼ Bebidas                                 [✎] [⋮]        │
│   ▼ Cafés                                 [✎] [⋮]        │
│     ▸ Espressos (4 itens)                                │
│     ▸ Métodos Filtrados (3 itens)                        │
│   ▸ Chás (5 itens)                                       │
└──────────────────────────────────────────────────────────┘
```

- Drag-and-drop para reordenar (gera `sortOrder`).
- Ícone de olho p/ alternar `isAvailable`.
- Item/categoria/seção com `agentInstructions` → editor de texto livre.

### S6.1 — Editor de item (`/cms/menu/items/:id`)

Form:

```
┌──────────────────────────────────────────────────────────┐
│ Editar item                                              │
├──────────────────────────────────────────────────────────┤
│ Nome            : { Croque Madame           }            │
│ Categoria       : [ Sanduíches           ▾ ]             │
│ Subcategoria    : [ (opcional)           ▾ ]             │
│ Descrição       : { textarea longo        }              │
│ Imagem          : [ upload | URL ]                       │
│ Preço base      : R$ { 48,00 }                           │
│ EAN             : { opcional }                           │
│ Disponível      : ( x ) sim   ( ) não                    │
│                                                          │
│ Instruções para o agente (opcional)                      │
│ { textarea: ex. "Perguntar se deseja ovo extra." }       │
│                                                          │
│ ── Option groups vinculados ─────────────────────        │
│   [+] Associar option group existente                    │
│   • Ponto do ovo (obrigatório)             [remover]     │
│   • Pão (opcional)                         [remover]     │
│                                                          │
│           [ Cancelar ]        [ Salvar ]                 │
└──────────────────────────────────────────────────────────┘
```

---

## S7 — CMS › Option Groups (`/cms/option-groups`)

Gerencia grupos de opções reutilizáveis (ex.: "Ponto da carne", "Tamanho").

```
┌──────────────────────────────────────────────────────────┐
│ Option Groups                    [+ Novo grupo]          │
├──────────────────────────────────────────────────────────┤
│ Nome               | Obrigat. | Min-Max | Itens vinc. |  │
│ Ponto da carne     |   sim    |  1-1    |     8      |⋮ │
│ Tamanho            |   sim    |  1-1    |    12      |⋮ │
│ Gelo               |   não    |  0-1    |    18      |⋮ │
│ Adicionais do café |   não    |  0-3    |     4      |⋮ │
└──────────────────────────────────────────────────────────┘
```

Editor de grupo: nome, min/max/mandatory, lista de `Option` (nome, `priceDelta`, disponibilidade, ordem).

---

## S8 — CMS › FAQ (`/cms/faq`)

```
┌──────────────────────────────────────────────────────────┐
│ FAQ                                         [+ Nova]     │
│ Categoria: [ todas ▾ ]                                   │
├──────────────────────────────────────────────────────────┤
│ ▼ Como identificar a mesa/comanda  (7 itens)  [✎]        │
│   • Como eu informo o número da minha mesa? [✎][✕]       │
│   • Onde encontro o número da mesa/comanda? [✎][✕]       │
│   ...                                                    │
│                                                          │
│ ▼ Pagamento                         (4 itens)  [✎]       │
│ ▼ Funcionamento                     (6 itens)  [✎]       │
└──────────────────────────────────────────────────────────┘
```

Editor de item FAQ: `category` (dropdown + "criar categoria"), `question`, `answer`, `sortOrder`, `isPublished`.

---

## S9 — CMS › Entradinha (`/cms/daily-feature`)

```
┌──────────────────────────────────────────────────────────┐
│ Entradinha do dia                                        │
├──────────────────────────────────────────────────────────┤
│ Hoje (17/04/2026)                                        │
│                                                          │
│ Nome        : { Bruschetta de tomate com manjericão    } │
│ Descrição   : { Pão italiano grelhado com tomate ...   } │
│ Ativa hoje  : ( x ) sim                                  │
│                                                          │
│                [ Salvar para hoje ]                      │
│                                                          │
│ ── Próximos dias ─────────────────────────────────       │
│ 18/04 — (vazio)              [+ cadastrar]               │
│ 19/04 — (vazio)              [+ cadastrar]               │
│                                                          │
│ ── Histórico (últimos 7 dias) ────────────────────       │
│ 16/04  Canoa de pepino                                   │
│ 15/04  Mini caprese                                      │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

---

## S10 — Admin › Staff (`/admin/employees`)

Apenas `ADMIN`.

```
┌──────────────────────────────────────────────────────────┐
│ Staff                                  [+ Novo usuário]  │
├──────────────────────────────────────────────────────────┤
│ Nome         | Email              | Role     | Unidades  │
│ Mauro        | mauro@…            | ADMIN    | todas     │
│ João Silva   | joao@restaurante…  | OPERATOR | Ipiranga  │
│ Maria Souza  | maria@restaurante… | OPERATOR | Ipiranga  │
└──────────────────────────────────────────────────────────┘
```

Editor: `{name}`, `{email}`, `{password}` (opcional em edição), `role`, multiselect de unidades.

---

## S11 — Admin › Unidades (`/admin/units`)

```
┌──────────────────────────────────────────────────────────┐
│ Unidades                               [+ Nova unidade]  │
├──────────────────────────────────────────────────────────┤
│ Nome               | Endereço          | Telefone   |⋮   │
│ Fillmore Ipiranga  | Av. Nazaré, 1732… | 1199119…   |⋮   │
└──────────────────────────────────────────────────────────┘
```

Editor da unidade: todos os campos `BasicInfo` do Open Delivery + `operatingHours` (grade por dia da semana) + `agentHubAgentId`.

---

## S12 — Admin › Integrações (`/admin/integrations`)

Gerencia credenciais OAuth2 usadas pelo agent-hub (ou outros consumidores) para acessar a API do VW.

```
┌──────────────────────────────────────────────────────────┐
│ Integrações (API clients)     [+ Gerar nova credencial]  │
├──────────────────────────────────────────────────────────┤
│ Nome                 | Client ID    | Último uso   |⋮    │
│ agent-hub prod       | vw_1234…     | há 2 min     |⋮    │
│ agent-hub staging    | vw_abcd…     | há 1 dia     |⋮    │
└──────────────────────────────────────────────────────────┘
```

Gerar credencial → modal exibe `client_id` + `client_secret` **uma única vez** (secret é hashed no banco). Opção [revogar].

---

## Comportamentos transversais

- **Layout**: responsivo (mobile / tablet / desktop). Sidebar colapsa em hamburguer < 768px.
- **Notificações**: badge no sino do header + toast no canto inferior direito (novos pedidos / solicitações).
- **SSE**: reconexão automática com `Last-Event-ID`; indicador "🟢 tempo real" / "🔴 desconectado" no header.
- **Empty states**: quando não há pedidos/solicitações, mostrar mensagem acolhedora + ilustração simples.
- **Idioma**: somente PT-BR no MVP.
- **Moeda**: formato BRL (R$ XX,XX) em todos os valores.
- **Timezone**: converter timestamps para o `timezone` da unidade antes de exibir.
- **Acessibilidade**: WCAG AA básico (contraste, labels, navegação por teclado).
