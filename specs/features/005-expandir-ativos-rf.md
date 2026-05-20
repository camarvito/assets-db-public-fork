# Feature 005 — Expandir ativos: CRA, LCI, LCA + listagem unificada

**Status:** Draft
**Aberta em:** 2026-05-19
**Aprovada em:** —
**Fechada em:** —
**Modificada por:** —

## Objetivo

Adicionar suporte aos 3 outros tipos de título de renda fixa que o usuário opera (CRA, LCI, LCA), aplicando a modelagem CTI de 3 níveis definida em [ADR 003](../decisions/003-cti-3-niveis-renda-fixa.md), e introduzir uma página `/ativos` unificada que substitui `/cris` como o ponto de entrada para visualizar o portfólio.

Esta feature é estrutural — toca schema, API, schemas Zod e Web. CRIs existentes na base devem sobreviver à migration sem perda de dados.

## Escopo

### Dentro

- **Schema:** introduzir `AtivoRendaFixa`, criar `Cra`/`Lci`/`Lca`, repartir colunas existentes entre os 3 níveis.
- **Migration de dados:** CRIs já cadastrados migram para o novo schema sem mexer em UUIDs.
- **Shared (Zod):** schemas refatorados em `packages/shared` em uma estrutura por nível (`Ativo`, `AtivoRendaFixa`, `Cri`/`Cra`/`Lci`/`Lca`).
- **API:**
  - Endpoints CRUD por tipo: `/cris`, `/cras`, `/lcis`, `/lcas`.
  - Endpoint de listagem unificada: `GET /ativos` com filtros opcionais.
  - Endpoint de detalhe unificado: `GET /ativos/:id` (retorna ativo + camada RF + camada tipo).
  - Eventos migrados de `/cris/:id/eventos` para `/ativos/:id/eventos` (já que `Evento` referencia `Ativo`, não `Cri`).
- **Web:**
  - `/ativos` (nova): listagem unificada com filtro por tipo + dropdown "Novo" → escolhe tipo → vai pra `/cris/novo` etc.
  - `/cris`, `/cras`, `/lcis`, `/lcas`: cada um com sua tela de criação (`/{tipo}/novo`), detalhe (`/{tipo}/[id]`) e edição (`/{tipo}/[id]/editar`).
  - Card de eventos no detalhe de cada tipo (mesmo componente, parametrizado por `ativoId`).
  - Navegação principal aponta para `/ativos`. `/cris` (lista) deixa de existir.
- **Seed:** 1 exemplo de cada novo tipo, mantendo os 3 CRIs atuais.

### Fora

- **Renda variável** (FII, ações). ADR 003 já preparou o terreno; não é escopo desta feature.
- **Novos tipos de evento.** `JUROS` e `AMORTIZACAO` cobrem os 4 tipos conforme conversado.
- **Cálculo de rentabilidade / projeção de eventos futuros.** Fora.
- **Endpoint `PUT /ativos/:id` genérico.** Update vai pelo endpoint do tipo (`PUT /cris/:id`, etc.). Mais explícito.
- **Endpoint `POST /ativos` genérico.** Mesmo motivo — create é por tipo.
- **Auth, audit log, importação em lote.**

## Modelo de dados

### Enums

```prisma
enum TipoAtivo {
  CRI
  CRA   // novo
  LCI   // novo
  LCA   // novo
}
```

`Indexador`, `TipoTaxa`, `Instituicao`, `TipoEvento`, `PeriodicidadeJuros` permanecem como estão.

### Tabelas

