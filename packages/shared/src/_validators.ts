import { z } from 'zod';
import { parseMoneyInput } from './parse-money.js';

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

// For optional fields: maps "" to `null` (not undefined) so `.nullable()` on
// the inner schema accepts it. Do NOT wrap with `.optional()` — form
// defaultValues are usually "" rather than undefined, so `.nullable()` suffices.
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
