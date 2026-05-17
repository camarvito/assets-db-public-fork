'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  CriInputSchema,
  INSTITUICAO_LABELS,
  InstituicaoSchema,
  REMUNERACAO_PRESETS,
  type CriInput,
  type CriResponse,
} from '@assets-db/shared';
import { useCreateCri, useUpdateCri } from '@/hooks/use-cris';
import { ApiError } from '@/lib/api/cris';
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

type Mode = { kind: 'create' } | { kind: 'edit'; id: string; initial: CriResponse };

interface CriFormProps {
  mode: Mode;
}

// Defaults para o formulário em modo create.
const EMPTY_DEFAULTS: CriInput = {
  codigo: '',
  emissor: '',
  instituicao: 'XP',
  quantidade: null,
  precoAquisicao: '',
  dataAquisicao: '',
  observacoes: '',
  valorNominal: '1000',
  dataVencimento: '',
  indexador: 'PREFIXADO',
  tipoTaxa: 'PRE',
  taxa: '',
};

// Para edição de registros legados (sem `instituicao`), seleciona XP como default
// — o usuário ajusta antes de salvar.
function toDefaults(initial: CriResponse): CriInput {
  return {
    codigo: initial.codigo,
    emissor: initial.emissor,
    instituicao: initial.instituicao ?? 'XP',
    quantidade: initial.quantidade,
    precoAquisicao: initial.precoAquisicao,
    dataAquisicao: initial.dataAquisicao,
    observacoes: initial.observacoes ?? '',
    valorNominal: initial.valorNominal,
    dataVencimento: initial.dataVencimento,
    indexador: initial.indexador,
    tipoTaxa: initial.tipoTaxa,
    taxa: initial.taxa,
  };
}

// Aceita vírgula como separador decimal (UX pt-BR) e normaliza para ponto.
function normalizeDecimal(v: string): string {
  return v.replace(',', '.').trim();
}

export function CriForm({ mode }: CriFormProps) {
  const router = useRouter();

  const form = useForm<CriInput>({
    resolver: zodResolver(CriInputSchema),
    defaultValues: mode.kind === 'create' ? EMPTY_DEFAULTS : toDefaults(mode.initial),
  });

  const createMutation = useCreateCri();
  const updateMutation = useUpdateCri(mode.kind === 'edit' ? mode.id : '');
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Preset atual (deriva da combinação indexador + tipoTaxa).
  const indexador = form.watch('indexador');
  const tipoTaxa = form.watch('tipoTaxa');
  const currentPreset = REMUNERACAO_PRESETS.find(
    (p) => p.indexador === indexador && p.tipoTaxa === tipoTaxa,
  );

  async function onSubmit(values: CriInput) {
    // Normalizar decimais antes de enviar.
    const payload: CriInput = {
      ...values,
      precoAquisicao: normalizeDecimal(values.precoAquisicao),
      valorNominal: normalizeDecimal(values.valorNominal),
      taxa: normalizeDecimal(values.taxa),
      observacoes: values.observacoes?.trim() ? values.observacoes : null,
    };

    try {
      if (mode.kind === 'create') {
        const created = await createMutation.mutateAsync(payload);
        toast.success('CRI cadastrado');
        router.push(`/cris/${created.id}`);
      } else {
        const updated = await updateMutation.mutateAsync(payload);
        toast.success('CRI atualizado');
        router.push(`/cris/${updated.id}`);
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

  const cancelHref = mode.kind === 'create' ? '/cris' : `/cris/${mode.id}`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="CRI23A001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emissor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emissor</FormLabel>
                <FormControl>
                  <Input placeholder="Securitizadora Alpha SA" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="valorNominal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor nominal (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="1000,00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="precoAquisicao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço de aquisição unitário (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="990,00"
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
