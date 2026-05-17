# Feature 001 — Cadastro de CRI

**Status:** Active
**Aberta em:** 2026-05-17
**Aprovada em:** 2026-05-17
**Fechada em:** —
**Modificada por:** —

## Objetivo

Permitir o cadastro, consulta, edição e remoção de **CRIs** (Certificados de Recebíveis Imobiliários) na base do sistema. Esta é a primeira aplicação prática da modelagem multi-tipo definida em [`002-modelagem-multi-tipo-de-ativos`](../decisions/002-modelagem-multi-tipo-de-ativos.md) (CTI: tabela `Ativo` + tabela `Cri` 1-1) e estabelece o padrão para todos os tipos de ativo seguintes.

## Escopo

### Dentro

- Modelos `Ativo` + `Cri` no banco (CTI), com os campos definidos em ADR 002.
- Enum `TipoAtivo` com valor inicial `CRI`.
- Enums `Indexador` e `TipoTaxa` (cobrindo prefixado, % do indexador e indexador + spread).
- Migration inicial do banco.
- Seed com **3 CRIs de exemplo** (`prisma db seed`) para facilitar smoke test.
- Endpoints REST CRUD em `apps/api/src/routes/cris.ts`.
- Schemas Zod compartilhados em `packages/shared/src/cri.ts` (input e output).
- CORS aberto em desenvolvimento (`@fastify/cors` permitindo `http://localhost:3000`).
- Telas em `apps/web`:
  - `/cris` — lista
  - `/cris/novo` — formulário de criação
  - `/cris/[id]` — detalhe (read-only)
  - `/cris/[id]/editar` — formulário de edição
  - Ação de deletar com confirmação (`AlertDialog` do shadcn)
- Validação consistente entre API e Web (mesmo schema Zod).

### Fora

- **Eventos de pagamento** (juros, amortização, bônus) — feature futura.
- **Cálculo de valor atual** do título (atualização por indexador).
- **Outros tipos de ativo** (LCI, LCA, CRA, FII, ações etc.).
- **Endpoint genérico `/ativos`** (cross-tipo, com filtros) — feature separada quando segundo tipo entrar.
- **Auth / multi-usuário.**
- **Histórico de mudanças / audit log.**
- **Soft delete** — remoção é definitiva (cascade na FK do `Cri`).
- **Paginação, busca e filtros** na listagem (poucos itens esperados; listar tudo basta).
- **Upload / anexos** (documentos do CRI, escrituras etc.).
- **Importação em lote** (CSV, planilha).

## Modelo de dados

### Schema Prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TipoAtivo {
  CRI
  // futuros: LCI, LCA, CRA, FII, ACAO, DEB...
}

enum Indexador {
  PREFIXADO
  CDI
  IPCA
}

enum TipoTaxa {
  PRE              // taxa fixa (ex: 12% a.a.)
  POS_PERCENTUAL   // % do indexador (ex: 102% do CDI)
  POS_SPREAD       // indexador + spread (ex: CDI + 1,45%)
}

enum Instituicao {
  INTER
  XP
  NUBANK
  GCB
  CLEAR
  SOFISA
  BMG
  VEST
}

model Ativo {
  id              String       @id @default(cuid())
  tipo            TipoAtivo
  codigo          String       @unique
  emissor         String
  instituicao     Instituicao? // nullable para retrocompat — ver BACKLOG
  quantidade      Int?         // opcional: nem sempre conhecida no cadastro inicial
  precoAquisicao  Decimal      @db.Decimal(18, 4) @map("preco_aquisicao")
  dataAquisicao   DateTime     @db.Date           @map("data_aquisicao")
  observacoes     String?      @db.Text

  criadoEm        DateTime     @default(now()) @map("criado_em")
  atualizadoEm    DateTime     @updatedAt      @map("atualizado_em")

  cri             Cri?

  @@map("ativos")
}

