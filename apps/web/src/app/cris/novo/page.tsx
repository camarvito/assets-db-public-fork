import { CriForm } from '@/components/CriForm';

export default function NovoCriPage() {
  return (
    <main className="container mx-auto max-w-3xl py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Novo CRI</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastre um Certificado de Recebíveis Imobiliários.
        </p>
      </header>
      <CriForm mode={{ kind: 'create' }} />
    </main>
  );
}
