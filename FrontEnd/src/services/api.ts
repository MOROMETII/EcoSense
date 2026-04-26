import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'https://trend-swing-buildings-delegation.trycloudflare.com';

// Registered by AuthContext so the interceptor can clear React state on 401.
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void): void {
  onUnauthorized = cb;
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

// Attach Bearer token to every request.
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401: clear stored credentials and notify AuthContext.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user_id');
      await SecureStore.deleteItemAsync('username');
      await SecureStore.deleteItemAsync('device_id');
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default api;
