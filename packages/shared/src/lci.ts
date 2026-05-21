import { z } from 'zod';
import { AtivoBaseInputSchema } from './ativo.js';
import {
  AtivoRendaFixaInputSchema,
  applyRendaFixaCrossValidation,
} from './ativo-renda-fixa.js';

// LCI não tem extras (não há emissor — a "instituição custodiante" é a
// emissora — não há quantidade nem valor nominal pertinentes hoje).
// A tabela `lcis` é marcadora: existe para discriminar tipo e preparar
// terreno pra campos futuros (carência, prazo de resgate, etc.).

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
