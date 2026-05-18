import type { CriInput, CriResponse } from '@assets-db/shared';
import { apiFetch } from './_client';

export { ApiError } from './_client';

// =====================================================
// CRI endpoints
// =====================================================

export function listCris(): Promise<CriResponse[]> {
  return apiFetch<CriResponse[]>('/cris');
}

export function getCri(id: string): Promise<CriResponse> {
  return apiFetch<CriResponse>(`/cris/${encodeURIComponent(id)}`);
}

export function createCri(data: CriInput): Promise<CriResponse> {
  return apiFetch<CriResponse>('/cris', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCri(id: string, data: CriInput): Promise<CriResponse> {
  return apiFetch<CriResponse>(`/cris/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteCri(id: string): Promise<void> {
  return apiFetch<void>(`/cris/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// Query keys centralizadas (consumidas pelos hooks do TanStack Query).
export const criKeys = {
  all: ['cris'] as const,
  list: () => [...criKeys.all, 'list'] as const,
  detail: (id: string) => [...criKeys.all, 'detail', id] as const,
};
