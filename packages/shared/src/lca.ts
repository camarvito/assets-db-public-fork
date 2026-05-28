import { z } from 'zod';
import { AtivoBaseInputSchema } from './ativo.js';
import {
  AtivoRendaFixaInputSchema,
  applyRendaFixaCrossValidation,
} from './ativo-renda-fixa.js';

const lcaInputBase = AtivoBaseInputSchema.merge(AtivoRendaFixaInputSchema);

export const LcaInputSchema = applyRendaFixaCrossValidation(lcaInputBase);
export type LcaInput = z.infer<typeof LcaInputSchema>;

export const LcaResponseSchema = lcaInputBase.extend({
  id: z.string(),
  tipo: z.literal('LCA'),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
});

export type LcaResponse = z.infer<typeof LcaResponseSchema>;
