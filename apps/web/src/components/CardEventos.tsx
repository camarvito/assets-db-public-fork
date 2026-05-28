'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatCurrencyBRL,
  formatDateBR,
  TIPO_EVENTO_LABELS,
  type EventoResponse,
  type TipoAtivo,
} from '@assets-db/shared';
import { useDeleteEvento, useEventos } from '@/hooks/use-eventos';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EventoForm } from '@/components/EventoForm';

type FormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; evento: EventoResponse };

interface CardEventosProps {
  ativoId: string;
  tipoAtivo: TipoAtivo;
}

type FiltroEventos = 'todos' | 'juros' | 'amortizacao';

const FILTRO_OPTIONS: ReadonlyArray<{ value: FiltroEventos; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'juros', label: 'Juros' },
  { value: 'amortizacao', label: 'Amortização' },
];

function parseFiltro(raw: string | null): FiltroEventos {
  if (raw === 'juros' || raw === 'amortizacao') return raw;
  return 'todos';
}

export function CardEventos({ ativoId, tipoAtivo }: CardEventosProps) {
  const { data: eventos, isLoading, isError } = useEventos(ativoId);
  const deleteMutation = useDeleteEvento(ativoId);

  const [formState, setFormState] = useState<FormState>({ kind: 'closed' });
  const [deletando, setDeletando] = useState<EventoResponse | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filtro = parseFiltro(searchParams.get('eventos'));

  function setFiltro(next: FiltroEventos) {
    // 'todos' does not pollute the URL — the param is only set when filtered.
    const target =
      next === 'todos' ? pathname : `${pathname}?eventos=${next}`;
    router.replace(target, { scroll: false });
  }

  // Shortcut Shift+N: opens the new-event modal. Ignored when focus is in an
  // input/textarea/contenteditable, or when another dialog is already open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'N' || !e.shiftKey) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (active?.isContentEditable) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]'))
        return;
      e.preventDefault();
      setFormState({ kind: 'create' });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const eventosFiltrados = useMemo(() => {
    if (!eventos) return eventos;
    if (filtro === 'todos') return eventos;
    const alvo = filtro === 'juros' ? 'JUROS' : 'AMORTIZACAO';
    return eventos.filter((e) => e.tipo === alvo);
  }, [eventos, filtro]);

  const total = eventosFiltrados?.reduce(
    (sum, ev) => sum + Number.parseFloat(ev.valor),
    0,
  );

  async function handleConfirmDelete() {
    if (!deletando) return;
    try {
      await deleteMutation.mutateAsync(deletando.id);
      toast.success('Evento removido');
      setDeletando(null);
    } catch (err) {
      toast.error('Erro ao remover', {
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="flex items-baseline gap-4">
            <CardTitle>Eventos</CardTitle>
            {eventosFiltrados && eventosFiltrados.length > 0 && total != null && (
              <span className="text-sm text-muted-foreground">
                Total{filtro !== 'todos' ? ' (filtrado)' : ''}:{' '}
                <strong className="text-foreground">
                  {formatCurrencyBRL(total.toString())}
                </strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
              Shift + N
            </kbd>
            <Button size="sm" onClick={() => setFormState({ kind: 'create' })}>
              <Plus className="mr-2 h-4 w-4" />
              Novo evento
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {eventos && eventos.length > 0 && (
            <div
              className="mb-4 inline-flex rounded-md border bg-muted p-0.5"
              role="tablist"
              aria-label="Filtrar eventos por tipo"
            >
              {FILTRO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={filtro === opt.value}
                  onClick={() => setFiltro(opt.value)}
                  className={cn(
                    'rounded px-3 py-1 text-sm transition-colors',
                    filtro === opt.value
                      ? 'bg-background font-medium text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
              Erro ao carregar eventos.
            </div>
          )}

          {eventos && eventos.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum evento registrado ainda.
            </p>
          )}

          {eventos &&
            eventos.length > 0 &&
            eventosFiltrados &&
            eventosFiltrados.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum evento de{' '}
                <strong>{filtro === 'juros' ? 'juros' : 'amortização'}</strong>{' '}
                registrado.
              </p>
            )}

          {eventosFiltrados && eventosFiltrados.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventosFiltrados.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>{formatDateBR(ev.data)}</TableCell>
                    <TableCell>{TIPO_EVENTO_LABELS[ev.tipo]}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrencyBRL(ev.valor)}
                    </TableCell>
                    <TableCell
                      className="max-w-xs truncate text-muted-foreground"
                      title={ev.observacoes ?? undefined}
                    >
                      {ev.observacoes ?? '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              setFormState({ kind: 'edit', evento: ev })
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletando(ev)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {formState.kind !== 'closed' && (
        <EventoForm
          ativoId={ativoId}
          tipoAtivo={tipoAtivo}
          open
          onOpenChange={(open) => {
            if (!open) setFormState({ kind: 'closed' });
          }}
          mode={
            formState.kind === 'create'
              ? { kind: 'create' }
              : {
                  kind: 'edit',
                  eventoId: formState.evento.id,
                  initial: formState.evento,
                }
          }
        />
      )}

      <AlertDialog
        open={deletando !== null}
        onOpenChange={(open) => {
          if (!open) setDeletando(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
              {deletando && (
                <>
                  {' '}
                  Evento de{' '}
                  <strong>{TIPO_EVENTO_LABELS[deletando.tipo]}</strong> em{' '}
                  <strong>{formatDateBR(deletando.data)}</strong> no valor de{' '}
                  <strong>{formatCurrencyBRL(deletando.valor)}</strong> será
                  removido.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
