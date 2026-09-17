import { Submission } from '../models/Submission.js';
import { asyncHandler } from '../middleware/error.js';

/**
 * GET /api/me/stats — dashboard analytics + a difficulty-weighted readiness score.
 *
 * Readiness score design (a light, defensible use of weighting):
 *   - Easy/Medium/Hard solves are worth 1/2/4 points (harder = more signal).
 *   - We also reward *consistency* via acceptance rate, capped so a single
 *     lucky submit doesn't dominate. Score is normalized to 0-100.
 * It's intentionally simple and explainable — you can defend every term.
 */
export const myStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Aggregate verdict counts and solved-by-difficulty in the DB, not in Node.
  const [verdictAgg, solvedByDiff, recent] = await Promise.all([
    Submission.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$verdict', count: { $sum: 1 } } },
    ]),
    Submission.aggregate([
      { $match: { user: userId, verdict: 'AC' } },
      { $group: { _id: { problem: '$problem' } } }, // distinct solved problems
      {
        $lookup: { from: 'problems', localField: '_id.problem', foreignField: '_id', as: 'p' },
      },
      { $unwind: '$p' },
      { $group: { _id: '$p.difficulty', count: { $sum: 1 } } },
    ]),
    Submission.find({ user: userId })
      .select('problem verdict createdAt')
      .populate('problem', 'slug title difficulty')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const verdicts = Object.fromEntries(verdictAgg.map((v) => [v._id, v.count]));
  const totalSubs = Object.values(verdicts).reduce((a, b) => a + b, 0);
  const acCount = verdicts.AC || 0;

  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  for (const d of solvedByDiff) byDifficulty[d._id] = d.count;

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
  // Saturating curve: 40 weighted points ~= "strong". Tunable, explainable.
  const coverage = Math.min(1, weighted / 40);
  const accuracy = totalSubs ? Math.min(1, acCount / totalSubs) : 0;
  // 75% coverage, 25% accuracy.
  return Math.round((coverage * 0.75 + accuracy * 0.25) * 100);
}
