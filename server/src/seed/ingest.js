/**
 * Seed script — `npm run seed`
 */

import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB, prisma } from '../config/db.js';
import { config } from '../config/env.js';
import { ingestDocument } from '../services/ragService.js';
import { aiAvailable } from '../services/aiService.js';
import { problems } from './problems.js';
import { conceptNotes } from './conceptNotes.js';

const DEMO_USER = { name: 'Demo User', email: 'demo@codesage.dev', password: 'demo1234' };

async function seed() {
  await connectDB();
  console.log(`[seed] using database: ${config.databaseUrl}`);

  await prisma.$transaction([
    prisma.knowledgeChunk.deleteMany(),
    prisma.testCase.deleteMany(),
    prisma.problem.deleteMany(),
    prisma.user.deleteMany({ where: { email: DEMO_USER.email } }),
  ]);
  console.log('[seed] cleared problems, test cases, knowledge chunks, and the demo user');

  const inserted = [];
  for (const problem of problems) {
    const created = await prisma.problem.create({
      data: {
        slug: problem.slug,
        title: problem.title,
        statement: problem.statement,
        difficulty: problem.difficulty,
        topics: problem.topics || [],
        companies: problem.companies || [],
        constraints: problem.constraints || '',
        examples: problem.examples || [],
        starterCode: problem.starterCode || {},
        editorial: problem.editorial || '',
        timeLimitMs: problem.timeLimitMs || 4000,
      },
    });
    if (problem.testCases?.length) {
      await prisma.testCase.createMany({
        data: problem.testCases.map((tc) => ({
          problemId: created.id,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput,
          isHidden: !!tc.isHidden,
        })),
      });
    }
    inserted.push({ ...created, topics: problem.topics || [], companies: problem.companies || [] });
  }
  const bySlug = Object.fromEntries(inserted.map((p) => [p.slug, p]));
  console.log(`[seed] inserted ${inserted.length} problems`);

  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
  await prisma.user.create({
    data: {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      passwordHash,
      role: 'user',
      stats: { solved: 0, attempts: 0, byTopic: {}, byDifficulty: { easy: 0, medium: 0, hard: 0 } },
    },
  });
  console.log(`[seed] created demo user -> ${DEMO_USER.email} / ${DEMO_USER.password}`);

  if (!aiAvailable()) {
    console.warn('[seed] GEMINI_API_KEY not set — SKIPPING knowledge-base ingestion.');
  } else {
    let chunks = 0;
    for (const p of inserted) {
      if (!p.editorial) continue;
      chunks += await ingestDocument({
        text: p.editorial,
        title: `Editorial: ${p.title}`,
        source: `editorial/${p.slug}`,
        topics: p.topics,
        companies: p.companies,
        problem: p.id,
      });
    }
    for (const note of conceptNotes) {
      chunks += await ingestDocument({
        text: note.text,
        title: note.title,
        source: note.source,
        topics: note.topics,
        companies: note.companies,
      });
    }
    console.log(`[seed] ingested ${chunks} knowledge chunks (backend: ${config.vector.backend})`);
  }

  void bySlug;

  await disconnectDB();
  console.log('[seed] done ✔');
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
