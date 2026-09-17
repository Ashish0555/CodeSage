import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { AIReview } from '../models/AIReview.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { validate, hintSchema, askSchema } from '../utils/validation.js';
import { initSSE, sseSend, sseDone, sseError } from '../utils/sse.js';
import * as ai from '../services/aiService.js';
import * as rag from '../services/ragService.js';

/**
 * POST /api/ai/hint  (SSE)
 * Streams a leveled hint token-by-token. The guardrail lives in the prompt
 * (no full solutions). Generic (no-code) hints are cached to save quota.
 */
export const hint = asyncHandler(async (req, res) => {
  const { problemSlug, level, code } = validate(hintSchema, req.body);
  const problem = await Problem.findOne({ slug: problemSlug });
  if (!problem) throw new ApiError(404, 'Problem not found');

  initSSE(res);
  try {
    for await (const chunk of ai.streamHint({ problem, level, code })) {
      sseSend(res, 'chunk', { text: chunk });
    }
    sseDone(res, { level });
  } catch (err) {
    // Errors after headers are sent must go over the stream, not as JSON.
    sseError(res, err.message || 'Hint generation failed');
  }
});

/**
 * POST /api/ai/review/:submissionId
 * Structured review ANCHORED to the judge verdict. Cached per submission
 * (a submission is immutable, so its review is too).
 */
export const review = asyncHandler(async (req, res) => {
  const submission = await Submission.findOne({ _id: req.params.submissionId, user: req.user._id }).populate('problem');
  if (!submission) throw new ApiError(404, 'Submission not found');

  const existing = await AIReview.findOne({ submission: submission._id });
  if (existing) return res.json({ review: existing, cached: true });

  const data = await ai.reviewSubmission({
    problem: submission.problem,
    language: submission.language,
    code: submission.code,
    verdict: submission.verdict,
    passedCount: submission.passedCount,
    totalCount: submission.totalCount,
  });

  const saved = await AIReview.create({
    submission: submission._id,
    user: req.user._id,
    ...data,
  });
  res.json({ review: saved, cached: false });
});

/**
 * POST /api/ai/ask  — RAG concept tutor.
 * Retrieve top-k grounded chunks, then answer with citations. Returns the
 * cited sources so the UI can show provenance.
 */
export const ask = asyncHandler(async (req, res) => {
  const { question, topic, company } = validate(askSchema, req.body);

  const contexts = await rag.search({ question, k: 5, filter: { topic, company } });
  const answer = await ai.answerWithContext({ question, contexts });

  res.json({
    answer,
    sources: contexts.map((c, i) => ({
      n: i + 1,
      title: c.title,
      source: c.source,
      score: c.score,
      preview: (c.text || '').slice(0, 160),
    })),
    grounded: contexts.length > 0,
  });
});
