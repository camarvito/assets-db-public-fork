import type { EventoInput, EventoResponse } from '@assets-db/shared';
import { apiFetch } from './_client';

// =====================================================
// Evento endpoints — namespace `/ativos/:id/eventos`
// =====================================================

export function listEventos(ativoId: string): Promise<EventoResponse[]> {
  return apiFetch<EventoResponse[]>(
    `/ativos/${encodeURIComponent(ativoId)}/eventos`,
  );
}

export function createEvento(
  ativoId: string,
  data: EventoInput,
): Promise<EventoResponse> {
  return apiFetch<EventoResponse>(
    `/ativos/${encodeURIComponent(ativoId)}/eventos`,
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export function updateEvento(
  ativoId: string,
  eventoId: string,
  data: EventoInput,
): Promise<EventoResponse> {
  return apiFetch<EventoResponse>(
    `/ativos/${encodeURIComponent(ativoId)}/eventos/${encodeURIComponent(eventoId)}`,
    { method: 'PUT', body: JSON.stringify(data) },
  );
}

export function deleteEvento(ativoId: string, eventoId: string): Promise<void> {
  return apiFetch<void>(
    `/ativos/${encodeURIComponent(ativoId)}/eventos/${encodeURIComponent(eventoId)}`,
    { method: 'DELETE' },
  );
}

export const eventoKeys = {
  all: ['eventos'] as const,
  byAtivo: (ativoId: string) => [...eventoKeys.all, ativoId] as const,
};
