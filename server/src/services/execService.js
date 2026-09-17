import axios from 'axios';
import { config } from '../config/env.js';
import { withBackoff } from '../utils/backoff.js';

/**
 * Execution service — runs untrusted user code via the Piston public API.
 *
 * Why Piston: we never execute a stranger's code on our own kernel. Piston
 * sandboxes each run (ephemeral user, no network, cgroup limits). For the MVP
 * this is zero-infra and free. The "production" path (self-hosted Judge0 with
 * batch submissions + microVM isolation) is documented in the blueprint.
 *
 * The public API allows ~5 req/s and runs ONE program per call, so a problem
 * with N test cases = N calls. We run them through a small concurrency limiter
 * to stay polite and avoid 429s.
 */

const client = axios.create({ baseURL: config.piston.url, timeout: 20000 });

// Our language keys -> Piston language names.
const LANG_ALIASES = {
  python: 'python',
  cpp: 'c++',
  java: 'java',
  javascript: 'javascript',
};

// Piston file names give the compiler the right extension.
const FILE_NAMES = {
  python: 'main.py',
  cpp: 'main.cpp',
  java: 'Main.java',
  javascript: 'main.js',
};

let _runtimesCache = null;

async function getRuntimes() {
  if (_runtimesCache) return _runtimesCache;
  const { data } = await withBackoff(() => client.get('/runtimes'));
  _runtimesCache = data;
  return data;
}

/** Resolve { language, version } Piston expects for one of our language keys. */
async function resolveRuntime(langKey) {
  const alias = LANG_ALIASES[langKey];
  if (!alias) throw Object.assign(new Error(`Unsupported language: ${langKey}`), { status: 400 });
  const runtimes = await getRuntimes();
  const match = runtimes.find(
    (r) => r.language === alias || (r.aliases || []).includes(alias) || r.language === langKey
  );
  if (!match) throw Object.assign(new Error(`No Piston runtime for ${langKey}`), { status: 502 });
  return { language: match.language, version: match.version };
}

/** Execute one program against one stdin. Returns Piston's raw run/compile blocks. */
async function executeOnce({ langKey, source, stdin = '', timeLimitMs = 4000 }) {
  const { language, version } = await resolveRuntime(langKey);
  const payload = {
    language,
    version,
    files: [{ name: FILE_NAMES[langKey] || 'main.txt', content: source }],
    stdin,
    compile_timeout: 10000,
    run_timeout: timeLimitMs,
  };
  const { data } = await withBackoff(() => client.post('/execute', payload));
  return data; // { compile?, run, language, version }
}

/** Normalize output for comparison: trim trailing spaces per line + trailing blank lines. */
function normalizeOutput(s = '') {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

/** Run async tasks with bounded concurrency (default 3) to respect Piston's rate limit. */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Did compilation fail? (compiled languages only expose a compile block.) */
function compileFailed(data) {
  return data.compile && (data.compile.code !== 0 || data.compile.signal);
}

/**
 * Run `code` against a list of test cases and compute a verdict.
 * Returns { verdict, passedCount, totalCount, runtimeMs, testResults[], compileOutput }.
 */
export async function runTests({ langKey, code, testCases, timeLimitMs = 4000 }) {
  if (!testCases.length) {
    return { verdict: 'AC', passedCount: 0, totalCount: 0, runtimeMs: 0, testResults: [] };
  }

  // Run all cases (bounded concurrency). If the first shows a compile error,
  // every case would; Piston recompiles each call, so we just detect it per-result.
  const raw = await mapWithConcurrency(testCases, 3, (tc) =>
    executeOnce({ langKey, source: code, stdin: tc.input || '', timeLimitMs })
  );

  const testResults = [];
  let passedCount = 0;
  let sawTLE = false;
  let sawRE = false;
  let sawCE = false;
  let maxTimeMs = 0;

  raw.forEach((data, i) => {
    const tc = testCases[i];
    if (compileFailed(data)) {
      sawCE = true;
      testResults.push({ index: i, passed: false, timeMs: 0, isHidden: tc.isHidden, stderr: data.compile.stderr || 'Compilation error' });
      return;
    }
    const run = data.run || {};
    const timeMs = Number(run.wall_time || run.cpu_time || 0);
    maxTimeMs = Math.max(maxTimeMs, timeMs);

    // Piston kills timeouts with a signal (commonly SIGKILL).
    if (run.signal && run.code === null) {
      sawTLE = true;
      testResults.push({ index: i, passed: false, timeMs, isHidden: tc.isHidden, stderr: `Timed out (${run.signal})` });
      return;
    }
    if (run.code !== 0) {
      sawRE = true;
      testResults.push({ index: i, passed: false, timeMs, isHidden: tc.isHidden, stderr: (run.stderr || '').slice(0, 500) });
      return;
    }
    const ok = normalizeOutput(run.stdout) === normalizeOutput(tc.expectedOutput);
    if (ok) passedCount += 1;
    testResults.push({ index: i, passed: ok, timeMs, isHidden: tc.isHidden, stderr: ok ? '' : '' });
  });

  let verdict;
  if (sawCE) verdict = 'CE';
  else if (passedCount === testCases.length) verdict = 'AC';
  else if (sawTLE) verdict = 'TLE';
  else if (sawRE) verdict = 'RE';
  else verdict = 'WA';

  return {
    verdict,
    passedCount,
    totalCount: testCases.length,
    runtimeMs: Math.round(maxTimeMs),
    testResults,
    compileOutput: sawCE ? testResults.find((t) => t.stderr)?.stderr : undefined,
  };
}

export const _internal = { normalizeOutput, resolveRuntime };
