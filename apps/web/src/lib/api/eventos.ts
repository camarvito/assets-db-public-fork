import type { EventoInput, EventoResponse } from '@assets-db/shared';
import { apiFetch } from './_client';

// =====================================================
// Evento endpoints (aninhados sob /cris/:id)
// =====================================================

export function listEventos(criId: string): Promise<EventoResponse[]> {
  return apiFetch<EventoResponse[]>(
    `/cris/${encodeURIComponent(criId)}/eventos`,
  );
}

export function createEvento(
  criId: string,
  data: EventoInput,
): Promise<EventoResponse> {
  return apiFetch<EventoResponse>(
    `/cris/${encodeURIComponent(criId)}/eventos`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export function updateEvento(
  criId: string,
  eventoId: string,
  data: EventoInput,
): Promise<EventoResponse> {
  return apiFetch<EventoResponse>(
    `/cris/${encodeURIComponent(criId)}/eventos/${encodeURIComponent(eventoId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  );
}

export function deleteEvento(criId: string, eventoId: string): Promise<void> {
  return apiFetch<void>(
    `/cris/${encodeURIComponent(criId)}/eventos/${encodeURIComponent(eventoId)}`,
    { method: 'DELETE' },
  );
}

export const eventoKeys = {
  all: ['eventos'] as const,
  byCri: (criId: string) => [...eventoKeys.all, criId] as const,
};
