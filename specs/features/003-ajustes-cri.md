# Feature 003 — Ajustes do CRI (nome, periodicidade, valor nominal opcional, quantidade default)

**Status:** Closed
**Aberta em:** 2026-05-17
**Aprovada em:** 2026-05-17
**Fechada em:** 2026-05-17
**Modificada por:** —

> Esta spec **modifica** a feature [001](001-cadastro-de-cri.md) (Closed). Quando aprovada, o header da 001 ganha `Modificada por: [[003-ajustes-cri]]`.

## Objetivo

Resolver 4 ajustes de UX e modelo identificados durante o uso do cadastro de CRI:

1. Adicionar **nome amigável** ao ativo (para distinguir CRIs visualmente: "CRI MRV", "CRI Coruripe").
2. Adicionar **periodicidade de juros** ao CRI (preparar terreno para futura projeção de eventos).
3. Tornar **valor nominal opcional** (não é necessário em todo cadastro).
4. **Quantidade default = 1** no formulário (reduzir digitação no caso comum).

Os ajustes 1–3 são mudanças de schema; o ajuste 4 é só UX no form.

## Escopo

### Dentro

- Campo `Ativo.nome` (String, obrigatório, ≤ 200 chars).
- Enum `PeriodicidadeJuros { MENSAL, TRIMESTRAL, SEMESTRAL }` + campo `Cri.periodicidadeJuros` (opcional).
- `Cri.valorNominal` passa de `Decimal` para `Decimal?` (opcional).
- Quantidade pré-preenchida com `1` no formulário de novo CRI.
- Migration única que aplica as 3 mudanças de schema.
- Atualização de:
  - Schemas Zod (`shared/src/cri.ts`)
  - Serializer (`apps/api/src/lib/serialize-cri.ts`)
  - Rotas POST/PUT (`apps/api/src/routes/cris.ts`)
  - Seed (3 CRIs ganham nome + periodicidade; preservam valor nominal)
  - Formulário (`CriForm.tsx`): novo campo Nome no topo, novo Select Periodicidade, valor nominal sem validação `positive`, quantidade default 1
  - Lista (`/cris`): nova coluna **Nome** como principal, código vira coluna secundária menor
  - Detalhe (`/cris/[id]`): nome em destaque no header (substitui código como h1), código aparece abaixo; valor nominal mostra `—` se null; periodicidade adicionada ao card de detalhes

### Fora

- **Projeção de eventos** baseada em periodicidade — feature futura (provavelmente 004 após a 002 fechar).
- **Tipo de amortização** (BULLET / PARCELADA) — só entra junto com a feature de projeção.
- **Tornar nome opcional para outros tipos de ativo** — quando LCI/FII/etc. chegarem, cada feature decide.

## Mudanças de schema

### 1. `Ativo.nome` (obrigatório)

```prisma
model Ativo {
  // ...
  nome           String       // novo, obrigatório
  // ...
}
```

**Migration:** os 3 CRIs existentes no seed (após reset, se aplicável) já vão nascer com nome. Para os registros legados no banco do usuário, a migration precisa adicionar um valor temporário (caso a coluna seja NOT NULL): vamos adicionar a coluna como `NOT NULL` com `DEFAULT ''` e depois o usuário edita via UI.

Alternativa mais limpa: adicionar como `NOT NULL` sem default, usando o **mesmo valor do código** como fallback temporário — feito via SQL inline na migration:

```sql
ALTER TABLE ativos ADD COLUMN nome TEXT;
UPDATE ativos SET nome = codigo WHERE nome IS NULL;
ALTER TABLE ativos ALTER COLUMN nome SET NOT NULL;
```

Após isso, todos os ativos legados ganham nome igual ao código. Usuário ajusta via UI.

### 2. `Cri.periodicidadeJuros` (opcional)

```prisma
enum PeriodicidadeJuros {
  MENSAL
  TRIMESTRAL
  SEMESTRAL
  BULLET
}

model Cri {
  // ...
  periodicidadeJuros PeriodicidadeJuros? @map("periodicidade_juros")
}
```

Nullable — preencher é opcional. Quando ausente, futura projeção de eventos não pode operar nesse CRI.

**Nota sobre `BULLET`:** tecnicamente BULLET é tipo de **amortização** (principal devolvido só no vencimento), não periodicidade de juros. Mas em CRIs estilo bullet o cupom periódico não existe — juros são pagos junto com o principal na maturidade. Tratamos `BULLET` como periodicidade aqui por conveniência operacional ("um único 'evento' no fim da vida do título"). Quando a feature de projeção entrar, o cálculo trata BULLET como caso especial.

### 3. `Cri.valorNominal` opcional

```prisma
model Cri {
  // ...
  valorNominal Decimal? @db.Decimal(18, 4) @map("valor_nominal")  // era Decimal sem ?
}
```

Migration: `ALTER TABLE cris ALTER COLUMN valor_nominal DROP NOT NULL`. Sem perda.

### 4. Quantidade default = 1 (form)

Só UX. `EMPTY_DEFAULTS.quantidade` em `apps/web/src/components/CriForm.tsx` passa de `null` para `1`.

## Schemas Zod (shared)