```prisma
model Ativo {
  id           String      @id @default(cuid())
  tipo         TipoAtivo
  codigo       String      @unique
  nome         String
  instituicao  Instituicao
  observacoes  String?     @db.Text

  precoAquisicao Decimal   @db.Decimal(18, 4) @map("preco_aquisicao")
  dataAquisicao  DateTime  @db.Date           @map("data_aquisicao")

  criadoEm     DateTime @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt      @map("atualizado_em")

  rendaFixa AtivoRendaFixa?
  eventos   Evento[]

  @@map("ativos")
}

model AtivoRendaFixa {
  ativoId String @id @map("ativo_id")
  ativo   Ativo  @relation(fields: [ativoId], references: [id], onDelete: Cascade)

  dataVencimento     DateTime            @db.Date @map("data_vencimento")
  indexador          Indexador
  tipoTaxa           TipoTaxa            @map("tipo_taxa")
  taxa               Decimal             @db.Decimal(8, 4)
  periodicidadeJuros PeriodicidadeJuros? @map("periodicidade_juros")

  cri Cri?
  cra Cra?
  lci Lci?
  lca Lca?

  @@map("ativos_renda_fixa")
}

model Cri {
  ativoId   String         @id @map("ativo_id")
  rendaFixa AtivoRendaFixa @relation(fields: [ativoId], references: [ativoId], onDelete: Cascade)

  emissor      String?
  quantidade   Int?
  valorNominal Decimal? @db.Decimal(18, 4) @map("valor_nominal")

  @@map("cris")
}

model Cra {
  ativoId   String         @id @map("ativo_id")
  rendaFixa AtivoRendaFixa @relation(fields: [ativoId], references: [ativoId], onDelete: Cascade)

  emissor      String?
  quantidade   Int?
  valorNominal Decimal? @db.Decimal(18, 4) @map("valor_nominal")

  @@map("cras")
}

model Lci {
  ativoId   String         @id @map("ativo_id")
  rendaFixa AtivoRendaFixa @relation(fields: [ativoId], references: [ativoId], onDelete: Cascade)

  @@map("lcis")
}

model Lca {
  ativoId   String         @id @map("ativo_id")
  rendaFixa AtivoRendaFixa @relation(fields: [ativoId], references: [ativoId], onDelete: Cascade)

  @@map("lcas")
}

// Evento permanece igual — FK em Ativo, cobre todos os tipos.
```

Mudanças vs. schema atual:

| Campo atual | Vai para |
|---|---|
| `Ativo.emissor` | `Cri.emissor` (e nova `Cra.emissor`) |
| `Ativo.quantidade` | `Cri.quantidade` (e nova `Cra.quantidade`) |
| `Cri.dataVencimento` | `AtivoRendaFixa.dataVencimento` |
| `Cri.indexador` | `AtivoRendaFixa.indexador` |
| `Cri.tipoTaxa` | `AtivoRendaFixa.tipoTaxa` |
| `Cri.taxa` | `AtivoRendaFixa.taxa` |
| `Cri.periodicidadeJuros` | `AtivoRendaFixa.periodicidadeJuros` |
| `Cri.valorNominal` | continua em `Cri` (e nova `Cra.valorNominal`) |
| `Ativo.instituicao` (hoje nullable) | permanece em `Ativo`, **agora NOT NULL** (todos os registros já preenchidos conforme confirmado em conversa) |

### Migration (passos SQL ordenados)

1. Estender enum `TipoAtivo` com `CRA`, `LCI`, `LCA`.
2. Criar tabela `ativos_renda_fixa` (vazia).
3. Copiar dados de `cris` para `ativos_renda_fixa` (cinco colunas + `ativo_id`).
4. Remover colunas migradas de `cris` (`data_vencimento`, `indexador`, `tipo_taxa`, `taxa`, `periodicidade_juros`).
5. Adicionar `emissor` e `quantidade` em `cris`.
6. Copiar `emissor` e `quantidade` de `ativos` para `cris` (apenas linhas em que `tipo = 'CRI'`, que hoje são todas — só pra deixar a query explícita).
7. Remover `emissor` e `quantidade` de `ativos`.
8. Tornar `ativos.instituicao` NOT NULL.
9. Criar `cras`, `lcis`, `lcas` (vazias).
10. `prisma migrate` gera a migration única consolidada com tudo isso.

A migration usa **uma única arquivo Prisma** (`add_renda_fixa_3_niveis`). SQL inline para mover dados.

## Contratos de API

### Listagem unificada — `GET /ativos`

Query params (todos opcionais):

- `tipo`: `CRI`/`CRA`/`LCI`/`LCA`
- `indexador`: `PREFIXADO`/`CDI`/`IPCA`
- `instituicao`: enum
- `vencimentoAte`: ISO date

Resposta:

```json
[
  {
    "id": "...",
    "tipo": "CRI",
    "codigo": "...",
    "nome": "...",
    "instituicao": "XP",
    "precoAquisicao": "990.00",
    "dataAquisicao": "2025-03-15",
    "dataVencimento": "2030-03-15",
    "indexador": "IPCA",
    "tipoTaxa": "POS_SPREAD",
    "taxa": "8.5000",
    "periodicidadeJuros": "SEMESTRAL"
  },
  ...
]
```

