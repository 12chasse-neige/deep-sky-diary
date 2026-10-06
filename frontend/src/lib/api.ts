/** Cookies stay HttpOnly; this module never stores credentials in browser storage. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'DeepSkyDiary',
      ...init.headers,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data?.error?.message || '服务暂时不可用，请稍后重试。');
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : '无法连接服务，请检查连接后重试。';
}
