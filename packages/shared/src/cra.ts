import { z } from 'zod';
import { optionalPositiveDecimalString } from './_validators.js';
import { AtivoBaseInputSchema } from './ativo.js';
import {
  AtivoRendaFixaInputSchema,
  applyRendaFixaCrossValidation,
} from './ativo-renda-fixa.js';

// Estrutura idêntica à de CRI (ver `cri.ts`). Mantida em arquivo próprio
// porque os tipos inferidos são distintos e cada um casa com sua rota REST.

export const CraExtrasInputSchema = z.object({
  emissor: z.string().max(200, 'Máximo 200 caracteres').nullable().optional(),
  quantidade: z
    .number()
    .int('Deve ser inteiro')
    .positive('Deve ser maior que zero')
    .nullable()
    .optional(),
  valorNominal: optionalPositiveDecimalString,
});

const craInputBase = AtivoBaseInputSchema
  .merge(AtivoRendaFixaInputSchema)
  .merge(CraExtrasInputSchema);

export const CraInputSchema = applyRendaFixaCrossValidation(craInputBase);
export type CraInput = z.infer<typeof CraInputSchema>;

export const CraResponseSchema = craInputBase.extend({
  id: z.string(),
  tipo: z.literal('CRA'),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
});

export type CraResponse = z.infer<typeof CraResponseSchema>;
