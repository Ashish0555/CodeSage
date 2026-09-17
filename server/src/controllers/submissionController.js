import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { runTests } from '../services/execService.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { validate, runSchema, submitSchema } from '../utils/validation.js';

/**
 * POST /api/run  — run against VISIBLE sample cases only; nothing is saved.
 * Fast feedback loop while the user is still iterating.
 */
export const runCode = asyncHandler(async (req, res) => {
  const { problemSlug, language, code } = validate(runSchema, req.body);
  const problem = await Problem.findOne({ slug: problemSlug });
  if (!problem) throw new ApiError(404, 'Problem not found');

  const sampleTests = (problem.testCases || []).filter((t) => !t.isHidden);
  const result = await runTests({
    langKey: language,
    code,
    testCases: sampleTests,
    timeLimitMs: problem.timeLimitMs,
  });

  res.json({ ...result, saved: false });
});

/**
 * POST /api/submissions — run ALL cases (visible + hidden), compute a verdict,
 * persist the submission, and update the user's stats on first accept.
 */
export const submitCode = asyncHandler(async (req, res) => {
  const { problemSlug, language, code } = validate(submitSchema, req.body);
  const problem = await Problem.findOne({ slug: problemSlug });
  if (!problem) throw new ApiError(404, 'Problem not found');

  const result = await runTests({
    langKey: language,
    code,
    testCases: problem.testCases || [],
    timeLimitMs: problem.timeLimitMs,
  });

  const submission = await Submission.create({
    user: req.user._id,
    problem: problem._id,
    language,
    code,
    verdict: result.verdict,
    passedCount: result.passedCount,
    totalCount: result.totalCount,
    runtimeMs: result.runtimeMs,
    // Only persist non-hidden failures' stderr; never leak hidden expected outputs.
    testResults: result.testResults.map((t) => ({
      index: t.index,
      passed: t.passed,
      timeMs: t.timeMs,
      isHidden: t.isHidden,
      stderr: t.isHidden ? '' : t.stderr,
    })),
  });

  await updateStatsOnAccept(req.user, problem, result.verdict);

  // Hide expected outputs of hidden tests in the response too.
  res.status(201).json({
    submissionId: submission._id,
    verdict: result.verdict,
    passedCount: result.passedCount,
    totalCount: result.totalCount,
    runtimeMs: result.runtimeMs,
    testResults: submission.testResults,
    compileOutput: result.compileOutput,
  });
});

/** Increment attempt/solve stats. A problem counts as "solved" only once. */
async function updateStatsOnAccept(user, problem, verdict) {
  user.stats.attempts += 1;
  if (verdict === 'AC') {
    // The just-created AC submission is already in the DB, so the FIRST accept
    // yields a count of exactly 1. Anything >1 means it was solved before.
    const acCount = await Submission.countDocuments({ user: user._id, problem: problem._id, verdict: 'AC' });
    if (acCount <= 1) {
      user.stats.solved += 1;
      const diffKey = problem.difficulty.toLowerCase();
      user.stats.byDifficulty[diffKey] = (user.stats.byDifficulty[diffKey] || 0) + 1;
      for (const topic of problem.topics || []) {
        const cur = user.stats.byTopic.get(topic) || { solved: 0, attempts: 0 };
        cur.solved += 1;
        user.stats.byTopic.set(topic, cur);
      }
    }
  }
  await user.save();
}

/** GET /api/submissions?problemSlug= — the current user's submissions. */
export const listSubmissions = asyncHandler(async (req, res) => {
  const q = { user: req.user._id };
  if (req.query.problemSlug) {
    const problem = await Problem.findOne({ slug: req.query.problemSlug }).select('_id');
    if (problem) q.problem = problem._id;
  }
  const items = await Submission.find(q)
    .select('problem language verdict passedCount totalCount runtimeMs createdAt')
    .populate('problem', 'slug title difficulty')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ items });
});

/** GET /api/submissions/:id — full submission (only the owner's). */
export const getSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findOne({ _id: req.params.id, user: req.user._id })
    .populate('problem', 'slug title difficulty')
    .lean();
  if (!submission) throw new ApiError(404, 'Submission not found');
  res.json(submission);
});
