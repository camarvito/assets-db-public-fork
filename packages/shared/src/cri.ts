import { z } from 'zod';
import { optionalPositiveDecimalString } from './_validators.js';
import { AtivoBaseInputSchema } from './ativo.js';
import {
  AtivoRendaFixaInputSchema,
  applyRendaFixaCrossValidation,
} from './ativo-renda-fixa.js';

// =====================================================
// Campos extras específicos de CRI
// =====================================================

export const CriExtrasInputSchema = z.object({
  emissor: z.string().max(200, 'Máximo 200 caracteres').nullable().optional(),
  quantidade: z
    .number()
    .int('Deve ser inteiro')
    .positive('Deve ser maior que zero')
    .nullable()
    .optional(),
  valorNominal: optionalPositiveDecimalString,
});

// =====================================================
// Input (POST/PUT body)
// =====================================================

const criInputBase = AtivoBaseInputSchema
  .merge(AtivoRendaFixaInputSchema)
  .merge(CriExtrasInputSchema);

export const CriInputSchema = applyRendaFixaCrossValidation(criInputBase);
export type CriInput = z.infer<typeof CriInputSchema>;

// =====================================================
// Response (GET / POST 201 / PUT 200)
// =====================================================

export const CriResponseSchema = criInputBase.extend({
  id: z.string(),
  tipo: z.literal('CRI'),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
});

export type CriResponse = z.infer<typeof CriResponseSchema>;
