import * as SecureStore from 'expo-secure-store';
import api, { BASE_URL } from './api';

const TIMEOUT_MS = 8000;

export interface ApiResult {
  ok: boolean;
  message?: string;
}

export interface LoginResult extends ApiResult {
  token?: string;
  user_id?: number;
  username?: string;
}

// Uses AbortController so the timeout cleans up properly.
function makeController(): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return { controller, clear: () => clearTimeout(id) };
}

export async function loginApi(username: string, password: string): Promise<LoginResult> {
  const { controller, clear } = makeController();
  try {
    const params = new URLSearchParams({ username, password });
    const res = await fetch(`${BASE_URL}/login?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    clear();
    if (res.status === 200) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (body.status === 'ok') {
        return {
          ok: true,
          token: String(body.token ?? ''),
          user_id: Number(body.user_id ?? 0),
          username: String(body.username ?? username),
        };
      }
      return { ok: false, message: String(body.error ?? 'Unexpected response from server.') };
    }
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { ok: false, message: String(body.error ?? `Server error (${res.status})`) };
  } catch (e: unknown) {
    clear();
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, message: 'Request timed out. Check your connection and try again.' };
    }
    return { ok: false, message: 'Server is unreachable. Please try again later.' };
  }
}

export async function registerApi(username: string, password: string, email: string): Promise<ApiResult> {
  const { controller, clear } = makeController();
  const payload = { "username": username, "mail": email, "password": password };
  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(payload),
    });
    clear();
    if (res.status === 200) return { ok: true };
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { ok: false, message: String(body.error ?? `Server error (${res.status})`) };
  } catch (e: unknown) {
    clear();
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, message: 'Request timed out. Check your connection and try again.' };
    }
    return { ok: false, message: 'Server is unreachable. Please try again later.' };
  }
}

export async function logoutApi(token: string): Promise<ApiResult> {
  try {
    const device_id = await SecureStore.getItemAsync('device_id');
    await api.post('/logout', { token, device_id });
  } catch {
    // Best-effort — always succeed locally even if the server is unreachable.
  }
  return { ok: true };
}
