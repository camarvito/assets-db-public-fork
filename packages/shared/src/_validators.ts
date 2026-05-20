// Helpers internos de validação Zod reusados pelos schemas de domínio.
// Não exportar via barrel (index.ts) — uso restrito a esse pacote.

import { z } from 'zod';
import { parseMoneyInput } from './parse-money';

const decimalRegex = /^\d+(\.\d+)?$/;

// Preprocessador padrão de monetários:
// - Não-string passa direto (Zod lida com o tipo inválido).
// - String vazia (após trim) vira `undefined` — campo obrigatório falha com
//   "Required"; campo opcional aceita.
// - Demais entradas passam por parseMoneyInput (aceita "," e "." conforme
//   regras da spec 004).
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

// Variante para campos opcionais: mapeia "" para `null` (em vez de undefined),
// e o schema interno tem `.nullable()` para aceitar.
// Use sem `.optional()` em cima — o defaultValues do form costuma ser "",
// nunca undefined, então .nullable() basta.
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

export const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato esperado: YYYY-MM-DD)')
  .refine(
    (v) => !Number.isNaN(new Date(v + 'T00:00:00Z').getTime()),
    'Data inválida',
  );
