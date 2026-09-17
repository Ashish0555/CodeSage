import { getProvider, REVIEW_SCHEMA, SCORECARD_SCHEMA } from './llmProvider.js';
import { cache } from '../utils/cache.js';
import * as P from '../prompts/index.js';

/**
 * aiService — the app-facing AI layer. All AI features live here and depend
 * only on the provider interface (getProvider()), never on Gemini directly.
 *
 * Graceful degradation: if no provider is configured (no API key), every
 * feature returns a safe fallback so the app still runs and demos. This is the
 * "AI is optional infrastructure, the core product still works" principle.
 */

export function aiAvailable() {
  return !!getProvider();
}

/* ----------------------------- Hints (streaming) ----------------------------- */
/**
 * Yields hint text chunks. Cacheable ONLY when no user code is involved
 * (a generic Level-N hint for a problem) — that's what conserves quota.
 * Returns an async generator of string chunks.
 */
export async function* streamHint({ problem, level, code }) {
  const provider = getProvider();
  if (!provider) {
    yield fallbackHint(level);
    return;
  }

  const cacheable = !code;
  const key = `hint:v1:${problem._id}:${level}`;
  if (cacheable && cache.has(key)) {
    yield cache.get(key);
    return;
  }

  const system = P.HINT_SYSTEM_V1;
  const prompt = P.hintUser({ problem, level, code });

  let full = '';
  for await (const chunk of provider.streamText({ system, prompt })) {
    full += chunk;
    yield chunk;
  }
  if (cacheable) cache.set(key, full, 6 * 60 * 60 * 1000); // 6h
}

function fallbackHint(level) {
  const map = {
    1: 'Hint (offline): Re-read the constraints — their size usually reveals the intended time complexity and rules out brute force.',
    2: 'Hint (offline): Ask which classic pattern fits — two pointers, sliding window, hashing, binary search, greedy, or dynamic programming.',
    3: 'Hint (offline): Outline the key step in plain words first, then translate that single step into code before writing the whole solution.',
  };
  return map[level] || map[1];
}

/* ----------------------------- Code review (structured) ----------------------------- */
export async function reviewSubmission({ problem, language, code, verdict, passedCount, totalCount }) {
  const provider = getProvider();
  if (!provider) {
    return {
      ...fallbackReview(verdict),
      groundedVerdict: verdict,
      model: 'offline-fallback',
    };
  }

  const data = await provider.generateJSON({
    system: P.REVIEW_SYSTEM_V1,
    prompt: P.reviewUser({ problem, language, code, verdict, passedCount, totalCount }),
    schema: REVIEW_SCHEMA,
  });

  // Clamp the score defensively; correctness always comes from the judge.
  data.codeQualityScore = Math.max(1, Math.min(10, Math.round(data.codeQualityScore || 5)));
  return { ...data, groundedVerdict: verdict, model: provider.name };
}

function fallbackReview(verdict) {
  return {
    timeComplexity: 'n/a (AI offline)',
    spaceComplexity: 'n/a (AI offline)',
    codeQualityScore: 5,
    strengths: verdict === 'AC' ? ['All tests passed per the judge.'] : [],
    improvements: ['Enable the AI (set GEMINI_API_KEY) for a detailed review.'],
    edgeCasesMissed: [],
  };
}

/* ----------------------------- Mock interview ----------------------------- */
/**
 * Produce the next interviewer turn as a STREAM, given the transcript so far.
 * Conversation state = the messages array (persisted by the controller). We
 * translate our roles into Gemini's user/model turns.
 */
export async function* streamInterviewerTurn({ problem, messages }) {
  const provider = getProvider();
  if (!provider) {
    yield 'Interviewer (offline): Walk me through your approach and its time complexity.';
    return;
  }

  const contents = toGeminiContents(problem, messages);
  for await (const chunk of provider.streamText({ system: P.INTERVIEW_SYSTEM_V1, contents })) {
    yield chunk;
  }
}

function toGeminiContents(problem, messages) {
  // Seed with the opening instruction as the first user turn if empty.
  const turns = [];
  if (messages.length === 0) {
    turns.push({ role: 'user', parts: [{ text: P.interviewOpening({ problem }) }] });
    return turns;
  }
  // interviewer -> model, candidate -> user
  for (const m of messages) {
    turns.push({ role: m.role === 'interviewer' ? 'model' : 'user', parts: [{ text: m.content }] });
  }
  return turns;
}

export async function evaluateInterview({ messages }) {
  const provider = getProvider();
  const transcript = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  if (!provider) {
    return { problemSolving: 0, communication: 0, codeQuality: 0, overall: 0, notes: 'AI offline — no evaluation.' };
  }
  const data = await provider.generateJSON({
    system: P.SCORECARD_SYSTEM_V1,
    prompt: P.scorecardUser({ transcript }),
    schema: SCORECARD_SCHEMA,
  });
  return data;
}

/* ----------------------------- RAG answer ----------------------------- */
export async function answerWithContext({ question, contexts }) {
  const provider = getProvider();
  if (!provider) {
    return contexts.length
      ? `AI offline. Most relevant note: "${contexts[0].text.slice(0, 300)}..."`
      : 'AI offline and no matching notes found.';
  }
  return provider.generateText({
    system: P.RAG_SYSTEM_V1,
    prompt: P.ragUser({ question, contexts }),
    temperature: 0.3,
  });
}
