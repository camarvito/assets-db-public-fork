import { z } from 'zod';
import { isoDateString, positiveDecimalString } from './_validators.js';

export const TipoEventoSchema = z.enum(['JUROS', 'AMORTIZACAO'], {
  errorMap: () => ({ message: 'Selecione um tipo' }),
});
export type TipoEvento = z.infer<typeof TipoEventoSchema>;

export const TIPO_EVENTO_LABELS: Record<TipoEvento, string> = {
  JUROS: 'Juros',
  AMORTIZACAO: 'Amortização',
};

const eventoInputBase = z.object({
  tipo: TipoEventoSchema,
  data: isoDateString,
  valor: positiveDecimalString,
  observacoes: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .nullable()
    .optional(),
});

export const EventoInputSchema = eventoInputBase;
export type EventoInput = z.infer<typeof EventoInputSchema>;

export const EventoResponseSchema = eventoInputBase.extend({
  id: z.string(),
  ativoId: z.string(),
  criadoEm: z.string(), // ISO 8601 datetime
  atualizadoEm: z.string(), // ISO 8601 datetime
});
export type EventoResponse = z.infer<typeof EventoResponseSchema>;
