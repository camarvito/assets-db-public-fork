import { z } from 'zod';
import { AtivoBaseInputSchema } from './ativo.js';
import {
  AtivoRendaFixaInputSchema,
  applyRendaFixaCrossValidation,
} from './ativo-renda-fixa.js';

// LCI carries no extra fields today (no `emissor` — the holding institution
// itself is the issuer — and no quantity/face value). The `lcis` table is a
// marker: it exists to discriminate the asset type and reserve a place for
// future fields (lock-up period, redemption term, etc.).
const lciInputBase = AtivoBaseInputSchema.merge(AtivoRendaFixaInputSchema);

export const LciInputSchema = applyRendaFixaCrossValidation(lciInputBase);
export type LciInput = z.infer<typeof LciInputSchema>;

export const LciResponseSchema = lciInputBase.extend({
  id: z.string(),
  tipo: z.literal('LCI'),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
});

export type LciResponse = z.infer<typeof LciResponseSchema>;
