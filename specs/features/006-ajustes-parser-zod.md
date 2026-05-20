# Feature 006 — Ajustes: parser monetário roda dentro do Zod

**Status:** Closed
**Aberta em:** 2026-05-19
**Aprovada em:** 2026-05-19
**Fechada em:** 2026-05-19
**Modificada por:** —

> Esta spec **modifica** a feature [004](004-ajustes-input.md) (Closed). O header da 004 ganha `Modificada por: [[006-ajustes-parser-zod]]`.

## Objetivo

Corrigir dois bugs descobertos no uso da spec 004:

1. **Vírgula como decimal continua sendo rejeitada no form.** Ex: digitar `1043,62` em "Preço de aquisição" gera "Deve ser um número decimal (ex: 1234.56)". O `parseMoneyInput` foi colocado no `onSubmit` do form, mas o `zodResolver` valida ANTES de o `onSubmit` rodar — então o parser vira código morto e o usuário vê o erro do regex original.
2. **Campo opcional monetário vazio gera erro.** Ex: deixar `valorNominal` em branco também produz "Deve ser um número decimal". O `.nullable().optional()` não captura a string vazia `""` porque ela não é `null` nem `undefined`; o regex falha em seguida.

Ambos os bugs têm a mesma raiz: a validação Zod roda primeiro, e o regex `decimalRegex` não aceita `,` nem `""`.

## Escopo

### Dentro

- Mover `parseMoneyInput` de `apps/web/src/lib/` para `packages/shared/src/` (módulo compartilhado, sem dependências de DOM).
- Em `_validators.ts`, embrulhar `decimalString`, `positiveDecimalString` e `nonNegativeDecimalString` com `z.preprocess(...)` chamando `parseMoneyInput`. Strings vazias viram `undefined` (campo obrigatório falha com "Required", campo opcional aceita).
- Adicionar `optionalPositiveDecimalString` em `_validators.ts`: campo opcional cujo `""` é mapeado para `null` antes do regex.
- Atualizar `cri.ts`: `valorNominal` passa de `positiveDecimalString.nullable().optional()` para `optionalPositiveDecimalString`.
- Atualizar imports em `apps/web/src/components/CriForm.tsx` e `EventoForm.tsx`: remover normalização redundante de `precoAquisicao`/`taxa`/`valorNominal`/`valor` no `onSubmit` — Zod já fez.
- Mover os testes Vitest de `apps/web/src/lib/parse-money.test.ts` para apontarem para o módulo em shared. Os 21 casos continuam idênticos.
- Atualizar header da spec 004: `Modificada por: [[006-ajustes-parser-zod]]`.

### Fora

- Mudar formato canônico de saída (continua `.` como decimal).
- Aceitar formatos que `parseMoneyInput` ainda rejeita (`"1,234,567"`, letras).
- Datas — a parte de datas da spec 004 funciona porque a normalização acontece no `DatePicker` antes do `field.onChange`, então o Zod vê sempre formato ISO. Sem mudança.
- Helpers de string opcional fora do contexto monetário (ex: `emissor`/`observacoes` continuam usando o pattern `values.x?.trim() ? values.x : null` no `onSubmit` — não fazem parte deste fix).

## Implementação

### Novo arquivo `packages/shared/src/parse-money.ts`

Mesma função pura que vive hoje em `apps/web/src/lib/parse-money.ts` (regras 1–6 da spec 004), movida sem alteração funcional.

### `packages/shared/src/_validators.ts`

```ts
import { z } from 'zod';
import { parseMoneyInput } from './parse-money';

const decimalRegex = /^\d+(\.\d+)?$/;

const moneyPreprocess = (v: unknown) => {
  if (typeof v !== 'string') return v;
  const trimmed = v.trim();
  if (trimmed === '') return undefined;
  return parseMoneyInput(trimmed);
};

const decimalChecks = z
  .string()
  .regex(decimalRegex, 'Deve ser um número decimal (ex: "1234.56")');

export const decimalString = z.preprocess(moneyPreprocess, decimalChecks);

export const positiveDecimalString = z.preprocess(
  moneyPreprocess,
  decimalChecks.refine(
    (v) => Number.parseFloat(v) > 0,
    'Deve ser maior que zero',
  ),
);

export const nonNegativeDecimalString = z.preprocess(
  moneyPreprocess,
  decimalChecks.refine(
    (v) => Number.parseFloat(v) >= 0,
    'Deve ser maior ou igual a zero',
  ),
);

// Para campos opcionais: vazio → null (em vez de undefined),
// aproveitando o .nullable() interno.
export const optionalPositiveDecimalString = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v;
    const trimmed = v.trim();
    if (trimmed === '') return null;
    return parseMoneyInput(trimmed);
  },
  decimalChecks
    .refine((v) => Number.parseFloat(v) > 0, 'Deve ser maior que zero')
    .nullable(),
);
```

### `packages/shared/src/cri.ts`

```ts
// antes:
valorNominal: positiveDecimalString.nullable().optional(),

// depois:
valorNominal: optionalPositiveDecimalString,
```

Os outros campos (`precoAquisicao`, `taxa`) já são obrigatórios — ganham automaticamente a tolerância ao `,` via preprocess.

