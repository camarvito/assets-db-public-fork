'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import type { TipoAtivo } from '@assets-db/shared';
import { useAtivo } from '@/hooks/use-ativos';
import { AtivoDetalhe } from '@/components/AtivoDetalhe';
import { Button } from '@/components/ui/button';

interface AtivoDetalheBranchPageProps {
  tipo: TipoAtivo;
  params: Promise<{ id: string }>;
}

export function AtivoDetalheBranchPage({ tipo, params }: AtivoDetalheBranchPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { data: ativo, isLoading, isError } = useAtivo(id);

  // If the URL is /cris/:id but the asset is actually a CRA, redirect.
  useEffect(() => {
    if (ativo && ativo.tipo !== tipo) {
      const plural = { CRI: 'cris', CRA: 'cras', LCI: 'lcis', LCA: 'lcas' }[ativo.tipo];
      router.replace(`/${plural}/${ativo.id}`);
    }
  }, [ativo, tipo, router]);

  if (isLoading) {
    return (
      <main className="container mx-auto py-10">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (isError || !ativo) {
    return (
      <main className="container mx-auto max-w-3xl py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/ativos">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {tipo} não encontrado.
        </div>
      </main>
    );
  }

  // The useEffect above will redirect; render a loader in the meantime.
  if (ativo.tipo !== tipo) {
    return (
      <main className="container mx-auto py-10">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  return <AtivoDetalhe ativo={ativo} />;
}
