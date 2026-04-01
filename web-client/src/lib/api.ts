const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${API_BASE}/api/csrf-token`, {
    credentials: 'include',
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch CSRF token');
  const data = await res.json();
  csrfToken = data.token as string;
  return csrfToken;
}

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? 'GET';

  for (let attempt = 0; attempt < 2; attempt++) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(options.headers as Record<string, string>),
    };

    if (STATE_CHANGING_METHODS.has(method)) {
      headers['X-CSRF-Token'] = await ensureCsrfToken();
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });

    if (!res.ok) {
      if (res.status === 403) {
        csrfToken = null;
        if (attempt === 0) continue;
      }
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        body?.message ?? body?.error?.message ?? `Request failed (${res.status})`,
        body?.error,
      );
    }

    if (res.status === 204) {
      return undefined as T;
    }
    return res.json();
  }
  throw new ApiError(403, 'CSRF validation failed');
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
