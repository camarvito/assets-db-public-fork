# Feature 002 — Eventos do CRI (registro manual)

**Status:** Closed
**Aberta em:** 2026-05-17
**Aprovada em:** 2026-05-17
**Fechada em:** 2026-05-17
**Modificada por:** —

## Objetivo

Permitir o registro manual de **eventos financeiros recebidos** de um CRI (pagamentos de juros e amortizações), com visualização agregada por ativo. Sem projeção de eventos futuros nem cálculo derivado — apenas histórico do que efetivamente ocorreu.

Esta feature **estende** o detalhe do CRI (entregue na [feature 001](001-cadastro-de-cri.md), Closed) sem alterar o que já existe — adiciona uma nova seção na página `/cris/[id]` e um conjunto próprio de endpoints REST aninhados.

## Escopo

### Dentro

- Modelo `Evento` no banco, ligado a `Ativo` (não a `Cri`), preparando reuso futuro para outros tipos de ativo.
- Enum `TipoEvento` com valores iniciais: `JUROS` e `AMORTIZACAO`.
- Migration nova.
- Endpoints REST CRUD aninhados em `/cris/:id/eventos`.
- Schemas Zod compartilhados em `packages/shared/src/evento.ts`.
- Seção "Eventos" no detalhe `/cris/[id]`:
  - Total recebido (soma dos valores)
  - Tabela cronológica (mais recente primeiro)
  - Botão "Novo evento" → modal
  - Editar inline (modal) e deletar (com confirmação) por linha
- Cascade: deletar um CRI apaga todos os seus eventos.

### Fora

- **Outros tipos de evento** (bônus, atualização monetária, vencimento explícito) — vira BACKLOG ou feature própria.
- **Projeção/cronograma futuro** (eventos esperados a receber) — feature separada.
- **Reconciliação** projetado × recebido — depende da projeção existir.
- **Visão consolidada cross-ativo** (`/eventos` listando tudo) — fica para quando o segundo tipo de ativo entrar.
- **Outros tipos de ativo** (LCI, LCA, FII...) — embora o modelo `Evento` viva em `Ativo` pra permitir isso futuramente, esta feature só endereça CRI.
- **Cálculo de rentabilidade** (retorno realizado vs nominal).
- **Importação em lote** (CSV / extrato).
- **Auditoria / histórico** de mudanças nos eventos.

## Modelo de dados

### Schema Prisma (adições)

```prisma
enum TipoEvento {
  JUROS
  AMORTIZACAO
}

model Evento {
  id           String     @id @default(cuid())
  ativoId      String     @map("ativo_id")
  ativo        Ativo      @relation(fields: [ativoId], references: [id], onDelete: Cascade)

  tipo         TipoEvento
  data         DateTime   @db.Date
  valor        Decimal    @db.Decimal(18, 4)
  observacoes  String?    @db.Text

  criadoEm     DateTime   @default(now()) @map("criado_em")
  atualizadoEm DateTime   @updatedAt      @map("atualizado_em")

  @@index([ativoId])
  @@index([data])
  @@map("eventos")
}
```

E em `Ativo`, adicionar a relação inversa (necessária no Prisma):

```prisma
model Ativo {
  // ...campos existentes
  eventos Evento[]
}
```

### Notas

- **Ligação ao `Ativo`, não ao `Cri`.** Eventos são comuns a renda fixa em geral (e dividendos de FII/ações vão usar a mesma estrutura quando esses tipos entrarem). Coerente com o ADR 002.
- **Cascade** no `onDelete`: deletar `Ativo` (e consequentemente o CRI) limpa eventos associados.
- **Índices** em `ativoId` (queries por ativo) e em `data` (ordenação cronológica).
- **`valor`** sempre positivo. O `tipo` distingue se foi cupom ou amortização (não há valor negativo para representar algo).

## Contratos de API

Base: `http://localhost:3001`. Eventos sob CRI são acessados como recurso aninhado.

Convenções já estabelecidas continuam (decimais como string, datas como `YYYY-MM-DD`, error envelope padronizado).

### `GET /cris/:id/eventos`

Lista todos os eventos de um CRI, ordenados por `data DESC` (mais recente primeiro).

