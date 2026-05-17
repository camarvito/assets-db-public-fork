// Helpers internos de validação Zod reusados pelos schemas de domínio.
// Não exportar via barrel (index.ts) — uso restrito a esse pacote.

import { z } from 'zod';

const decimalRegex = /^\d+(\.\d+)?$/;

export const decimalString = z
  .string()
  .regex(decimalRegex, 'Deve ser um número decimal (ex: "1234.56")');

export const positiveDecimalString = decimalString.refine(
  (v) => Number.parseFloat(v) > 0,
  'Deve ser maior que zero',
);

export const nonNegativeDecimalString = decimalString.refine(
  (v) => Number.parseFloat(v) >= 0,
  'Deve ser maior ou igual a zero',
);

export const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato esperado: YYYY-MM-DD)')
  .refine(
    (v) => !Number.isNaN(new Date(v + 'T00:00:00Z').getTime()),
    'Data inválida',
  );
