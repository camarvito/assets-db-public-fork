import { z } from 'zod';
import { isoDateString, positiveDecimalString } from './_validators.js';

export const TipoAtivoSchema = z.enum(['CRI', 'CRA', 'LCI', 'LCA']);
export type TipoAtivo = z.infer<typeof TipoAtivoSchema>;

export const InstituicaoSchema = z.enum(
  ['INTER', 'XP', 'NUBANK', 'GCB', 'CLEAR', 'SOFISA', 'BMG', 'VEST'],
  { errorMap: () => ({ message: 'Selecione uma instituição' }) },
);
export type Instituicao = z.infer<typeof InstituicaoSchema>;

export const TIPO_ATIVO_LABELS: Record<TipoAtivo, string> = {
  CRI: 'CRI',
  CRA: 'CRA',
  LCI: 'LCI',
  LCA: 'LCA',
};

export const INSTITUICAO_LABELS: Record<Instituicao, string> = {
  INTER: 'Inter',
  XP: 'XP',
  NUBANK: 'Nubank',
  GCB: 'GCB',
  CLEAR: 'Clear',
  SOFISA: 'Sofisa',
  BMG: 'BMG',
  VEST: 'Vest',
};

export const AtivoBaseInputSchema = z.object({
  codigo: z.string().min(1, 'Obrigatório').max(50, 'Máximo 50 caracteres'),
  nome: z.string().min(1, 'Obrigatório').max(200, 'Máximo 200 caracteres'),
  instituicao: InstituicaoSchema,
  observacoes: z.string().max(1000, 'Máximo 1000 caracteres').nullable().optional(),
  precoAquisicao: positiveDecimalString,
  dataAquisicao: isoDateString,
});

export type AtivoBaseInput = z.infer<typeof AtivoBaseInputSchema>;
