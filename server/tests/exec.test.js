import { describe, it, expect } from 'vitest';
import { _internal } from '../src/services/execService.js';

const { normalizeOutput } = _internal;

/**
 * Verdict correctness hinges on output comparison. These tests pin down the
 * normalization rules so a future refactor can't silently change what counts
 * as "Accepted". (This mirrors the automated source-port-consistency tests
 * Pankaj wrote at Arista — deterministic checks around a critical path.)
 */
describe('normalizeOutput', () => {
  it('treats trailing whitespace per line as insignificant', () => {
    expect(normalizeOutput('42   \n')).toBe(normalizeOutput('42'));
  });

  it('ignores trailing blank lines', () => {
    expect(normalizeOutput('a\nb\n\n\n')).toBe('a\nb');
  });

  it('normalizes CRLF to LF', () => {
    expect(normalizeOutput('x\r\ny')).toBe('x\ny');
  });

  it('does NOT consider different content equal', () => {
    expect(normalizeOutput('1 2 3')).not.toBe(normalizeOutput('1 2 4'));
  });
});
