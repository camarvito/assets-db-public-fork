import type {
  AtivoListItem,
  AtivoListQuery,
  AtivoResponse,
  CraInput,
  CraResponse,
  CriInput,
  CriResponse,
  LcaInput,
  LcaResponse,
  LciInput,
  LciResponse,
  TipoAtivo,
} from '@assets-db/shared';
import { apiFetch } from './_client';

export { ApiError } from './_client';

const ENDPOINT_BY_TIPO: Record<TipoAtivo, string> = {
  CRI: 'cris',
  CRA: 'cras',
  LCI: 'lcis',
  LCA: 'lcas',
};

export type AtivoInputByTipo = {
  CRI: CriInput;
  CRA: CraInput;
  LCI: LciInput;
  LCA: LcaInput;
};

export type AtivoResponseByTipo = {
  CRI: CriResponse;
  CRA: CraResponse;
  LCI: LciResponse;
  LCA: LcaResponse;
};

export function listAtivos(query: AtivoListQuery = {}): Promise<AtivoListItem[]> {
  const params = new URLSearchParams();
  if (query.tipo) params.set('tipo', query.tipo);
  if (query.indexador) params.set('indexador', query.indexador);
  if (query.instituicao) params.set('instituicao', query.instituicao);
  if (query.vencimentoAte) params.set('vencimentoAte', query.vencimentoAte);
  const qs = params.toString();
  return apiFetch<AtivoListItem[]>(`/ativos${qs ? `?${qs}` : ''}`);
}

export function getAtivo(id: string): Promise<AtivoResponse> {
  return apiFetch<AtivoResponse>(`/ativos/${encodeURIComponent(id)}`);
}

export function deleteAtivo(id: string): Promise<void> {
  return apiFetch<void>(`/ativos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function createAtivo<T extends TipoAtivo>(
  tipo: T,
  data: AtivoInputByTipo[T],
): Promise<AtivoResponseByTipo[T]> {
  return apiFetch<AtivoResponseByTipo[T]>(`/${ENDPOINT_BY_TIPO[tipo]}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAtivo<T extends TipoAtivo>(
  tipo: T,
  id: string,
  data: AtivoInputByTipo[T],
): Promise<AtivoResponseByTipo[T]> {
  return apiFetch<AtivoResponseByTipo[T]>(
    `/${ENDPOINT_BY_TIPO[tipo]}/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(data) },
  );
}

export const ativoKeys = {
  all: ['ativos'] as const,
  list: (query: AtivoListQuery = {}) => [...ativoKeys.all, 'list', query] as const,
  detail: (id: string) => [...ativoKeys.all, 'detail', id] as const,
};