```ts
// novo
export const PeriodicidadeJurosSchema = z.enum(
  ['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'BULLET'],
  { errorMap: () => ({ message: 'Selecione uma periodicidade' }) },
);
export type PeriodicidadeJuros = z.infer<typeof PeriodicidadeJurosSchema>;

export const PERIODICIDADE_JUROS_LABELS: Record<PeriodicidadeJuros, string> = {
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  BULLET: 'Bullet (só no vencimento)',
};

// criInputBase ganha:
nome: z.string().min(1, 'Obrigatório').max(200, 'Máximo 200 caracteres'),
periodicidadeJuros: PeriodicidadeJurosSchema.nullable().optional(),
valorNominal: positiveDecimalString.nullable().optional(),  // era obrigatório
```

## UI — Formulário

Ordem dos campos no `CriForm` (revisada para "velocidade no preenchimento" — obrigatórios primeiro):

| Posição | Campo | Obrigatório? |
|---|---|---|
| 1 | **Nome** | sim *(novo)* |
| 2 | Código | sim |
| 3 | Instituição | sim |
| 4 | Emissor | opcional |
| 5 | **Remuneração** (preset) | sim |
| 6 | Taxa | sim |
| 7 | Preço de aquisição unitário | sim |
| 8 | Quantidade (default `1`) | opcional |
| 9 | **Valor nominal** | **opcional** *(mudança)* |
| 10 | Data de aquisição | sim |
| 11 | Data de vencimento | sim |
| 12 | **Periodicidade de juros** | opcional *(novo)* |
| 13 | Observações | opcional |

Mantém grid 2-colunas conforme já está.

## UI — Lista `/cris`

Colunas atuais: Código | Emissor | Remuneração | Vencimento | Quantidade | Investido total.

Novas colunas (ajustadas):

| Coluna | Conteúdo |
|---|---|
| **Nome** | label amigável em destaque (ex: "CRI MRV") |
| **Código** | texto pequeno, monoespaçado, abaixo do nome ou em coluna própria estreita |
| Emissor | igual hoje, com `—` se null |
| Remuneração | igual |
| Vencimento | igual |
| Quantidade | igual |
| Investido total | igual |

Opção visual (a confirmar com o usuário se desejar): nome + código empilhados na mesma coluna pra economizar largura.

## UI — Detalhe `/cris/[id]`

- **Header:** `<h1>` passa a ser o **nome** (em destaque). Logo abaixo, código em fonte menor monoespaçada + emissor (se houver) em texto secundário.
- **Card "Detalhes":** ganha nova linha **Periodicidade de juros** (mostra `—` se null). **Valor nominal** mostra `—` se null.

## Critérios de aceitação

- [x] Migration cria coluna `nome` em `ativos` (NOT NULL com preenchimento dos legados via SQL inline), enum `PeriodicidadeJuros`, coluna `periodicidade_juros` em `cris` (nullable), torna `valor_nominal` nullable.
- [x] Migration roda sem perda de dados: CRIs existentes ganham `nome = codigo`.
- [x] `POST /cris` aceita `nome` obrigatório e `valorNominal` opcional; rejeita com 400 se nome estiver vazio.
- [x] `PUT /cris/:id` permite atualizar nome e periodicidade.
- [x] Seed atualizado: 3 CRIs com nomes fictícios (ex: "CRI Alpha", "CRI Beta", "CRI Gamma") e periodicidades variadas para cobrir os enums.
- [x] Formulário: campo Nome no topo, obrigatório; periodicidade aparece (opcional); valor nominal aceita vazio; quantidade pré-preenchida com 1.
- [x] Lista exibe nome como coluna principal; código em texto secundário.
- [x] Detalhe exibe nome como h1, código abaixo; mostra periodicidade no card; valor nominal exibe `—` se null.
- [x] Header da spec 001 atualizado: `Modificada por: [[003-ajustes-cri]]`.

## Validação (preencher no smoke test)

Implementado e exercitado em 2026-05-17:

- Migration aplicada com backfill SQL inline (`UPDATE ativos SET nome = codigo`) — CRI legado ganhou nome igual ao código sem violar NOT NULL.
- Seed atualizado: 3 CRIs com nomes fictícios (Alpha/Beta/Gamma) e periodicidades cobrindo 3 dos 4 enums (SEMESTRAL, TRIMESTRAL, BULLET).
- Adicionado `BULLET` ao enum de periodicidade durante Active (mudança incorporada após aprovação inicial).
- API aceita CRI mínimo sem `valorNominal` nem `periodicidadeJuros`, conforme objetivo de "velocidade no preenchimento".
- Form web: Nome no topo, Periodicidade após datas, Quantidade default = 1, Valor nominal sem validação `positive` quando vazio.
- Lista: coluna "Nome" como principal com código menor em monoespaçado abaixo.
- Detalhe: h1 = nome; código em subtítulo monoespaçado; novo Field "Periodicidade de juros"; valor nominal exibe "—" quando null.

### Ajustes feitos durante Active

- Adição do valor `BULLET` ao enum `PeriodicidadeJuros` (4 valores em vez de 3) com label "Bullet (só no vencimento)".
- Nomes fictícios para o seed (Alpha/Beta/Gamma) em vez de nomes realistas para evitar confusão com ativos reais.

## Pendências geradas

Movida para [`BACKLOG.md`](../../BACKLOG.md):

- Select de Periodicidade de juros não permite voltar para "não definida" via UI após selecionar — Radix Select não aceita `value=""`. Solução requer uma opção sentinela ("Não definida") no início da lista. Pequena fricção; baixa prioridade.
