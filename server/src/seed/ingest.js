/**
 * Seed script — `npm run seed`
 *
 * Populates a fresh database so the app is demo-ready in one command:
 *   1. connect to MongoDB
 *   2. wipe the collections we own (idempotent — safe to re-run)
 *   3. insert the curated problems
 *   4. create a demo user (demo@codesage.dev / demo1234)
 *   5. build the RAG knowledge base from every problem editorial + concept note
 *
 * Step 5 needs the embedding model, so it is SKIPPED with a clear message when
 * GEMINI_API_KEY is absent. Everything else still works — the app boots and the
 * judge/auth/problems all function without any AI key (graceful degradation).
 */

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import { Problem } from '../models/Problem.js';
import { User } from '../models/User.js';
import { KnowledgeChunk } from '../models/KnowledgeChunk.js';
import { ingestDocument } from '../services/ragService.js';
import { aiAvailable } from '../services/aiService.js';
import { problems } from './problems.js';
import { conceptNotes } from './conceptNotes.js';

const DEMO_USER = { name: 'Demo User', email: 'demo@codesage.dev', password: 'demo1234' };

async function seed() {
  await connectDB();
  console.log(`[seed] using database: ${mongoose.connection.name}`);

  // 1) Reset the collections we manage (keeps re-runs clean and predictable).
  await Promise.all([
    Problem.deleteMany({}),
    KnowledgeChunk.deleteMany({}),
    User.deleteMany({ email: DEMO_USER.email }),
  ]);
  console.log('[seed] cleared problems, knowledge chunks, and the demo user');

  // 2) Problems.
  const inserted = await Problem.insertMany(problems);
  const bySlug = Object.fromEntries(inserted.map((p) => [p.slug, p]));
  console.log(`[seed] inserted ${inserted.length} problems`);

  // 3) Demo user (so reviewers can log in immediately).
  const demo = new User({ name: DEMO_USER.name, email: DEMO_USER.email });
  await demo.setPassword(DEMO_USER.password);
  await demo.save();
  console.log(`[seed] created demo user -> ${DEMO_USER.email} / ${DEMO_USER.password}`);

  // 4) RAG knowledge base — editorials + concept notes. Needs embeddings.
  if (!aiAvailable()) {
    console.warn('[seed] GEMINI_API_KEY not set — SKIPPING knowledge-base ingestion.');
    console.warn('[seed] Problems/auth/judge work now; the Tutor turns on once a key is added and you re-run seed.');
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
        problem: p._id,
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

  // Reference bySlug just to be explicit it exists (useful if you extend the seed
  // with sample submissions later).
  void bySlug;

  await disconnectDB();
  console.log('[seed] done ✔');
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
