import type { CriInput, CriResponse } from '@assets-db/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Erro lançado para qualquer resposta non-2xx da API. `payload` carrega o
// corpo da resposta (formato depende do erro: validation, conflict, etc.).
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      // Só envia Content-Type quando há body — Fastify 5 rejeita request
      // sem body se Content-Type: application/json estiver setado.
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // ignore: resposta sem JSON
    }
    throw new ApiError(res.status, payload);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

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