**Response 200:**
```json
[
  {
    "id": "clx...",
    "ativoId": "clx...",
    "tipo": "JUROS",
    "data": "2024-09-15",
    "valor": "60.5000",
    "observacoes": null,
    "criadoEm": "2026-05-17T12:00:00.000Z",
    "atualizadoEm": "2026-05-17T12:00:00.000Z"
  }
]
```

**404** se `id` do CRI não existir ou não for `tipo=CRI`.

### `POST /cris/:id/eventos`

Cria um evento para o CRI.

**Request body:**
```json
{
  "tipo": "JUROS",
  "data": "2024-09-15",
  "valor": "60.5",
  "observacoes": null
}
```

**Response 201:** objeto completo do evento criado.

**404** se o CRI não existir.

### `PUT /cris/:id/eventos/:eventoId`

Atualiza todos os campos do evento. Mesmo body do `POST`. `404` se o CRI ou o evento não existirem, ou se o `eventoId` não pertencer a esse `ativoId`.

### `DELETE /cris/:id/eventos/:eventoId`

Remove o evento. Retorna `204`. Mesma regra de 404 do PUT.

## Telas

### `/cris/[id]` — Detalhe (extensão)

Layout atual da página do CRI ganha um **novo card abaixo** do card "Detalhes":

```
┌─────────────────────────────────────────────┐
│ Detalhes (já existente, sem mudanças)       │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Eventos              Total: R$ 1.234,56     │
│                              [+ Novo evento]│
├─────────────────────────────────────────────┤
│ Data       Tipo       Valor    Obs.    ⋯   │
│ 15/09/2024 Juros      R$ 60,50  —      ⋯   │
│ 15/03/2024 Juros      R$ 58,20  —      ⋯   │
│ ...                                          │
└─────────────────────────────────────────────┘
```

- **Header do card:** título "Eventos" à esquerda, "Total: R$ X,XX" no centro/à direita, botão "Novo evento" no canto direito (abre modal).
- **Total** = soma dos `valor` de todos os eventos do CRI, formatado em BRL.
- **Tabela** com colunas:
  - Data (`dd/MM/yyyy`)
  - Tipo (label do enum: "Juros" ou "Amortização")
  - Valor (em BRL)
  - Observações (texto truncado se longo; `—` se vazio)
  - Coluna de ações (dropdown menu com "Editar" e "Deletar")
- **Estado vazio:** mensagem ("Nenhum evento registrado ainda") + CTA implícito (botão no header já visível).

### Modal de criar/editar evento

Reutilizado para ambos os modos. Campos:

| Campo | Componente | Validação |
|---|---|---|
| Tipo | Select (Juros / Amortização) | obrigatório |
| Data | DatePicker (reuso do existente) | obrigatório, ≥ `dataAquisicao` do CRI |
| Valor (R$) | Input numérico | obrigatório, > 0 |
| Observações | Textarea | opcional, ≤ 1000 chars |

- Botões **Salvar** e **Cancelar**.
- Erros aparecem inline nos campos.
- Após sucesso: fecha modal, toast confirmando, TanStack Query invalida lista e total recalcula.

### Confirmação de delete

`AlertDialog` (reuso do padrão do `DeleteCriButton`): "Deletar este evento?" com data e valor citados na descrição.

## Validações e regras de negócio

Schemas Zod em `packages/shared/src/evento.ts`, consumidos por API e Web (mesmo padrão da feature 001).

Regras-chave:
- `valor` estritamente positivo.
- `data` no formato `YYYY-MM-DD`, válida.
- `data` ≥ `dataAquisicao` do CRI **(validado no servidor, não no Zod do shared, porque depende de dado externo ao body)**.
- `tipo` é um dos valores do enum.
- `observacoes` opcional (`null` ou ausente), ≤ 1000 chars.

Decimais transitam como string (consistente com a feature 001).

## Cache e invalidação

Hooks TanStack em `apps/web/src/hooks/use-eventos.ts`:
- `useEventos(criId)` — lista
- `useCreateEvento(criId)`, `useUpdateEvento(criId)`, `useDeleteEvento(criId)` — mutations

`queryKeys.eventos` próprio (independente de `criKeys`), mas mutations invalidam **tanto os eventos do CRI quanto o detalhe do CRI** — futuro: detalhe pode mostrar "última movimentação" derivada dos eventos.

