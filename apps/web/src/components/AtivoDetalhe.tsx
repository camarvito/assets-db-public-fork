'use client';

import Link from 'next/link';
import { ChevronLeft, Pencil } from 'lucide-react';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatRemuneracao,
  INSTITUICAO_LABELS,
  PERIODICIDADE_JUROS_LABELS,
  type AtivoResponse,
  type TipoAtivo,
} from '@assets-db/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardEventos } from '@/components/CardEventos';
import { DeleteAtivoButton } from '@/components/DeleteAtivoButton';

const PATH_PLURAL: Record<TipoAtivo, string> = {
  CRI: 'cris',
  CRA: 'cras',
  LCI: 'lcis',
  LCA: 'lcas',
};

interface AtivoDetalheProps {
  ativo: AtivoResponse;
}

function hasExtras(
  ativo: AtivoResponse,
): ativo is Extract<AtivoResponse, { tipo: 'CRI' | 'CRA' }> {
  return ativo.tipo === 'CRI' || ativo.tipo === 'CRA';
}

export function AtivoDetalhe({ ativo }: AtivoDetalheProps) {
  const investidoTotal =
    hasExtras(ativo) && ativo.quantidade != null
      ? (ativo.quantidade * Number.parseFloat(ativo.precoAquisicao)).toString()
      : null;

  return (
    <main className="container mx-auto max-w-3xl py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
        <Link href="/ativos">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {ativo.tipo}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{ativo.nome}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{ativo.codigo}</p>
          {hasExtras(ativo) && ativo.emissor && (
            <p className="mt-1 text-sm text-muted-foreground">{ativo.emissor}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/${PATH_PLURAL[ativo.tipo]}/${ativo.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <DeleteAtivoButton id={ativo.id} tipo={ativo.tipo} codigo={ativo.codigo} />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field
              label="Instituição"
              value={INSTITUICAO_LABELS[ativo.instituicao]}
            />
            <Field
              label="Remuneração"
              value={formatRemuneracao({
                indexador: ativo.indexador,
                tipoTaxa: ativo.tipoTaxa,
                taxa: ativo.taxa,
              })}
            />
            {hasExtras(ativo) && (
              <Field
                label="Valor nominal"
                value={ativo.valorNominal ? formatCurrencyBRL(ativo.valorNominal) : '—'}
              />
            )}
            {hasExtras(ativo) && (
              <Field
                label="Quantidade"
                value={ativo.quantidade?.toString() ?? '—'}
              />
            )}
            <Field
              label={hasExtras(ativo) ? 'Preço de aquisição' : 'Valor aplicado'}
              value={formatCurrencyBRL(ativo.precoAquisicao)}
            />
            {hasExtras(ativo) && (
              <Field
                label="Investido total"
                value={investidoTotal ? formatCurrencyBRL(investidoTotal) : '—'}
              />
            )}
            <Field
              label="Data de aquisição"
              value={formatDateBR(ativo.dataAquisicao)}
            />
            <Field
              label="Data de vencimento"
              value={formatDateBR(ativo.dataVencimento)}
            />
            <Field
              label="Periodicidade de juros"
              value={
                ativo.periodicidadeJuros
                  ? PERIODICIDADE_JUROS_LABELS[ativo.periodicidadeJuros]
                  : '—'
              }
            />
          </dl>

          {ativo.observacoes && (
            <div className="mt-6 border-t pt-6">
              <p className="mb-2 text-sm text-muted-foreground">Observações</p>
              <p className="whitespace-pre-wrap text-sm">{ativo.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <CardEventos ativoId={ativo.id} tipoAtivo={ativo.tipo} />
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
