'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CriInput } from '@assets-db/shared';
import {
  createCri,
  criKeys,
  deleteCri,
  getCri,
  listCris,
  updateCri,
} from '@/lib/api/cris';

export function useCrisList() {
  return useQuery({
    queryKey: criKeys.list(),
    queryFn: listCris,
  });
}

export function useCri(id: string | undefined) {
  return useQuery({
    queryKey: id ? criKeys.detail(id) : criKeys.all,
    queryFn: () => getCri(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateCri() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CriInput) => createCri(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: criKeys.all });
    },
  });
}

export function useUpdateCri(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CriInput) => updateCri(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: criKeys.all });
    },
  });
}

export function useDeleteCri() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCri(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: criKeys.all });
    },
  });
}
