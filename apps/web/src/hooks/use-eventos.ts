'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventoInput } from '@assets-db/shared';
import {
  createEvento,
  deleteEvento,
  eventoKeys,
  listEventos,
  updateEvento,
} from '@/lib/api/eventos';

export function useEventos(criId: string) {
  return useQuery({
    queryKey: eventoKeys.byCri(criId),
    queryFn: () => listEventos(criId),
    enabled: Boolean(criId),
  });
}

export function useCreateEvento(criId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EventoInput) => createEvento(criId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventoKeys.byCri(criId) });
    },
  });
}

export function useUpdateEvento(criId: string, eventoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EventoInput) => updateEvento(criId, eventoId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventoKeys.byCri(criId) });
    },
  });
}

export function useDeleteEvento(criId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventoId: string) => deleteEvento(criId, eventoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventoKeys.byCri(criId) });
    },
  });
}