Sem campos específicos do tipo (emissor/quantidade/valorNominal). Pra ver isso, ir para `/ativos/:id`.

### Detalhe unificado — `GET /ativos/:id`

Devolve **tudo**: base + RF + campos específicos do tipo (no shape do tipo correspondente).

```json
{
  "id": "...",
  "tipo": "CRI",
  "codigo": "...", "nome": "...", "instituicao": "XP",
  "precoAquisicao": "990.00", "dataAquisicao": "2025-03-15",
  "observacoes": null,
  "dataVencimento": "2030-03-15",
  "indexador": "IPCA", "tipoTaxa": "POS_SPREAD",
  "taxa": "8.5000", "periodicidadeJuros": "SEMESTRAL",
  "emissor": "Securitizadora X",
  "quantidade": 10,
  "valorNominal": "1000.00",
  "criadoEm": "...", "atualizadoEm": "..."
}
```

Para LCI/LCA, os 3 campos extras simplesmente não aparecem (ou aparecem como `null` — definir no schema Zod).

### CRUD por tipo

- `POST /cris`, `POST /cras`, `POST /lcis`, `POST /lcas` — body unificado conforme tipo.
- `GET /cris`, etc. — listagem **só** do tipo (mantém retrocompatibilidade pra quem quer essa visão).
- `GET /cris/:id`, etc. — detalhe (mesmo shape do `/ativos/:id` se for daquele tipo; 404 se id é de outro tipo).
- `PUT /cris/:id`, etc.
- `DELETE /cris/:id`, `/cras/:id`, etc.
- Deletar via `/cras/:id` (etc.) faz cascade em todas as tabelas via FK; o `DELETE /ativos/:id` **também** existe (genérico, deleta independente do tipo).

### Eventos — `/ativos/:id/eventos`

Migrar de `/cris/:id/eventos` para `/ativos/:id/eventos`. Mesmo contrato (`tipo`, `data`, `valor`, `observacoes`), mesmo schema, mas namespace muda. Todos os 4 tipos usam o mesmo endpoint. Validação cruzada (`data >= dataAquisicao`) continua.

## Telas / UX

### `/ativos` (nova — substitui `/cris` como home)

- Topo: filtros (Tipo, Indexador, Instituição, Vencimento até).
- Botão "Novo ativo" → DropdownMenu com 4 itens (CRI / CRA / LCI / LCA) → leva para `/{tipo}/novo`.
- Tabela com colunas: **Nome** | Código | Tipo | Instituição | Indexador + Taxa | Vencimento | Ações (ver / editar / deletar).
- Empty state quando sem ativos.

### `/cris/novo`, `/cras/novo`

Form completo: nome, código, instituição, emissor (opcional), quantidade (opcional, default 1), valor nominal (opcional), preço de aquisição, data de aquisição, data de vencimento, indexador, tipo de taxa, taxa, periodicidade de juros (opcional), observações.

### `/lcis/novo`, `/lcas/novo`

Mesmo form, **sem** os 3 campos `emissor`, `quantidade`, `valorNominal`. Tudo o mais idêntico.

### `/{tipo}/[id]` (detalhe)

Header com nome + código + tipo badge. Card "Detalhes" com campos pertinentes ao tipo (CRI/CRA mostram emissor/quantidade/valor nominal; LCI/LCA não). Card "Eventos" igual ao atual (componente reutilizado, parametrizado por `ativoId`).

### `/{tipo}/[id]/editar`

Forma de edição espelhando o `/{tipo}/novo`. Mesma lógica de submit (PUT).

### Navegação

- Header / breadcrumb: link para `/ativos` (substitui o link para `/cris`).
- `/` redireciona pra `/ativos`.

### Lista por tipo individual ainda existe?

`GET /cris` existe na API (já estava lá). **Não** vamos criar páginas web `/cris`, `/cras`, etc. (apenas `/cris/novo`, `/cris/[id]`, `/cris/[id]/editar`). A listagem é unificada em `/ativos`.

## Validações e regras de negócio

