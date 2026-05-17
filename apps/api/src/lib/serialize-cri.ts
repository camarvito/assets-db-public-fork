import type { Ativo, Cri } from '@prisma/client';
import type { CriResponse } from '@assets-db/shared';

export type AtivoComCri = Ativo & { cri: Cri };

// Como o campo \`@db.Date\` no Prisma retorna Date com hora 00:00 UTC,
// converter para "YYYY-MM-DD" via substring do ISO basta.
function formatDateISO(d: Date): string {
  return d.toISOString().substring(0, 10);
}

export function serializeCri(ativo: AtivoComCri): CriResponse {
  return {
    id: ativo.id,
    codigo: ativo.codigo,
    emissor: ativo.emissor,
    instituicao: ativo.instituicao,
    quantidade: ativo.quantidade,
    precoAquisicao: ativo.precoAquisicao.toString(),
    dataAquisicao: formatDateISO(ativo.dataAquisicao),
    observacoes: ativo.observacoes,
    valorNominal: ativo.cri.valorNominal.toString(),
    dataVencimento: formatDateISO(ativo.cri.dataVencimento),
    indexador: ativo.cri.indexador,
    tipoTaxa: ativo.cri.tipoTaxa,
    taxa: ativo.cri.taxa.toString(),
    criadoEm: ativo.criadoEm.toISOString(),
    atualizadoEm: ativo.atualizadoEm.toISOString(),
  };
}
