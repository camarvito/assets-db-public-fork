'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronDown, Loader2, Plus } from 'lucide-react';
import {
  formatDateBR,
  formatRemuneracao,
  INDEXADOR_LABELS,
  IndexadorSchema,
  INSTITUICAO_LABELS,
  InstituicaoSchema,
  TipoAtivoSchema,
  type AtivoListQuery,
  type Indexador,
  type Instituicao,
  type TipoAtivo,
} from '@assets-db/shared';
import { useAtivosList } from '@/hooks/use-ativos';
import { PeriodicidadeBadge } from '@/components/PeriodicidadeBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PATH_PLURAL: Record<TipoAtivo, string> = {
  CRI: 'cris',
  CRA: 'cras',
  LCI: 'lcis',
  LCA: 'lcas',
};

const NONE_SENTINEL = '__none__';

export default function AtivosPage() {
  const router = useRouter();
  const [query, setQuery] = useState<AtivoListQuery>({});
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const { data: ativos, isLoading, isError, error } = useAtivosList(query);

  const ativosOrdenados = useMemo(() => {
    if (!ativos) return ativos;
    return [...ativos].sort((a, b) => {
      const cmp = a.dataVencimento.localeCompare(b.dataVencimento);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [ativos, sortDir]);

  return (
    <main className="container mx-auto py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Ativos</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo ativo
              <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {TipoAtivoSchema.options.map((tipo) => (
              <DropdownMenuItem key={tipo} asChild>
                <Link href={`/${PATH_PLURAL[tipo]}/novo`}>Novo {tipo}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectFilter
          label="Tipo"
          value={query.tipo}
          onChange={(v) => setQuery({ ...query, tipo: v as TipoAtivo | undefined })}
          options={TipoAtivoSchema.options.map((t) => ({ value: t, label: t }))}
        />
        <SelectFilter
          label="Indexador"
          value={query.indexador}
          onChange={(v) =>
            setQuery({ ...query, indexador: v as Indexador | undefined })
          }
          options={IndexadorSchema.options.map((k) => ({
            value: k,
            label: INDEXADOR_LABELS[k],
          }))}
        />
        <SelectFilter
          label="Instituição"
          value={query.instituicao}
          onChange={(v) =>
            setQuery({ ...query, instituicao: v as Instituicao | undefined })
          }
          options={InstituicaoSchema.options.map((k) => ({
            value: k,
            label: INSTITUICAO_LABELS[k],
          }))}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vencimentoAte" className="text-sm text-muted-foreground">
            Vencimento até
          </Label>
          <Input
            id="vencimentoAte"
            type="date"
            value={query.vencimentoAte ?? ''}
            onChange={(e) =>
              setQuery({
                ...query,
                vencimentoAte: e.target.value === '' ? undefined : e.target.value,
              })
            }
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Erro ao carregar ativos: {error instanceof Error ? error.message : 'desconhecido'}
        </div>
      )}

      {ativos && ativos.length === 0 && (
        <div className="rounded-md border border-dashed py-12 text-center">
          <p className="text-muted-foreground">Nenhum ativo encontrado.</p>
        </div>
      )}

      {ativos && ativos.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead>Remuneração</TableHead>
                <TableHead aria-sort={sortDir === 'asc' ? 'ascending' : 'descending'}>
                  <button
                    type="button"
                    onClick={() =>
                      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                    }
                    className="-ml-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground"
                  >
                    Vencimento
                    {sortDir === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ativosOrdenados?.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/${PATH_PLURAL[a.tipo]}/${a.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{a.nome}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {a.codigo}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wide">
                      {a.tipo}
                    </span>
                  </TableCell>
                  <TableCell>{INSTITUICAO_LABELS[a.instituicao]}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      {formatRemuneracao({
                        indexador: a.indexador,
                        tipoTaxa: a.tipoTaxa,
                        taxa: a.taxa,
                      })}
                      <PeriodicidadeBadge periodicidade={a.periodicidadeJuros} />
                    </span>
                  </TableCell>
                  <TableCell>{formatDateBR(a.dataVencimento)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}

interface SelectFilterProps {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: Array<{ value: string; label: string }>;
}

function SelectFilter({ label, value, onChange, options }: SelectFilterProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Select
        value={value ?? undefined}
        onValueChange={(v) => onChange(v === NONE_SENTINEL ? undefined : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_SENTINEL}>Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
