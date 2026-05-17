'use client';

import { use } from 'react';
import { Loader2 } from 'lucide-react';
import { useCri } from '@/hooks/use-cris';
import { CriForm } from '@/components/CriForm';

export default function EditarCriPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: cri, isLoading, isError } = useCri(id);

  return (
    <main className="container mx-auto max-w-3xl py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Editar CRI</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {cri ? cri.codigo : 'Carregando...'}
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          CRI não encontrado.
        </div>
      )}

      {cri && <CriForm mode={{ kind: 'edit', id, initial: cri }} />}
    </main>
  );
}
