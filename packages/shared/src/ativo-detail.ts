import { z } from 'zod';
import { AtivoBaseInputSchema, TipoAtivoSchema, InstituicaoSchema } from './ativo.js';
import { AtivoRendaFixaInputSchema } from './ativo-renda-fixa.js';
import { CriResponseSchema } from './cri.js';
import { CraResponseSchema } from './cra.js';
import { LciResponseSchema } from './lci.js';
import { LcaResponseSchema } from './lca.js';

export const AtivoResponseSchema = z.discriminatedUnion('tipo', [
  CriResponseSchema,
  CraResponseSchema,
  LciResponseSchema,
  LcaResponseSchema,
]);
export type AtivoResponse = z.infer<typeof AtivoResponseSchema>;

export const AtivoListItemSchema = AtivoBaseInputSchema
  .merge(AtivoRendaFixaInputSchema)
  .extend({
    id: z.string(),
    tipo: TipoAtivoSchema,
    criadoEm: z.string(),
    atualizadoEm: z.string(),
  });
export type AtivoListItem = z.infer<typeof AtivoListItemSchema>;

export const AtivoListQuerySchema = z.object({
  tipo: TipoAtivoSchema.optional(),
  indexador: z.enum(['PREFIXADO', 'CDI', 'IPCA']).optional(),
  instituicao: InstituicaoSchema.optional(),
  vencimentoAte: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)')
    .optional(),
});
export type AtivoListQuery = z.infer<typeof AtivoListQuerySchema>;
