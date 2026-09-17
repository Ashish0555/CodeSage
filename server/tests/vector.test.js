import { describe, it, expect } from 'vitest';
import { cosineSimilarity, normalize, topKBySimilarity } from '../src/utils/vector.js';

describe('vector math (RAG fallback)', () => {
  it('cosine similarity of identical direction is ~1', () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1, 6);
  });

  it('cosine similarity of orthogonal vectors is 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('normalize returns a unit vector', () => {
    const n = normalize([3, 4]);
    expect(Math.hypot(...n)).toBeCloseTo(1, 6);
  });

  it('topK returns the most similar item first', () => {
    const q = normalize([1, 1]);
    const items = [
      { id: 'a', embedding: normalize([1, 0]) },
      { id: 'b', embedding: normalize([1, 1]) }, // closest
      { id: 'c', embedding: normalize([-1, -1]) },
    ];
    const ranked = topKBySimilarity(q, items, 2);
    expect(ranked[0].item.id).toBe('b');
    expect(ranked).toHaveLength(2);
  });
});
