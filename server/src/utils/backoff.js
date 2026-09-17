/** Sleep for ms milliseconds. */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry an async fn with exponential backoff + jitter.
 * Retries only when shouldRetry(err) is true (default: HTTP 429 / 503 / network).
 * This is how we stay resilient to Gemini free-tier 429s and transient
 * Piston hiccups without hammering the upstream.
 */
export async function withBackoff(fn, {
  retries = 4,
  baseMs = 500,
  maxMs = 8000,
  shouldRetry = defaultShouldRetry,
} = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries || !shouldRetry(err)) throw err;
      const backoff = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
      const jitter = Math.random() * backoff * 0.25;
      await sleep(backoff + jitter);
    }
  }
}

function defaultShouldRetry(err) {
  const status = err?.status || err?.response?.status;
  if (status === 429 || status === 503 || status === 502) return true;
  const code = err?.code;
  return code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED';
}
