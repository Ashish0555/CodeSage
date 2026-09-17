import { prisma } from '../infrastructure/database/prisma.js';
import { runTests } from '../services/execService.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { validate, runSchema, submitSchema } from '../utils/validation.js';

/**
 * POST /api/run  — run against VISIBLE sample cases only; nothing is saved.
 */
export const runCode = asyncHandler(async (req, res) => {
  const { problemSlug, language, code } = validate(runSchema, req.body);
  const problem = await prisma.problem.findUnique({
    where: { slug: problemSlug },
    include: { testCases: true },
  });
  if (!problem) throw new ApiError(404, 'Problem not found');

  const sampleTests = problem.testCases.filter((t) => !t.isHidden);
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
  const problem = await prisma.problem.findUnique({
    where: { slug: problemSlug },
    include: { testCases: true },
  });
  if (!problem) throw new ApiError(404, 'Problem not found');

  const result = await runTests({
    langKey: language,
    code,
    testCases: problem.testCases,
    timeLimitMs: problem.timeLimitMs,
  });

  const submission = await prisma.submission.create({
    data: {
      userId: req.user.id || req.user._id,
      problemId: problem.id,
      language,
      code,
      verdict: result.verdict,
      passedCount: result.passedCount,
      totalCount: result.totalCount,
      runtimeMs: result.runtimeMs,
      testResults: result.testResults.map((t) => ({
        index: t.index,
        passed: t.passed,
        timeMs: t.timeMs,
        isHidden: t.isHidden,
        stderr: t.isHidden ? '' : t.stderr,
      })),
    },
  });

  await updateStatsOnAccept(req.user, problem, result.verdict);

  res.status(201).json({
    submissionId: submission.id,
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
  const userId = user.id || user._id;
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) return;

  const stats = current.stats && typeof current.stats === 'object' ? current.stats : {};
  stats.attempts = Number(stats.attempts || 0) + 1;

  if (verdict === 'AC') {
    const acCount = await prisma.submission.count({
      where: { userId, problemId: problem.id, verdict: 'AC' },
    });
    if (acCount <= 1) {
      stats.solved = Number(stats.solved || 0) + 1;
      const diffKey = problem.difficulty.toLowerCase();
      const byDifficulty = stats.byDifficulty || { easy: 0, medium: 0, hard: 0 };
      byDifficulty[diffKey] = Number(byDifficulty[diffKey] || 0) + 1;
      stats.byDifficulty = byDifficulty;

      const byTopic = stats.byTopic || {};
      for (const topic of problem.topics || []) {
        byTopic[topic] = byTopic[topic] || { solved: 0, attempts: 0 };
        byTopic[topic].solved += 1;
      }
      stats.byTopic = byTopic;
    }
  }

  await prisma.user.update({
    where: { id: current.id },
    data: { stats },
  });
}

/** GET /api/submissions?problemSlug= — the current user's submissions. */
export const listSubmissions = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const where = { userId };
  if (req.query.problemSlug) {
    const problem = await prisma.problem.findUnique({ where: { slug: req.query.problemSlug }, select: { id: true } });
    if (problem) where.problemId = problem.id;
  }
  const items = await prisma.submission.findMany({
    where,
    select: {
      id: true,
      language: true,
      verdict: true,
      passedCount: true,
      totalCount: true,
      runtimeMs: true,
      createdAt: true,
      problem: { select: { slug: true, title: true, difficulty: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ items });
});

/** GET /api/submissions/:id — full submission (only the owner's). */
export const getSubmission = asyncHandler(async (req, res) => {
  const submission = await prisma.submission.findFirst({
    where: { id: req.params.id, userId: req.user.id || req.user._id },
    include: { problem: { select: { slug: true, title: true, difficulty: true } } },
  });
  if (!submission) throw new ApiError(404, 'Submission not found');
  res.json({
    ...submission,
    id: submission.id,
    _id: submission.id,
    problem: submission.problem,
  });
});
