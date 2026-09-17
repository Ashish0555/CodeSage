/**
 * Vector math for the in-memory RAG fallback.
 *
 * We L2-normalize embeddings on ingestion, so cosine similarity reduces to a
 * dot product. Kept pure and dependency-free => trivially unit-testable
 * (see tests/vector.test.js) and a nice concrete thing to explain in an
 * interview ("what is cosine similarity and why normalize?").
 */

export function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) s += a[i] * b[i];
  return s;
}

export function norm(a) {
  return Math.sqrt(dot(a, a));
}

/** Return a unit-length copy of v (or v unchanged if it's the zero vector). */
export function normalize(v) {
  const n = norm(v);
  if (n === 0) return v.slice();
  return v.map((x) => x / n);
}

/** Cosine similarity in [-1, 1]. Safe on non-normalized inputs. */
export function cosineSimilarity(a, b) {
  const denom = norm(a) * norm(b);
  return denom === 0 ? 0 : dot(a, b) / denom;
}

/**
 * Rank items by cosine similarity of item[embeddingKey] to queryVec, return top-k.
 * O(n * d) — perfectly fine for the MVP's few-hundred-chunk knowledge base.
 */
export function topKBySimilarity(queryVec, items, k = 5, embeddingKey = 'embedding') {
  return items
    .map((item) => ({ item, score: cosineSimilarity(queryVec, item[embeddingKey] || []) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k);
}
