import type {
  Ativo,
  AtivoRendaFixa,
  Cri,
  Cra,
  Lci,
  Lca,
} from '@prisma/client';
import type {
  AtivoListItem,
  AtivoResponse,
  CriResponse,
  CraResponse,
  LciResponse,
  LcaResponse,
} from '@assets-db/shared';

// Inclusão padrão para qualquer leitura que precise dos 3 níveis
// (base + RF + leaf específico). Como cada Ativo tem apenas UM leaf
// populado (discriminado por `tipo`), os outros vêm `null` — ok.
export const ativoFullInclude = {
  rendaFixa: {
    include: { cri: true, cra: true, lci: true, lca: true },
  },
} as const;

export type AtivoFull = Ativo & {
  rendaFixa:
    | (AtivoRendaFixa & {
        cri: Cri | null;
        cra: Cra | null;
        lci: Lci | null;
        lca: Lca | null;
      })
    | null;
};

function formatDateISO(d: Date): string {
  return d.toISOString().substring(0, 10);
}

// Invariante do nosso domínio: todo Ativo de tipo RF (CRI/CRA/LCI/LCA)
// TEM linha em ativos_renda_fixa. Se vier null, é bug — não tente
// mascarar com `undefined`.
function rfOrThrow(a: AtivoFull): NonNullable<AtivoFull['rendaFixa']> {
  if (!a.rendaFixa) {
    throw new Error(`Invariante violado: Ativo ${a.id} sem ativos_renda_fixa`);
  }
  return a.rendaFixa;
}

function baseFlat(a: AtivoFull) {
  const rf = rfOrThrow(a);
  return {
    id: a.id,
    codigo: a.codigo,
    nome: a.nome,
    instituicao: a.instituicao,
    observacoes: a.observacoes,
    precoAquisicao: a.precoAquisicao.toString(),
    dataAquisicao: formatDateISO(a.dataAquisicao),
    dataVencimento: formatDateISO(rf.dataVencimento),
    indexador: rf.indexador,
    tipoTaxa: rf.tipoTaxa,
    taxa: rf.taxa.toString(),
    periodicidadeJuros: rf.periodicidadeJuros,
    criadoEm: a.criadoEm.toISOString(),
    atualizadoEm: a.atualizadoEm.toISOString(),
  };
}

export function serializeCri(a: AtivoFull): CriResponse {
  const rf = rfOrThrow(a);
  if (!rf.cri) {
    throw new Error(`Invariante violado: Ativo ${a.id} tipo CRI sem linha em cris`);
  }
  return {
    ...baseFlat(a),
    tipo: 'CRI',
    emissor: rf.cri.emissor,
    quantidade: rf.cri.quantidade,
    valorNominal: rf.cri.valorNominal?.toString() ?? null,
  };
}

export function serializeCra(a: AtivoFull): CraResponse {
  const rf = rfOrThrow(a);
  if (!rf.cra) {
    throw new Error(`Invariante violado: Ativo ${a.id} tipo CRA sem linha em cras`);
  }
  return {
    ...baseFlat(a),
    tipo: 'CRA',
    emissor: rf.cra.emissor,
    quantidade: rf.cra.quantidade,
    valorNominal: rf.cra.valorNominal?.toString() ?? null,
  };
}

export function serializeLci(a: AtivoFull): LciResponse {
  const rf = rfOrThrow(a);
  if (!rf.lci) {
    throw new Error(`Invariante violado: Ativo ${a.id} tipo LCI sem linha em lcis`);
  }
  return { ...baseFlat(a), tipo: 'LCI' };
}

export function serializeLca(a: AtivoFull): LcaResponse {
  const rf = rfOrThrow(a);
  if (!rf.lca) {
    throw new Error(`Invariante violado: Ativo ${a.id} tipo LCA sem linha em lcas`);
  }
  return { ...baseFlat(a), tipo: 'LCA' };
}

export function serializeAtivo(a: AtivoFull): AtivoResponse {
  switch (a.tipo) {
    case 'CRI':
      return serializeCri(a);
    case 'CRA':
      return serializeCra(a);
    case 'LCI':
      return serializeLci(a);
    case 'LCA':
      return serializeLca(a);
  }
}

export function serializeAtivoListItem(a: AtivoFull): AtivoListItem {
  return { ...baseFlat(a), tipo: a.tipo };
}
