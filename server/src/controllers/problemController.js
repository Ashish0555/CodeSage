import { Problem } from '../models/Problem.js';
import { asyncHandler, ApiError } from '../middleware/error.js';

/**
 * GET /api/problems
 * Filters: ?difficulty=&topic=&company=&search=&page=&limit=
 * Test cases are NOT sent in the list (kept lean + hidden tests stay hidden).
 */
export const listProblems = asyncHandler(async (req, res) => {
  const { difficulty, topic, company, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));

  const q = {};
  if (difficulty) q.difficulty = difficulty;
  if (topic) q.topics = topic;
  if (company) q.companies = company;
  if (search) q.$text = { $search: search };

  const [items, total] = await Promise.all([
    Problem.find(q)
      .select('slug title difficulty topics companies')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Problem.countDocuments(q),
  ]);

  res.json({ items, total, page, limit });
});

/**
 * GET /api/problems/:slug
 * Returns the full problem but strips hidden test cases (only counts exposed)
 * and never leaks expected outputs for hidden tests.
 */
export const getProblem = asyncHandler(async (req, res) => {
  const problem = await Problem.findOne({ slug: req.params.slug }).lean();
  if (!problem) throw new ApiError(404, 'Problem not found');

  const visibleTests = (problem.testCases || []).filter((t) => !t.isHidden);
  const hiddenCount = (problem.testCases || []).length - visibleTests.length;

  res.json({
    ...problem,
    testCases: visibleTests, // hidden tests never sent to the client
    hiddenTestCount: hiddenCount,
  });
});
