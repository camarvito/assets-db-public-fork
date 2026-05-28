import { AtivoDetalheBranchPage } from '@/components/pages/AtivoDetalheBranchPage';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AtivoDetalheBranchPage tipo="LCI" params={params} />;
}
