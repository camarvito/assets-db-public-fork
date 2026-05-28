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

export function useEventos(ativoId: string) {
  return useQuery({
    queryKey: eventoKeys.byAtivo(ativoId),
    queryFn: () => listEventos(ativoId),
    enabled: Boolean(ativoId),
  });
}

export function useCreateEvento(ativoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EventoInput) => createEvento(ativoId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventoKeys.byAtivo(ativoId) });
    },
  });
}

export function useUpdateEvento(ativoId: string, eventoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EventoInput) => updateEvento(ativoId, eventoId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventoKeys.byAtivo(ativoId) });
    },
  });
}

export function useDeleteEvento(ativoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventoId: string) => deleteEvento(ativoId, eventoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventoKeys.byAtivo(ativoId) });
    },
  });
}
