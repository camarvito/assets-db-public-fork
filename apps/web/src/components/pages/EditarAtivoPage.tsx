'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { TipoAtivo } from '@assets-db/shared';
import { useAtivo } from '@/hooks/use-ativos';
import { AtivoForm } from '@/components/AtivoForm';
import type { AtivoResponseByTipo } from '@/lib/api/ativos';

interface EditarAtivoPageProps<T extends TipoAtivo> {
  tipo: T;
  params: Promise<{ id: string }>;
}

export function EditarAtivoPage<T extends TipoAtivo>({
  tipo,
  params,
}: EditarAtivoPageProps<T>) {
  const router = useRouter();
  const { id } = use(params);
  const { data: ativo, isLoading, isError } = useAtivo(id);

  // If the loaded asset is actually a different type, redirect to its route.
  useEffect(() => {
    if (ativo && ativo.tipo !== tipo) {
      const plural = { CRI: 'cris', CRA: 'cras', LCI: 'lcis', LCA: 'lcas' }[ativo.tipo];
      router.replace(`/${plural}/${ativo.id}/editar`);
    }
  }, [ativo, tipo, router]);

  return (
    <main className="container mx-auto max-w-3xl py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Editar {tipo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ativo ? ativo.codigo : 'Carregando...'}
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {tipo} não encontrado.
        </div>
      )}

      {ativo && ativo.tipo === tipo && (
        <AtivoForm
          tipo={tipo}
          mode={{
            kind: 'edit',
            id,
            initial: ativo as AtivoResponseByTipo[T],
          }}
        />
      )}
    </main>
  );
}
