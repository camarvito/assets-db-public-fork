// Cliente HTTP compartilhado entre os módulos de recurso (cris, eventos, etc.).
// Não exportar via barrel — uso interno do pacote api.

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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
