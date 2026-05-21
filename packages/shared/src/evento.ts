import { z } from 'zod';
import { isoDateString, positiveDecimalString } from './_validators.js';

// =====================================================
// Enums
// =====================================================

export const TipoEventoSchema = z.enum(['JUROS', 'AMORTIZACAO'], {
  errorMap: () => ({ message: 'Selecione um tipo' }),
});
export type TipoEvento = z.infer<typeof TipoEventoSchema>;

// =====================================================
// Labels para UI
// =====================================================

export const TIPO_EVENTO_LABELS: Record<TipoEvento, string> = {
  JUROS: 'Juros',
  AMORTIZACAO: 'Amortização',
};

// =====================================================
// Schemas — Input (POST/PUT body)
// =====================================================

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

// =====================================================
// Schemas — Response
// =====================================================

export const EventoResponseSchema = eventoInputBase.extend({
  id: z.string(),
  ativoId: z.string(),
  criadoEm: z.string(), // ISO 8601 datetime
  atualizadoEm: z.string(), // ISO 8601 datetime
});
export type EventoResponse = z.infer<typeof EventoResponseSchema>;
