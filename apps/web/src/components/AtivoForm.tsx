'use client';

import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  CraInputSchema,
  CriInputSchema,
  INSTITUICAO_LABELS,
  InstituicaoSchema,
  LcaInputSchema,
  LciInputSchema,
  PERIODICIDADE_JUROS_LABELS,
  PeriodicidadeJurosSchema,
  REMUNERACAO_PRESETS,
  type CriInput,
  type TipoAtivo,
} from '@assets-db/shared';
import {
  useCreateAtivo,
  useUpdateAtivo,
} from '@/hooks/use-ativos';
import {
  ApiError,
  type AtivoInputByTipo,
  type AtivoResponseByTipo,
} from '@/lib/api/ativos';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';

// The form operates on the superset (CriInput) — all four asset types share
// every visible field except `emissor` / `quantidade` / `valorNominal`, which
// are hidden for LCI/LCA. On submit, those fields are dropped when the type
// doesn't support them.
type FormValues = CriInput;

type Mode<T extends TipoAtivo> =
  | { kind: 'create' }
  | { kind: 'edit'; id: string; initial: AtivoResponseByTipo[T] };

interface AtivoFormProps<T extends TipoAtivo> {
  tipo: T;
  mode: Mode<T>;
}

const SCHEMA_BY_TIPO = {
  CRI: CriInputSchema,
  CRA: CraInputSchema,
  LCI: LciInputSchema,
  LCA: LcaInputSchema,
} as const;

const PATH_PLURAL: Record<TipoAtivo, string> = {
  CRI: 'cris',
  CRA: 'cras',
  LCI: 'lcis',
  LCA: 'lcas',
};

const TIPO_DESCRICAO: Record<TipoAtivo, string> = {
  CRI: 'Certificado de Recebíveis Imobiliários',
  CRA: 'Certificado de Recebíveis do Agronegócio',
  LCI: 'Letra de Crédito Imobiliário',
  LCA: 'Letra de Crédito do Agronegócio',
};

export const TIPO_NOME_LONGO = TIPO_DESCRICAO;

const NONE_SENTINEL = '__none__';

function hasExtras(tipo: TipoAtivo): boolean {
  return tipo === 'CRI' || tipo === 'CRA';
}

const EMPTY_DEFAULTS_BASE: Partial<FormValues> = {
  codigo: '',
  nome: '',
  precoAquisicao: '',
  dataAquisicao: '',
  observacoes: '',
  dataVencimento: '',
  indexador: 'PREFIXADO',
  tipoTaxa: 'PRE',
  taxa: '',
  periodicidadeJuros: undefined,
};

function emptyDefaults(tipo: TipoAtivo): Partial<FormValues> {
  if (hasExtras(tipo)) {
    return {
      ...EMPTY_DEFAULTS_BASE,
      emissor: '',
      quantidade: 1,
      valorNominal: '',
    };
  }
  return EMPTY_DEFAULTS_BASE;
}

function initialDefaults<T extends TipoAtivo>(
  tipo: T,
  initial: AtivoResponseByTipo[T],
): Partial<FormValues> {
  // `initial` is typed by `tipo`: CRI/CRA carry emissor/etc., LCI/LCA do not.
  // Pragmatic cast — we only read fields that actually exist for each type.
  const i = initial as AtivoResponseByTipo['CRI'];
  const base: Partial<FormValues> = {
    codigo: i.codigo,
    nome: i.nome,
    instituicao: i.instituicao,
    precoAquisicao: i.precoAquisicao,
    dataAquisicao: i.dataAquisicao,
    observacoes: i.observacoes ?? '',
    dataVencimento: i.dataVencimento,
    indexador: i.indexador,
    tipoTaxa: i.tipoTaxa,
    taxa: i.taxa,
    periodicidadeJuros: i.periodicidadeJuros ?? undefined,
  };
  if (hasExtras(tipo)) {
    return {
      ...base,
      emissor: i.emissor ?? '',
      quantidade: i.quantidade ?? null,
      valorNominal: i.valorNominal ?? '',
    };
  }
  return base;
}

