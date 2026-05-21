import { z } from 'zod';
import {
  isoDateString,
  nonNegativeDecimalString,
} from './_validators.js';

// =====================================================
// Enums da família renda fixa
// =====================================================

export const IndexadorSchema = z.enum(['PREFIXADO', 'CDI', 'IPCA']);
export type Indexador = z.infer<typeof IndexadorSchema>;

export const TipoTaxaSchema = z.enum(['PRE', 'POS_PERCENTUAL', 'POS_SPREAD']);
export type TipoTaxa = z.infer<typeof TipoTaxaSchema>;

export const PeriodicidadeJurosSchema = z.enum(
  ['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'BULLET'],
  { errorMap: () => ({ message: 'Selecione uma periodicidade' }) },
);
export type PeriodicidadeJuros = z.infer<typeof PeriodicidadeJurosSchema>;

// =====================================================
// Labels
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

export const PERIODICIDADE_JUROS_LABELS: Record<PeriodicidadeJuros, string> = {
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  BULLET: 'Bullet (só no vencimento)',
};

// Presets exibidos no select "Remuneração" do formulário.
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
// Schema base: campos comuns à camada de renda fixa.
// Comporta com AtivoBaseInputSchema para formar a entrada
// completa de um título (CRI/CRA/LCI/LCA).
// =====================================================

export const AtivoRendaFixaInputSchema = z.object({
  dataVencimento: isoDateString,
  indexador: IndexadorSchema,
  tipoTaxa: TipoTaxaSchema,
  taxa: nonNegativeDecimalString,
  periodicidadeJuros: PeriodicidadeJurosSchema.nullable().optional(),
});

export type AtivoRendaFixaInput = z.infer<typeof AtivoRendaFixaInputSchema>;

// =====================================================
// Validações cruzadas comuns à família renda fixa.
// Aplicadas após o merge com AtivoBaseInputSchema, já que
// uma delas (dataVencimento × dataAquisicao) cruza camadas.
//
// Mantemos a constraint do generic apenas em ZodTypeAny
// para preservar o tipo de saída do schema original
// (uma constraint estreita força TS a inferir T como o
// tipo restritivo, perdendo os campos extras).
// =====================================================

type RendaFixaDataShape = {
  dataAquisicao: string;
  dataVencimento: string;
  indexador: Indexador;
  tipoTaxa: TipoTaxa;
};

export function applyRendaFixaCrossValidation<T extends z.ZodTypeAny>(
  schema: T,
) {
  return schema.superRefine((data, ctx) => {
    const d = data as RendaFixaDataShape;
    if (new Date(d.dataVencimento) <= new Date(d.dataAquisicao)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data de vencimento deve ser posterior à data de aquisição',
        path: ['dataVencimento'],
      });
    }

    if (d.indexador === 'PREFIXADO' && d.tipoTaxa !== 'PRE') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indexador PREFIXADO exige tipoTaxa = PRE',
        path: ['tipoTaxa'],
      });
    }

    if (
      (d.indexador === 'CDI' || d.indexador === 'IPCA') &&
      d.tipoTaxa === 'PRE'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indexador CDI/IPCA exige tipoTaxa = POS_PERCENTUAL ou POS_SPREAD',
        path: ['tipoTaxa'],
      });
    }
  });
}