- `codigo` continua único globalmente (não por tipo) — registro 409 nas rotas POST/PUT.
- `dataVencimento >= dataAquisicao` validado server-side (já existia para CRI; sobe para o schema unificado de renda fixa).
- `Ativo.instituicao` agora obrigatória (NOT NULL). Migration garante backfill antes de aplicar a constraint.
- Update mantém o `tipo` imutável. Trocar tipo de um ativo existente não é suportado (deletar + recriar).

## Fases de implementação

Para manter cada commit revisável:

1. **F5.1 — Schema + Migration.** Atualiza `schema.prisma`, gera migration `add_renda_fixa_3_niveis`, atualiza `seed.ts` (adiciona 1 CRA, 1 LCI, 1 LCA). Smoke: `pnpm db:migrate` + `pnpm db:seed`; verificar via `prisma studio` que CRIs antigos sobreviveram e novos exemplos apareceram.
2. **F5.2 — Shared (Zod).** Refatora `packages/shared/src/cri.ts` em `ativo.ts` + `ativo-renda-fixa.ts` + `cri.ts` + `cra.ts` + `lci.ts` + `lca.ts`. Schemas Input/Response por tipo + schema unificado pra listagem.
3. **F5.3 — API: CRUD por tipo.** Adapta `cris.ts`, cria `cras.ts`, `lcis.ts`, `lcas.ts`. Cada rota CUD entra numa transação que insere/atualiza nas 3 tabelas. Smoke: `curl` cada endpoint, criar 1 de cada tipo.
4. **F5.4 — API: `/ativos` e migração de eventos.** Adiciona `routes/ativos.ts` com `GET /ativos`, `GET /ativos/:id`, `DELETE /ativos/:id`. Migra `eventos.ts` de `/cris/:id/eventos` para `/ativos/:id/eventos` (remove o prefixo antigo).
5. **F5.5 — Web: forms e detalhes por tipo.** Renomeia `CriForm` para variar conforme tipo, ou cria componentes irmãos (`CraForm`, `LciForm`, `LcaForm`). Atualiza páginas `/cris/*`. Adiciona páginas `/cras/*`, `/lcis/*`, `/lcas/*`. Reutiliza `CardEventos` parametrizado por `ativoId`.
6. **F5.6 — Web: `/ativos`.** Cria página de listagem unificada com filtros e dropdown de "Novo". Remove `/cris` (página de listagem) — só sobrevivem as rotas de detalhe/criação/edição.

## Critérios de aceitação

- [ ] Migration `add_renda_fixa_3_niveis` aplicada sem perda de dados: CRIs existentes seguem listáveis e editáveis.
- [ ] Enum `TipoAtivo` cobre `CRI`, `CRA`, `LCI`, `LCA`.
- [ ] Tabela `ativos_renda_fixa` existe e contém os 5 campos promovidos.
- [ ] Tabelas `cras`, `lcis`, `lcas` existem (mesmo que vazias para `lcis`/`lcas`).
- [ ] `Ativo.instituicao` é NOT NULL.
- [ ] `Ativo` não tem mais colunas `emissor`/`quantidade`.
- [ ] `POST /cras` cria um CRA completo (Ativo + AtivoRendaFixa + Cra em transação atômica).
- [ ] `POST /lcis` cria uma LCI (Ativo + AtivoRendaFixa + Lci em transação atômica), sem aceitar `emissor`/`quantidade`/`valorNominal` no body.
- [ ] `GET /ativos` retorna todos os tipos misturados, com filtro `?tipo=` funcionando.
- [ ] `GET /ativos/:id` retorna o shape correto para cada tipo.
- [ ] `DELETE /ativos/:id` (ou via rota específica do tipo) remove os 3 níveis em cascade + os eventos.
- [ ] Eventos passam a usar `/ativos/:id/eventos`; rotas antigas `/cris/:id/eventos` removidas.
- [ ] Web tem `/ativos` como home (com filtro), `/cris/novo`, `/cras/novo`, `/lcis/novo`, `/lcas/novo`, e detalhe/edição correspondentes para os 4 tipos.
- [ ] Form de LCI/LCA não mostra emissor/quantidade/valor nominal.
- [ ] Card de eventos funciona nos 4 tipos.
- [ ] Seed inclui pelo menos 1 exemplo de cada tipo.

## Validação (preencher no smoke test final)

— a preencher após implementação —

## Pendências geradas

— a preencher —
