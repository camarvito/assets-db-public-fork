'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChevronLeft, Loader2, Pencil } from 'lucide-react';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatRemuneracao,
  INSTITUICAO_LABELS,
  PERIODICIDADE_JUROS_LABELS,
} from '@assets-db/shared';
import { useCri } from '@/hooks/use-cris';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardEventos } from '@/components/CardEventos';
import { DeleteCriButton } from '@/components/DeleteCriButton';

export default function CriDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: cri, isLoading, isError } = useCri(id);

  if (isLoading) {
    return (
      <main className="container mx-auto py-10">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (isError || !cri) {
    return (
      <main className="container mx-auto max-w-3xl py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/cris">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          CRI não encontrado.
        </div>
      </main>
    );
  }

  const investidoTotal =
    cri.quantidade != null
      ? (cri.quantidade * Number.parseFloat(cri.precoAquisicao)).toString()
      : null;

  return (
    <main className="container mx-auto max-w-3xl py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
        <Link href="/cris">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{cri.nome}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{cri.codigo}</p>
          {cri.emissor && (
            <p className="mt-1 text-sm text-muted-foreground">{cri.emissor}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/cris/${cri.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <DeleteCriButton id={cri.id} codigo={cri.codigo} />
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
              value={cri.instituicao ? INSTITUICAO_LABELS[cri.instituicao] : '—'}
            />
            <Field
              label="Remuneração"
              value={formatRemuneracao({
                indexador: cri.indexador,
                tipoTaxa: cri.tipoTaxa,
                taxa: cri.taxa,
              })}
            />
            <Field
              label="Valor nominal"
              value={cri.valorNominal ? formatCurrencyBRL(cri.valorNominal) : '—'}
            />
            <Field
              label="Quantidade"
              value={cri.quantidade?.toString() ?? '—'}
            />
            <Field
              label="Preço de aquisição"
              value={formatCurrencyBRL(cri.precoAquisicao)}
            />
            <Field
              label="Investido total"
              value={investidoTotal ? formatCurrencyBRL(investidoTotal) : '—'}
            />
            <Field
              label="Data de aquisição"
              value={formatDateBR(cri.dataAquisicao)}
            />
            <Field
              label="Data de vencimento"
              value={formatDateBR(cri.dataVencimento)}
            />
            <Field
              label="Periodicidade de juros"
              value={
                cri.periodicidadeJuros
                  ? PERIODICIDADE_JUROS_LABELS[cri.periodicidadeJuros]
                  : '—'
              }
            />
          </dl>

          {cri.observacoes && (
            <div className="mt-6 border-t pt-6">
              <p className="mb-2 text-sm text-muted-foreground">Observações</p>
              <p className="whitespace-pre-wrap text-sm">{cri.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <CardEventos criId={cri.id} />
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
