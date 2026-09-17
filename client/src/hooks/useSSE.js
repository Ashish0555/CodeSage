import { api } from '../lib/api.js';
import { PREVIEW, previewStream } from '../lib/preview.js';

/**
 * Stream a POST SSE endpoint using fetch (EventSource can't send auth headers
 * or POST bodies, so we parse the text/event-stream manually).
 *
 * Calls handlers: onChunk(text), onEvent(name, data), onDone(data), onError(msg).
 * Returns a promise that resolves when the stream ends.
 *
 * PREVIEW MODE: when VITE_PREVIEW is set, we simulate the stream from canned text
 * (lib/preview.js) so the typing effect works with no backend.
 */
export async function streamSSE(path, body, handlers = {}) {
  if (PREVIEW) return previewStream(path, body, handlers);
  const { onChunk, onEvent, onDone, onError } = handlers;
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(api.token() ? { Authorization: `Bearer ${api.token()}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    let msg = `Request failed (${res.status})`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    onError?.(msg);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Parse SSE frames: blocks separated by a blank line, "event:" + "data:" lines.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = 'message';
      let dataStr = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
      }
      let data = {};
      try { data = dataStr ? JSON.parse(dataStr) : {}; } catch { /* keep {} */ }

      if (event === 'chunk') onChunk?.(data.text || '');
      else if (event === 'done') { onDone?.(data); return; }
      else if (event === 'error') { onError?.(data.error || 'Stream error'); return; }
      else onEvent?.(event, data);
    }
  }
}
