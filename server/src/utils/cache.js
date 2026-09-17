/**
 * Tiny in-memory TTL cache (Map-based).
 *
 * Purpose: conserve the Gemini free-tier daily request quota by caching
 * AI responses that don't depend on user-specific code (e.g. a Level-1 hint
 * for a problem, or a RAG answer to a common concept question). In production
 * this would be Redis; the interface is intentionally swap-compatible.
 */
class TTLCache {
  constructor() {
    this.store = new Map(); // key -> { value, expiresAt }
  }

  get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt && hit.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key, value, ttlMs = 60 * 60 * 1000) {
    this.store.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : 0 });
    return value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  clear() {
    this.store.clear();
  }
}

export const cache = new TTLCache();
