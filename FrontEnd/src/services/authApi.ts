import { BASE_URL } from "./aiService";
const TIMEOUT_MS  = 8000;

export interface ApiResult {
  ok: boolean;
  message?: string;
  token?: string;  // session token returned by the server on successful login/register
}

// Uses AbortController so the timeout cleans up properly.
function makeController(): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return { controller, clear: () => clearTimeout(id) };
}

export async function loginApi(username: string, password: string): Promise<ApiResult> {
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
      // Try common JWT field names; fall back to username for servers that return {status:"Success"}
      const jwt = body.token ?? body.access_token ?? body.jwt ?? username;
      return { ok: true, token: String(jwt) };
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
    if (res.status === 200) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const jwt = body.token ?? body.access_token ?? body.jwt ?? username;
      return { ok: true, token: String(jwt) };
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

export async function logoutApi(username: string, token: string): Promise<ApiResult> {
  const { controller, clear } = makeController();
  const payload = { "token": token, "username": username };
  try {
    const res = await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
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

