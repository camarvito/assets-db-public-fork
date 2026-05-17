import { z } from 'zod';
import {
  isoDateString,
  nonNegativeDecimalString,
  positiveDecimalString,
} from './_validators';

// =====================================================
// Enums
// =====================================================

export const TipoAtivoSchema = z.enum(['CRI']);
export type TipoAtivo = z.infer<typeof TipoAtivoSchema>;

export const IndexadorSchema = z.enum(['PREFIXADO', 'CDI', 'IPCA']);
export type Indexador = z.infer<typeof IndexadorSchema>;

export const TipoTaxaSchema = z.enum(['PRE', 'POS_PERCENTUAL', 'POS_SPREAD']);
export type TipoTaxa = z.infer<typeof TipoTaxaSchema>;

export const InstituicaoSchema = z.enum(
  ['INTER', 'XP', 'NUBANK', 'GCB', 'CLEAR', 'SOFISA', 'BMG', 'VEST'],
  { errorMap: () => ({ message: 'Selecione uma instituição' }) },
);
export type Instituicao = z.infer<typeof InstituicaoSchema>;

export const PeriodicidadeJurosSchema = z.enum(
  ['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'BULLET'],
  { errorMap: () => ({ message: 'Selecione uma periodicidade' }) },
);
export type PeriodicidadeJuros = z.infer<typeof PeriodicidadeJurosSchema>;

// =====================================================
// Labels para UI / mensagens
// =====================================================

export const INDEXADOR_LABELS: Record<Indexador, string> = {
  PREFIXADO: 'Prefixado',
  CDI: 'CDI',
  IPCA: 'IPCA',
};

export const TIPO_TAXA_LABELS: Record<TipoTaxa, string> = {
  PRE: 'Prefixado',
  POS_PERCENTUAL: 'Pós-fixado (% do indexador)',
  POS_SPREAD: 'Pós-fixado (indexador + spread)',
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

export const PERIODICIDADE_JUROS_LABELS: Record<PeriodicidadeJuros, string> = {
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  BULLET: 'Bullet (só no vencimento)',
};

// Presets exibidos no select "Remuneração" do formulário (ver spec 001).
// Cada preset mapeia para uma combinação (indexador, tipoTaxa).
export const REMUNERACAO_PRESETS = [
  { key: 'PREFIXADO', label: 'Prefixado', indexador: 'PREFIXADO', tipoTaxa: 'PRE', taxaLabel: '% a.a.' },
  { key: 'CDI_PERCENTUAL', label: '% do CDI', indexador: 'CDI', tipoTaxa: 'POS_PERCENTUAL', taxaLabel: '% do CDI' },
  { key: 'CDI_SPREAD', label: 'CDI + spread', indexador: 'CDI', tipoTaxa: 'POS_SPREAD', taxaLabel: '+ % a.a.' },
  { key: 'IPCA_SPREAD', label: 'IPCA + spread', indexador: 'IPCA', tipoTaxa: 'POS_SPREAD', taxaLabel: '+ % a.a.' },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  indexador: Indexador;
  tipoTaxa: TipoTaxa;
  taxaLabel: string;
}>;

export type RemuneracaoPresetKey = (typeof REMUNERACAO_PRESETS)[number]['key'];

// =====================================================
// Schemas — Input (POST/PUT body)
// =====================================================

const criInputBase = z.object({
  codigo: z.string().min(1, 'Obrigatório').max(50, 'Máximo 50 caracteres'),
  nome: z.string().min(1, 'Obrigatório').max(200, 'Máximo 200 caracteres'),
  emissor: z.string().max(200, 'Máximo 200 caracteres').nullable().optional(),
  instituicao: InstituicaoSchema,
  quantidade: z
    .number()
    .int('Deve ser inteiro')
    .positive('Deve ser maior que zero')
    .nullable()
    .optional(),
  precoAquisicao: positiveDecimalString,
  dataAquisicao: isoDateString,
  observacoes: z.string().max(1000, 'Máximo 1000 caracteres').nullable().optional(),
  valorNominal: positiveDecimalString.nullable().optional(),
  dataVencimento: isoDateString,
  indexador: IndexadorSchema,
  tipoTaxa: TipoTaxaSchema,
  taxa: nonNegativeDecimalString,
  periodicidadeJuros: PeriodicidadeJurosSchema.nullable().optional(),
});

// Validações cruzadas:
//  - dataVencimento > dataAquisicao
//  - consistência indexador × tipoTaxa
export const CriInputSchema = criInputBase.superRefine((data, ctx) => {
  if (new Date(data.dataVencimento) <= new Date(data.dataAquisicao)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Data de vencimento deve ser posterior à data de aquisição',
      path: ['dataVencimento'],
    });
  }

  if (data.indexador === 'PREFIXADO' && data.tipoTaxa !== 'PRE') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Indexador PREFIXADO exige tipoTaxa = PRE',
      path: ['tipoTaxa'],
    });
  }

  if (
    (data.indexador === 'CDI' || data.indexador === 'IPCA') &&
    data.tipoTaxa === 'PRE'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Indexador CDI/IPCA exige tipoTaxa = POS_PERCENTUAL ou POS_SPREAD',
      path: ['tipoTaxa'],
    });
  }
});

export type CriInput = z.infer<typeof CriInputSchema>;

// =====================================================
// Schemas — Response (GET / POST 201 / PUT 200)
// =====================================================

export const CriResponseSchema = criInputBase.extend({
  id: z.string(),
  // Pode vir null em registros anteriores à introdução do campo.
  instituicao: InstituicaoSchema.nullable(),
  criadoEm: z.string(), // ISO 8601 datetime
  atualizadoEm: z.string(), // ISO 8601 datetime
});

export type CriResponse = z.infer<typeof CriResponseSchema>;