## Critérios de aceitação

- [x] Migration cria tabela `eventos`, enum `TipoEvento` e índices.
- [x] `GET /cris/:id/eventos` em CRI sem eventos retorna `[]`.
- [x] `GET /cris/:id/eventos` retorna eventos em ordem `data DESC`.
- [x] `GET /cris/<id-inexistente>/eventos` retorna `404`.
- [x] `POST /cris/:id/eventos` com body válido cria e retorna `201`.
- [x] `POST /cris/:id/eventos` com `valor <= 0` retorna `400` com issue do Zod.
- [x] `POST /cris/:id/eventos` com `data < dataAquisicao` retorna `400` com mensagem do servidor.
- [x] `PUT /cris/:id/eventos/:eventoId` atualiza e devolve novo objeto.
- [x] `PUT` com `eventoId` que não pertence ao `ativoId` retorna `404`.
- [x] `DELETE /cris/:id/eventos/:eventoId` retorna `204` e remove o evento.
- [x] Deletar o CRI remove todos os seus eventos (cascade).
- [x] Página de detalhe do CRI mostra o card "Eventos" com total agregado.
- [x] Modal de criar/editar funciona; erros aparecem inline.
- [x] Delete via dropdown abre `AlertDialog` e remove o evento após confirmação.
- [x] Total recebido reflete instantaneamente após criar/editar/deletar (TanStack invalida cache).
- [x] Datas em `dd/MM/yyyy`; valores em `R$ 1.234,56`.

## Validação (preencher no smoke test final)

Implementado e exercitado em 2026-05-17:

**Backend (F2.1 + F2.2):**
- Migration `add_eventos` aplicada (enum `TipoEvento`, tabela `eventos` com FK cascade, índices em `ativoId` e `data`).
- Schemas Zod compartilhados (`EventoInputSchema`, `EventoResponseSchema`, `TIPO_EVENTO_LABELS`).
- 4 rotas CRUD aninhadas em `/cris/:id/eventos[/:eventoId]` exercitadas via curl: list/create/update/delete + cenários de erro (CRI inexistente, validação cruzada `data ≥ dataAquisicao`).
- Validação cruzada server-side retorna formato Zod-compatível, permitindo display inline no form.

**Web (F2.3 + F2.4):**
- Cliente HTTP extraído para `_client.ts` (reuso entre cris e eventos); módulo `eventos.ts` com 4 funções + `eventoKeys`.
- Hooks TanStack (`useEventos`, `useCreateEvento`, `useUpdateEvento`, `useDeleteEvento`) com invalidação automática.
- `EventoForm` (modal Dialog) com Tipo / Data (DatePicker reusado) / Valor / Observações.
- `CardEventos` integrado no `/cris/[id]` abaixo do card de detalhes, com estado vazio, tabela com total agregado, DropdownMenu por linha e AlertDialog inline pra delete.
- Fluxo ponta-a-ponta exercitado: criar, listar com total, editar via dropdown, deletar com confirmação contextual.

### Ajustes feitos durante implementação

- **Refactor de `_client.ts`** (não estava no plano original) — `apiFetch` + `ApiError` foram extraídos de `cris.ts` para um módulo compartilhado, viabilizando `eventos.ts` sem duplicação.
- **Delete inline em vez de `DeleteEventoButton` componente** — o state ("qual evento está sendo deletado") mora no `CardEventos`. Renderizar um único `AlertDialog` controlado é melhor que N AlertDialogs (um por linha) e mantém o componente focado.

## Pendências geradas

Nenhuma pendência adicional identificada durante a implementação. Os tópicos previamente listados como "fora de escopo" continuam válidos como features futuras:

- **Projeção/cronograma de eventos futuros** (depende de periodicidade já cadastrada via spec 003).
- **Reconciliação projetado × recebido** (depende da projeção existir).
- **Visão consolidada cross-ativo** (`/eventos` listando tudo) — quando o segundo tipo de ativo entrar.
- **Outros tipos de evento** (bônus, atualização monetária) — adicionar valores ao enum se aparecer demanda.
- **Cálculo de rentabilidade** (retorno realizado vs nominal).
- **Importação em lote** (CSV / extrato).