export function AtivoForm<T extends TipoAtivo>({
  tipo,
  mode,
}: AtivoFormProps<T>) {
  const router = useRouter();
  const showExtras = hasExtras(tipo);

  const form = useForm<FormValues>({
    resolver: zodResolver(SCHEMA_BY_TIPO[tipo]) as Resolver<FormValues>,
    defaultValues:
      mode.kind === 'create' ? emptyDefaults(tipo) : initialDefaults(tipo, mode.initial),
  });

  const createMutation = useCreateAtivo(tipo);
  const updateMutation = useUpdateAtivo(
    tipo,
    mode.kind === 'edit' ? mode.id : '',
  );
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const indexador = form.watch('indexador');
  const tipoTaxa = form.watch('tipoTaxa');
  const currentPreset = REMUNERACAO_PRESETS.find(
    (p) => p.indexador === indexador && p.tipoTaxa === tipoTaxa,
  );

  async function onSubmit(values: FormValues) {
    // For LCI/LCA drop the extra fields before sending (the API rejects them
    // per the per-type schema). For CRI/CRA normalize empty strings to null.
    const baseData = {
      codigo: values.codigo,
      nome: values.nome,
      instituicao: values.instituicao,
      observacoes: values.observacoes?.trim() ? values.observacoes : null,
      precoAquisicao: values.precoAquisicao,
      dataAquisicao: values.dataAquisicao,
      dataVencimento: values.dataVencimento,
      indexador: values.indexador,
      tipoTaxa: values.tipoTaxa,
      taxa: values.taxa,
      periodicidadeJuros: values.periodicidadeJuros ?? null,
    };

    const data = (
      showExtras
        ? {
            ...baseData,
            emissor: values.emissor?.trim() ? values.emissor : null,
            quantidade: values.quantidade ?? null,
            valorNominal: values.valorNominal,
          }
        : baseData
    ) as AtivoInputByTipo[T];

    try {
      if (mode.kind === 'create') {
        const created = await createMutation.mutateAsync(data);
        toast.success(`${tipo} cadastrado`);
        router.push(`/${PATH_PLURAL[tipo]}/${created.id}`);
      } else {
        const updated = await updateMutation.mutateAsync(data);
        toast.success(`${tipo} atualizado`);
        router.push(`/${PATH_PLURAL[tipo]}/${updated.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const payload = err.payload as { field?: string } | null;
        if (payload?.field === 'codigo') {
          form.setError('codigo', { message: 'Este código já está em uso' });
          return;
        }
      }
      toast.error('Erro ao salvar', {
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    }
  }

  const cancelHref =
    mode.kind === 'create'
      ? '/ativos'
      : `/${PATH_PLURAL[tipo]}/${mode.id}`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder={`${tipo} exemplo`} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder={`${tipo}23A001`} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {showExtras && (
            <FormField
              control={form.control}
              name="emissor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emissor (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Securitizadora Alpha SA"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="instituicao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instituição</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {InstituicaoSchema.options.map((key) => (
                      <SelectItem key={key} value={key}>
                        {INSTITUICAO_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="indexador"
            render={() => (
              <FormItem>
                <FormLabel>Remuneração</FormLabel>
                <Select
                  value={currentPreset?.key}
                  onValueChange={(key) => {
                    const preset = REMUNERACAO_PRESETS.find((p) => p.key === key);
                    if (!preset) return;
                    form.setValue('indexador', preset.indexador, { shouldValidate: true });
                    form.setValue('tipoTaxa', preset.tipoTaxa, { shouldValidate: true });
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {REMUNERACAO_PRESETS.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taxa ({currentPreset?.taxaLabel ?? '—'})</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="6,5"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {showExtras && (
            <FormField
              control={form.control}
              name="valorNominal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor nominal (R$) (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="1000,00"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {showExtras && (
            <FormField
              control={form.control}
              name="quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        field.onChange(raw === '' ? null : Number.parseInt(raw, 10));
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="precoAquisicao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {showExtras ? 'Preço de aquisição unitário (R$)' : 'Valor aplicado (R$)'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={showExtras ? '990,00' : '5000,00'}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataAquisicao"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de aquisição</FormLabel>
                <DatePicker value={field.value} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataVencimento"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de vencimento</FormLabel>
                <DatePicker value={field.value} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="periodicidadeJuros"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Periodicidade de juros (opcional)</FormLabel>
                <Select
                  value={field.value ?? undefined}
                  onValueChange={(v) =>
                    field.onChange(v === NONE_SENTINEL ? null : v)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_SENTINEL}>
                      Limpar seleção
                    </SelectItem>
                    {PeriodicidadeJurosSchema.options.map((key) => (
                      <SelectItem key={key} value={key}>
                        {PERIODICIDADE_JUROS_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Anotações livres sobre o título"
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(cancelHref)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </form>
    </Form>
  );
}