model Cri {
  ativoId         String     @id @map("ativo_id")
  ativo           Ativo      @relation(fields: [ativoId], references: [id], onDelete: Cascade)

  valorNominal    Decimal    @db.Decimal(18, 4) @map("valor_nominal")
  dataVencimento  DateTime   @db.Date            @map("data_vencimento")
  indexador       Indexador
  tipoTaxa        TipoTaxa                       @map("tipo_taxa")
  taxa            Decimal    @db.Decimal(8, 4)

  @@map("cris")
}
```

### Notas sobre tipos

- **`id`**: `cuid` (padrão Prisma) na `Ativo`. `Cri` usa `ativoId` como PK 1-1.
- **Valores monetários**: `Decimal(18,4)` → `numeric(18,4)` no Postgres.
- **Taxa**: `Decimal(8,4)` (ex: `6.5000` para 6,5% a.a., ou `102.0000` para 102% do CDI).
- **Datas**: `@db.Date` (sem hora).
- **Enums**: nativos no Postgres via Prisma.
- **Cascade**: deletar `Ativo` apaga automaticamente a linha de `Cri` ligada.
- **`instituicao`**: enum nativo. Nullable no banco para preservar registros anteriores à introdução do campo; **obrigatório** no schema Zod (API rejeita criação/atualização sem). BACKLOG inclui tornar NOT NULL no futuro.
- **`quantidade`**: opcional. Quando não preenchido, lista exibe `—` na coluna e em "Investido total".

### Regras de consistência indexador × tipoTaxa

| `indexador` | `tipoTaxa` permitidos | Interpretação de `taxa` |
|---|---|---|
| `PREFIXADO` | `PRE` | % a.a. fixo (ex: `12.0` = 12% a.a.) |
| `CDI` | `POS_PERCENTUAL` | % do CDI (ex: `102.0` = 102% do CDI) |
| `CDI` | `POS_SPREAD` | spread sobre CDI em pontos % (ex: `1.45` = CDI + 1,45%) |
| `IPCA` | `POS_SPREAD` | spread sobre IPCA em pontos % (ex: `6.5` = IPCA + 6,5%) |
| `IPCA` | `POS_PERCENTUAL` | tecnicamente válido, mas raríssimo no mercado |

Validações cruzadas (Zod):
- `indexador = PREFIXADO` ⇔ `tipoTaxa = PRE`.
- `indexador ∈ {CDI, IPCA}` ⇒ `tipoTaxa ∈ {POS_PERCENTUAL, POS_SPREAD}`.

## Contratos de API

Base: `http://localhost:3001` (porta da `apps/api`, definida no `.env`).

CORS aberto para `http://localhost:3000` em desenvolvimento.

Convenções:
- Request/response em JSON.
- Decimais transitam como **string** (`"1234.5678"`) para evitar perda de precisão.
- Erros de validação retornam `400` com `{ "error": "validation", "issues": [...] }` (formato Zod).
- ID inexistente retorna `404` com `{ "error": "not_found" }`.
- Conflito de `codigo` único retorna `409` com `{ "error": "conflict", "field": "codigo" }`.

### `GET /cris`

Lista todos os CRIs com seus dados completos (JOIN entre `Ativo` e `Cri`).

**Response 200:**
```json
[
  {
    "id": "clx...",
    "codigo": "CRI23A001",
    "emissor": "Securitizadora X SA",
    "instituicao": "XP",
    "quantidade": 5,
    "precoAquisicao": "987.5000",
    "dataAquisicao": "2024-03-15",
    "observacoes": null,
    "valorNominal": "1000.0000",
    "dataVencimento": "2030-03-15",
    "indexador": "IPCA",
    "tipoTaxa": "POS_SPREAD",
    "taxa": "6.5000",
    "criadoEm": "2026-05-17T12:00:00.000Z",
    "atualizadoEm": "2026-05-17T12:00:00.000Z"
  }
]
```

Ordenação: `criadoEm DESC`.

### `GET /cris/:id`

Retorna um CRI por id (id do `Ativo`). `404` se não existir ou se não for do tipo `CRI`.

### `POST /cris`

Cria um CRI. Executa em **transação Prisma**: insere `Ativo` (com `tipo=CRI`) e `Cri` atomicamente.

