import { EditarAtivoPage } from '@/components/pages/EditarAtivoPage';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EditarAtivoPage tipo="LCI" params={params} />;
}
