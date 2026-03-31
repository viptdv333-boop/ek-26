import { useAuthStore } from '../../stores/authStore';

const BASE_URL = '/api';

// Mutex for token refresh — prevents concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) {
    logout();
    return false;
  }

  try {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } else {
      logout();
      return false;
    }
  } catch {
    logout();
    return false;
  }
}

async function refreshTokenIfNeeded(): Promise<boolean> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = doRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { token } = useAuthStore.getState();

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Only set Content-Type for requests with body
  if (options.body) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Auth endpoints (login, register, etc.) — don't try refresh, just throw the error
    if (path.startsWith('/auth/')) {
      const text = await res.text();
      try { const j = JSON.parse(text); throw new Error(j.error || 'Unauthorized'); } catch (e) { if (e instanceof Error) throw e; throw new Error('Unauthorized'); }
    }
    const refreshed = await refreshTokenIfNeeded();
    if (refreshed) {
      // Retry with new token
      const { token: newToken } = useAuthStore.getState();
      headers['Authorization'] = `Bearer ${newToken}`;
      const retry = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      if (!retry.ok) {
        const retryText = await retry.text();
        try { const j = JSON.parse(retryText); throw new Error(j.error || `${retry.status}: ${retryText}`); } catch (e) { if (e instanceof Error && !e.message.startsWith(String(retry.status))) throw e; throw new Error(`${retry.status}: ${retryText}`); }
      }
      return retry.json();
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || `${res.status}: ${text}`);
    } catch (e) {
      if (e instanceof Error && !e.message.startsWith(String(res.status))) throw e;
      throw new Error(`${res.status}: ${text}`);
    }
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