**Request body:**
```json
{
  "codigo": "CRI23A001",
  "emissor": "Securitizadora X SA",
  "instituicao": "XP",
  "quantidade": 5,
  "precoAquisicao": "987.5",
  "dataAquisicao": "2024-03-15",
  "observacoes": null,
  "valorNominal": "1000",
  "dataVencimento": "2030-03-15",
  "indexador": "IPCA",
  "tipoTaxa": "POS_SPREAD",
  "taxa": "6.5"
}
```

`instituicao` é obrigatório; aceita um dos valores do enum `Instituicao`.
`quantidade` é opcional; pode ser `null` ou ausente.

**Response 201:** objeto completo (mesmo formato do `GET /cris/:id`).

### `PUT /cris/:id`

Atualiza todos os campos do CRI (substituição completa). Mesmo body do `POST`. Também transacional. Retorna `200` com objeto atualizado.

> **Decisão:** `PUT` no MVP por simplicidade — formulário sempre envia todos os campos. Migrar pra `PATCH` se aparecer edição parcial.

### `DELETE /cris/:id`

Remove o `Ativo` (a linha de `Cri` desaparece por cascade). Retorna `204` sem body. `404` se não existir.

## Telas

### `/cris` — Lista

Tabela com colunas: **Código**, **Emissor**, **Remuneração** (string derivada — ver abaixo), **Vencimento**, **Quantidade**, **Investido total** (= `quantidade × precoAquisicao`).

- Header com botão "Novo CRI" (`→ /cris/novo`).
- Cada linha clicável → `/cris/[id]`.
- Estado vazio: mensagem ("Nenhum CRI cadastrado ainda") + CTA para criar.

**Coluna "Remuneração"** — derivada de `indexador + tipoTaxa + taxa`:

| Combinação | Exibido como |
|---|---|
| `PREFIXADO` + `PRE` + `12` | `12,00% a.a.` |
| `CDI` + `POS_PERCENTUAL` + `102` | `102,00% do CDI` |
| `CDI` + `POS_SPREAD` + `1.45` | `CDI + 1,45%` |
| `IPCA` + `POS_SPREAD` + `6.5` | `IPCA + 6,50%` |

### `/cris/novo` e `/cris/[id]/editar` — Formulário

Mesmo componente em ambos os modos. Campos:

| Campo | Componente | Validação |
|---|---|---|
| Código | Input texto | obrigatório, 1–50 chars |
| Emissor | Input texto | obrigatório, 1–200 chars |
| **Instituição** | Select (enum `Instituicao`) | obrigatório |
| **Remuneração** | Select único (4 presets) | obrigatório — ver abaixo |
| Taxa | Input numérico | obrigatório (semântica varia conforme remuneração) |
| Valor nominal (R$) | Input numérico | obrigatório, > 0 |
| Quantidade | Input numérico inteiro | **opcional**, > 0 quando preenchido |
| Preço de aquisição unitário (R$) | Input numérico | obrigatório, > 0 |
| Data de aquisição | DatePicker (calendário + input por teclado) | obrigatório |
| Data de vencimento | DatePicker (calendário + input por teclado) | obrigatório, > data de aquisição |
| Observações | Textarea | opcional, ≤ 1000 chars |

**DatePicker** aceita digitação direta nos formatos `dd/mm/yyyy` e `dd-mm-yyyy` (parseados via date-fns) e mantém o calendário acessível via ícone à direita do input.

**Select "Remuneração"** mapeia para `(indexador, tipoTaxa)`:

| Opção exibida | indexador | tipoTaxa | Label do input "Taxa" |
|---|---|---|---|
| Prefixado | `PREFIXADO` | `PRE` | `% a.a.` |
| % do CDI | `CDI` | `POS_PERCENTUAL` | `% do CDI` |
| CDI + spread | `CDI` | `POS_SPREAD` | `+ % a.a.` |
| IPCA + spread | `IPCA` | `POS_SPREAD` | `+ % a.a.` |

O label do campo "Taxa" muda conforme a opção selecionada para guiar o usuário.

