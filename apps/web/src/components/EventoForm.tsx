'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  EventoInputSchema,
  TIPO_EVENTO_LABELS,
  TipoEventoSchema,
  type EventoInput,
  type EventoResponse,
} from '@assets-db/shared';
import { useCreateEvento, useUpdateEvento } from '@/hooks/use-eventos';
import { ApiError } from '@/lib/api/_client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type Mode =
  | { kind: 'create' }
  | { kind: 'edit'; eventoId: string; initial: EventoResponse };

interface EventoFormProps {
  criId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
}

const EMPTY_DEFAULTS: Partial<EventoInput> = {
  tipo: undefined,
  data: '',
  valor: '',
  observacoes: '',
};

function toDefaults(initial: EventoResponse): Partial<EventoInput> {
  return {
    tipo: initial.tipo,
    data: initial.data,
    valor: initial.valor,
    observacoes: initial.observacoes ?? '',
  };
}

export function EventoForm({ criId, open, onOpenChange, mode }: EventoFormProps) {
  const form = useForm<EventoInput>({
    resolver: zodResolver(EventoInputSchema),
    defaultValues:
      mode.kind === 'create' ? EMPTY_DEFAULTS : toDefaults(mode.initial),
  });

  // Resetar form quando muda de modo ou abre/fecha (ex: editar outro evento).
  useEffect(() => {
    if (open) {
      form.reset(
        mode.kind === 'create' ? EMPTY_DEFAULTS : toDefaults(mode.initial),
      );
    }
  }, [open, mode, form]);

  const createMutation = useCreateEvento(criId);
  const updateMutation = useUpdateEvento(
    criId,
    mode.kind === 'edit' ? mode.eventoId : '',
  );
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: EventoInput) {
    // Zod (preprocess) já normalizou `valor`.
    const payload: EventoInput = {
      ...values,
      observacoes: values.observacoes?.trim() ? values.observacoes : null,
    };

    try {
      if (mode.kind === 'create') {
        await createMutation.mutateAsync(payload);
        toast.success('Evento registrado');
      } else {
        await updateMutation.mutateAsync(payload);
        toast.success('Evento atualizado');
      }
      onOpenChange(false);
    } catch (err) {
      // Validação cruzada server-side (data < dataAquisicao) vem como 400
      // com formato Zod compatível ({ error, issues: [{ path, message }] }).
      if (err instanceof ApiError && err.status === 400) {
        const payload = err.payload as
          | { issues?: Array<{ path: Array<string | number>; message: string }> }
          | null;
        const issues = payload?.issues ?? [];
        let handled = false;
        for (const issue of issues) {
          const key = issue.path?.[0];
          if (typeof key === 'string') {
            form.setError(key as keyof EventoInput, { message: issue.message });
            handled = true;
          }
        }
        if (handled) return;
      }
      toast.error('Erro ao salvar', {
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    }
  }

  const title = mode.kind === 'create' ? 'Novo evento' : 'Editar evento';
  const description =
    mode.kind === 'create'
      ? 'Registre um pagamento de juros ou amortização recebido.'
      : 'Atualize os dados do evento.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TipoEventoSchema.options.map((key) => (
                        <SelectItem key={key} value={key}>
                          {TIPO_EVENTO_LABELS[key]}
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
              name="data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <DatePicker value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="60,50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações livres"
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
