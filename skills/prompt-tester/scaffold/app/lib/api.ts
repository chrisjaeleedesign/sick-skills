async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || res.statusText}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export function apiGet<T>(path: string): Promise<T> {
  return fetch(path).then(r => handle<T>(r))
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return fetch(path, {
    method: 'POST',
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  }).then(r => handle<T>(r))
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => handle<T>(r))
}

export function apiDelete(path: string): Promise<void> {
  return fetch(path, { method: 'DELETE' }).then(r => handle<void>(r))
}
