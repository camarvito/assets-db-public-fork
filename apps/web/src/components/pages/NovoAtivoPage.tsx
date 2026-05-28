import type { TipoAtivo } from '@assets-db/shared';
import { AtivoForm, TIPO_NOME_LONGO } from '@/components/AtivoForm';

interface NovoAtivoPageProps {
  tipo: TipoAtivo;
}

export function NovoAtivoPage({ tipo }: NovoAtivoPageProps) {
  return (
    <main className="container mx-auto max-w-3xl py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Novo {tipo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastre um {TIPO_NOME_LONGO[tipo]}.
        </p>
      </header>
      <AtivoForm tipo={tipo} mode={{ kind: 'create' }} />
    </main>
  );
}