- Botões: **Salvar** e **Cancelar** (volta para `/cris` ou `/cris/[id]` no modo edição).
- Erros de validação aparecem abaixo de cada campo.
- Erro `409` (código duplicado) aparece como erro do campo `codigo`.

### `/cris/[id]` — Detalhe

Card read-only com todos os campos. Header com:
- Botão **Editar** (`→ /cris/[id]/editar`).
- Botão **Deletar** que abre `AlertDialog` de confirmação.
- Após delete bem-sucedido, redireciona para `/cris` com toast "CRI removido".

## Validações e regras de negócio

Centralizadas em schemas Zod em `packages/shared/src/cri.ts`, consumidas por:
- API: validação do body em `POST` e `PUT`.
- Web: `react-hook-form` + `@hookform/resolvers/zod`.

Regras-chave:
- `codigo` único na base.
- `dataVencimento > dataAquisicao`.
- `valorNominal`, `precoAquisicao` estritamente positivos.
- `quantidade` estritamente positiva **quando preenchida** (opcional).
- `instituicao` obrigatória (enum).
- `taxa ≥ 0` (limite superior depende do `tipoTaxa`; sem teto rígido, mas avisar no UI se `> 200`).
- Consistência indexador × tipoTaxa (ver tabela acima).

Decimais transitados como string no JSON; Zod aceita string que valide como número decimal e converte para `Prisma.Decimal` no backend.

## Seed (`apps/api/prisma/seed.ts`)

Popula a base com **3 CRIs de exemplo** representando os 3 formatos de remuneração mais comuns:

1. **CRI prefixado** — `CRI23A001`, prefixado 12% a.a.
2. **CRI CDI + spread** — `CRI24B001`, CDI + 1,45%.
3. **CRI IPCA + spread** — `CRI22C001`, IPCA + 6,5%.

Script idempotente: se o `codigo` já existir, pula. Roda via `pnpm --filter api db:seed`.

## Critérios de aceitação

- [ ] `pnpm db:up` sobe Postgres; `pnpm --filter api prisma migrate dev` aplica migration sem erro.
- [ ] `pnpm --filter api db:seed` popula 3 CRIs idempotentemente.
- [ ] `GET /cris` em base vazia retorna `[]`; com seed retorna 3 itens ordenados por `criadoEm DESC`.
- [ ] `POST /cris` com body válido cria `Ativo` + `Cri` atomicamente e retorna `201`.
- [ ] `POST /cris` com body inválido retorna `400` com lista de issues por campo (inclui violação de consistência indexador×tipoTaxa).
- [ ] `POST /cris` com `codigo` duplicado retorna `409`.
- [ ] `GET /cris/:id` retorna o registro completo; `404` se id inexistente.
- [ ] `PUT /cris/:id` atualiza atomicamente e devolve o objeto novo.
- [ ] `DELETE /cris/:id` retorna `204` e remove `Ativo` + `Cri` por cascade.
- [ ] Telas funcionam: criar, listar, ver detalhe, editar, deletar com confirmação.
- [ ] Select "Remuneração" muda o label do input de taxa dinamicamente.
- [ ] Lista exibe coluna "Remuneração" no formato derivado correto para cada uma das 3 combinações.
- [ ] Datas em `dd/MM/yyyy`; valores monetários em `R$ 1.234,56`.
- [ ] CORS permite chamadas de `http://localhost:3000` em dev.
- [ ] Campo Instituição salva e edita corretamente; API rejeita criação sem instituição (Zod).
- [ ] Quantidade pode ser deixada em branco no formulário; lista exibe `—` na coluna e em "Investido total" para registros sem quantidade.
- [ ] DatePicker aceita digitação direta em `dd/mm/yyyy` e `dd-mm-yyyy` e mantém o calendário funcional via ícone.

## Validação (preencher no smoke test final)

_(preencher na Etapa 5)_

## Pendências geradas

_(preencher conforme aparecerem; ao fechar a spec, mover para `BACKLOG.md` ou abrir spec própria)_
