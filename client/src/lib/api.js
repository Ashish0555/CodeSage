/**
 * Tiny API client. Reads the JWT from memory (set by AuthContext) and attaches
 * it as a Bearer token. Throws on non-2xx with the server's error message.
 *
 * PREVIEW MODE: when VITE_PREVIEW is set (npm run dev:mock), every call is
 * answered by lib/preview.js with canned fixtures instead of hitting the network.
 * In a normal build the flag is off and this file behaves exactly as before.
 */
import { PREVIEW, previewGet, previewPost } from './preview.js';

let authToken = null;
export function setAuthToken(t) { authToken = t; }

const BASE = '/api';

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  if (PREVIEW) {
    return method === 'GET' ? previewGet(path) : previewPost(path, body);
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  // expose token for the SSE helper (fetch-based streaming)
  token: () => authToken,
};
