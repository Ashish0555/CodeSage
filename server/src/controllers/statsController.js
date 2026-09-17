import { prisma } from '../infrastructure/database/prisma.js';
import { asyncHandler } from '../middleware/error.js';

/**
 * GET /api/me/stats — dashboard analytics + a difficulty-weighted readiness score.
 */
export const myStats = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;

  const [verdictAgg, solvedByDiff, recent] = await Promise.all([
    prisma.submission.groupBy({
      by: ['verdict'],
      where: { userId },
      _count: { verdict: true },
    }),
    prisma.submission.groupBy({
      by: ['problemId'],
      where: { userId, verdict: 'AC' },
      _count: { problemId: true },
    }),
    prisma.submission.findMany({
      where: { userId },
      select: {
        id: true,
        verdict: true,
        createdAt: true,
        problem: { select: { slug: true, title: true, difficulty: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const verdicts = Object.fromEntries(verdictAgg.map((v) => [v.verdict, v._count.verdict]));
  const totalSubs = Object.values(verdicts).reduce((a, b) => a + b, 0);
  const acCount = verdicts.AC || 0;

  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  const solvedProblemIds = new Set(solvedByDiff.map((v) => v.problemId));

  if (solvedProblemIds.size) {
    const solvedProblems = await prisma.problem.findMany({
      where: { id: { in: [...solvedProblemIds] } },
      select: { id: true, difficulty: true },
    });
    for (const p of solvedProblems) {
      const key = p.difficulty;
      byDifficulty[key] = (byDifficulty[key] || 0) + 1;
    }
  }

  const readiness = computeReadiness(byDifficulty, acCount, totalSubs);

  res.json({
    solvedByDifficulty: byDifficulty,
    totalSolved: byDifficulty.Easy + byDifficulty.Medium + byDifficulty.Hard,
    verdicts,
    totalSubmissions: totalSubs,
    acceptanceRate: totalSubs ? Math.round((acCount / totalSubs) * 100) : 0,
    readinessScore: readiness,
    recentSubmissions: recent,
  });
});

function computeReadiness(byDiff, acCount, totalSubs) {
  const weighted = byDiff.Easy * 1 + byDiff.Medium * 2 + byDiff.Hard * 4;
  const coverage = Math.min(1, weighted / 40);
  const accuracy = totalSubs ? Math.min(1, acCount / totalSubs) : 0;
  return Math.round((coverage * 0.75 + accuracy * 0.25) * 100);
}
