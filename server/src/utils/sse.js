/**
 * Server-Sent Events helpers.
 *
 * SSE is a simple one-way stream over plain HTTP — perfect for streaming LLM
 * tokens to the browser (hints, interviewer turns). Lighter than WebSockets
 * because we only need server->client. The client reads it with fetch()'s
 * ReadableStream (see client hooks/useSSE.js).
 */

export function initSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable proxy buffering (nginx) so chunks flush
  });
  res.flushHeaders?.();
}

export function sseSend(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function sseDone(res, payload = {}) {
  sseSend(res, 'done', payload);
  res.end();
}

export function sseError(res, message) {
  sseSend(res, 'error', { error: message });
  res.end();
}
