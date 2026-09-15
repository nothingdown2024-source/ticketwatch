export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const payload = (await response.json()) as T & { error?: { message?: string | string[] } };
  if (!response.ok) {
    const message = payload.error?.message;
    throw new Error(Array.isArray(message) ? message.join(' ') : (message ?? 'Request failed.'));
  }
  return payload;
}
