import { prisma } from '../infrastructure/database/prisma.js';
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

  const where = {};
  if (difficulty) where.difficulty = difficulty;
  if (topic) where.topics = { has: String(topic) };
  if (company) where.companies = { has: String(company) };

  const [items, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      select: { id: true, slug: true, title: true, difficulty: true, topics: true, companies: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.problem.count({ where }),
  ]);

  res.json({ items, total, page, limit });
});

/**
 * GET /api/problems/:slug
 * Returns the full problem but strips hidden test cases (only counts exposed)
 * and never leaks expected outputs for hidden tests.
 */
export const getProblem = asyncHandler(async (req, res) => {
  const problem = await prisma.problem.findUnique({
    where: { slug: req.params.slug },
    include: { testCases: true },
  });
  if (!problem) throw new ApiError(404, 'Problem not found');

  const visibleTests = problem.testCases.filter((t) => !t.isHidden);
  const hiddenCount = problem.testCases.length - visibleTests.length;

  res.json({
    ...problem,
    id: problem.id,
    _id: problem.id,
    testCases: visibleTests,
    hiddenTestCount: hiddenCount,
  });
});
