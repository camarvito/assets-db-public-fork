'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AtivoListQuery, TipoAtivo } from '@assets-db/shared';
import {
  ativoKeys,
  createAtivo,
  deleteAtivo,
  getAtivo,
  listAtivos,
  updateAtivo,
  type AtivoInputByTipo,
} from '@/lib/api/ativos';

export function useAtivosList(query: AtivoListQuery = {}) {
  return useQuery({
    queryKey: ativoKeys.list(query),
    queryFn: () => listAtivos(query),
  });
}

export function useAtivo(id: string | undefined) {
  return useQuery({
    queryKey: id ? ativoKeys.detail(id) : ativoKeys.all,
    queryFn: () => getAtivo(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateAtivo<T extends TipoAtivo>(tipo: T) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AtivoInputByTipo[T]) => createAtivo(tipo, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ativoKeys.all });
    },
  });
}

export function useUpdateAtivo<T extends TipoAtivo>(tipo: T, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AtivoInputByTipo[T]) => updateAtivo(tipo, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ativoKeys.all });
    },
  });
}

export function useDeleteAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAtivo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ativoKeys.all });
    },
  });
}
