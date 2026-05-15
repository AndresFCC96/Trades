/**
 * Fetch wrapper minimal. Lanza ApiError con status + cuerpo si falla.
 * Las rutas son relativas — el proxy de Vite las redirige al FastAPI.
 */

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers ?? {}) };
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers,
    body,
    signal: opts.signal,
  });
  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = await res.text().catch(() => null);
    }
    throw new ApiError(`HTTP ${res.status} on ${path}`, res.status, payload);
  }
  // 204 → undefined as T
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function download(path: string, filename: string): Promise<void> {
  const res = await fetch(path);
  if (!res.ok) throw new ApiError(`HTTP ${res.status} on ${path}`, res.status, null);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
