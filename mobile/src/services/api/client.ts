import { useAuthStore } from '../../stores/authStore';

const BASE_URL = __DEV__ ? 'http://10.0.2.2:3000' : 'https://api.ek26.app';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function apiCall<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth) {
    // Try refresh
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
      const retryResponse = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!retryResponse.ok) {
        throw new ApiError(retryResponse.status, await retryResponse.text());
      }
      return retryResponse.json();
    }
    // Refresh failed, logout
    useAuthStore.getState().logout();
    throw new ApiError(401, 'Session expired');
  }

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