### `packages/shared/src/index.ts`

Exporta `parseMoneyInput` para que web possa continuar consumindo (caso precise em outros contextos no futuro).

### CriForm.tsx / EventoForm.tsx

Remove a normalização redundante no `onSubmit`. Antes:

```ts
const payload: CriInput = {
  ...values,
  precoAquisicao: parseMoneyInput(values.precoAquisicao),
  valorNominal: values.valorNominal?.trim()
    ? parseMoneyInput(values.valorNominal)
    : null,
  taxa: parseMoneyInput(values.taxa),
  // ...
};
```

Depois:

```ts
const payload: CriInput = {
  ...values,
  // emissor e observacoes ainda precisam de trim → null
  // (campos string puros, não monetários)
  emissor: values.emissor?.trim() ? values.emissor : null,
  observacoes: values.observacoes?.trim() ? values.observacoes : null,
};
```

O import `parseMoneyInput` sai dos dois forms.

### Testes

`apps/web/src/lib/parse-money.test.ts` ajustado para importar de `@assets-db/shared`. Mantém os 21 casos.

## Implicações arquiteturais

- **API agora aceita `,`/`.` em payloads JSON** (consequência de o Zod compartilhado ser permissivo). Era explicitamente "fora de escopo" na spec 004 ("API continua estrita"). A spec 006 inverte essa decisão pela razão prática: o Zod do form e o Zod da API são o mesmo schema; ou ambos são tolerantes ou ambos são estritos, e tolerante é o que o usuário pediu na 004.
- **Não há duplicação de lógica.** Parser vive uma única vez, em shared, e é o único caminho de normalização. Removido também o `parseMoneyInput` redundante do `onSubmit`.
- **Campos string opcionais não monetários** (emissor, observacoes) continuam dependendo do `onSubmit` para converter `""` → `null` antes do envio. Não é tema desta spec; entra como BACKLOG se virar fricção real.

## Critérios de aceitação

- [x] `packages/shared/src/parse-money.ts` existe e é o único lugar onde a função mora.
- [x] `apps/web/src/lib/parse-money.ts` removido.
- [x] `_validators.ts` usa `z.preprocess(moneyPreprocess, ...)` em todos os schemas decimais.
- [x] `optionalPositiveDecimalString` definido e exportado.
- [x] `valorNominal` em `cri.ts` usa `optionalPositiveDecimalString`.
- [x] `parseMoneyInput` exportado via `packages/shared/src/index.ts`.
- [x] Testes `parse-money.test.ts` passam, importando de `@assets-db/shared` (21/21).
- [x] `CriForm.tsx` e `EventoForm.tsx` sem chamadas a `parseMoneyInput` (normalização vive só no Zod).
- [x] Smoke manual:
  - [x] `1043,62` em Preço de aquisição salva como `1043.62`.
  - [x] `valorNominal` deixado em branco → submit OK, salva como `null`.
  - [x] Outros valores monetários nos 2 forms continuam funcionando.

## Validação (preencher no smoke test final)

Implementado e exercitado em 2026-05-19:

- `parseMoneyInput` movido para `packages/shared/src/parse-money.ts` e exportado via barrel.
- `_validators.ts` ganhou:
  - `moneyPreprocess` (interno): trim → vazio vira `undefined`, demais entram em `parseMoneyInput`.
  - `decimalString`, `positiveDecimalString`, `nonNegativeDecimalString` agora embrulhados em `z.preprocess(moneyPreprocess, ...)`.
  - Novo `optionalPositiveDecimalString` cujo preprocess mapeia `""` para `null` (em vez de `undefined`), e cujo schema interno é `.nullable()`. Usado em `Cri.valorNominal`.
- `apps/web/src/lib/parse-money.ts` deletado; testes Vitest agora importam de `@assets-db/shared` (continuam passando: 21/21).
- `CriForm.onSubmit` e `EventoForm.onSubmit` simplificados: removidas as chamadas a `parseMoneyInput` para `precoAquisicao`/`valorNominal`/`taxa`/`valor`. Sobreviveu apenas o tratamento de strings opcionais não-monetárias (`emissor`, `observacoes`).

**Smoke test no browser (usuário, após reinício do dev server):**
- Vírgula em `precoAquisicao` (`1043,62`), `valorNominal` (`500,75`), `taxa` (`8,5`) e `valor` (evento, `12,34`) — todos aceitos e salvos como decimal canônico.
- `valorNominal` deixado em branco → salvo como `null`, detalhe exibe `—`.
- Regressão de datas (`15/03/26`) continua funcionando.

### Implicação arquitetural assumida

- A spec 004 dizia "API continua estrita". A 006 inverte essa decisão pela razão prática: API e Web compartilham o mesmo schema Zod. A API agora também aceita `"1043,62"` em payloads JSON. Trade-off: menos código, menos duplicação, sem fricção para o usuário. Documentado no início desta spec.

## Pendências geradas

Nenhuma. Persiste o erro pré-existente de typecheck em `apps/web/src/components/ui/calendar.tsx` (incompatibilidade shadcn × `react-day-picker` types) — fora de escopo, registrado já na 004.
