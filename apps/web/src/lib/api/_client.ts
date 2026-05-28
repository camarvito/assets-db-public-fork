const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Thrown for any non-2xx API response. `payload` carries the response body —
// its shape depends on the error kind (validation, conflict, etc.).
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
      // Only send Content-Type when there is a body — Fastify 5 rejects
      // bodyless requests that still set Content-Type: application/json.
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // ignore: response without JSON body
    }
    throw new ApiError(res.status, payload);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
