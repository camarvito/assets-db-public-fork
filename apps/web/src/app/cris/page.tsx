'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatRemuneracao,
} from '@assets-db/shared';
import { useCrisList } from '@/hooks/use-cris';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function CrisPage() {
  const router = useRouter();
  const { data: cris, isLoading, isError, error } = useCrisList();

  return (
    <main className="container mx-auto py-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">CRIs</h1>
        <Button asChild>
          <Link href="/cris/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo CRI
          </Link>
        </Button>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Erro ao carregar CRIs: {error instanceof Error ? error.message : 'desconhecido'}
        </div>
      )}

      {cris && cris.length === 0 && (
        <div className="rounded-md border border-dashed py-12 text-center">
          <p className="text-muted-foreground">Nenhum CRI cadastrado ainda.</p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/cris/novo">Cadastrar o primeiro</Link>
          </Button>
        </div>
      )}

      {cris && cris.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Emissor</TableHead>
                <TableHead>Remuneração</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Investido total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cris.map((cri) => {
                const investidoTotal = (
                  cri.quantidade * Number.parseFloat(cri.precoAquisicao)
                ).toString();
                return (
                  <TableRow
                    key={cri.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/cris/${cri.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{cri.codigo}</TableCell>
                    <TableCell>{cri.emissor}</TableCell>
                    <TableCell>
                      {formatRemuneracao({
                        indexador: cri.indexador,
                        tipoTaxa: cri.tipoTaxa,
                        taxa: cri.taxa,
                      })}
                    </TableCell>
                    <TableCell>{formatDateBR(cri.dataVencimento)}</TableCell>
                    <TableCell className="text-right">{cri.quantidade}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrencyBRL(investidoTotal)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
