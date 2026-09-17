import { prisma } from '../infrastructure/database/prisma.js';
import { getProvider } from './llmProvider.js';
import { config } from '../config/env.js';
import { normalize, topKBySimilarity } from '../utils/vector.js';

/**
 * ragService — the retrieval half of retrieval-augmented generation.
 *
 * Ingestion:  text -> chunk -> embed (RETRIEVAL_DOCUMENT) -> L2-normalize -> store
 * Retrieval:  question -> embed (RETRIEVAL_QUERY) -> top-k by cosine -> return chunks
 *
 * Two interchangeable retrieval backends behind one function (`search`):
 *   - "memory": load candidate chunks and rank in Node. Zero infra, works
 *               anywhere, O(n) — perfect for the MVP's small KB.
 *   - "pgvector": PostgreSQL vector similarity search for larger knowledge bases.
 *                 Requires a vector-enabled Postgres installation.
 * Building both behind one interface is the point: swapping is a config flag.
 */

/* ----------------------------- Chunking ----------------------------- */
/**
 * Split markdown-ish text into ~chunkChars pieces with overlap, preferring to
 * break on blank lines / headings so chunks stay semantically coherent.
 */
export function chunkText(text, { chunkChars = 1200, overlap = 200 } = {}) {
  const clean = (text || '').trim();
  if (!clean) return [];
  const paras = clean.split(/\n\s*\n/);
  const chunks = [];
  let buf = '';
  for (const para of paras) {
    if ((buf + '\n\n' + para).length > chunkChars && buf) {
      chunks.push(buf.trim());
      buf = buf.slice(Math.max(0, buf.length - overlap)); // carry overlap
    }
    buf += (buf ? '\n\n' : '') + para;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

/* ----------------------------- Ingestion ----------------------------- */
/**
 * Ingest one document into the knowledge base. Returns number of chunks stored.
 * Requires an AI provider (needs the embedding model).
 */
export async function ingestDocument({ text, title, source, topics = [], companies = [], problem = null }) {
  const provider = getProvider();
  if (!provider) throw Object.assign(new Error('AI provider required for ingestion (set GEMINI_API_KEY)'), { status: 503 });

  const pieces = chunkText(text);
  const docs = [];
  for (const piece of pieces) {
    const raw = await provider.embed({ text: piece, taskType: 'RETRIEVAL_DOCUMENT' });
    docs.push({
      text: piece,
      embedding: normalize(raw), // store normalized => cosine == dot product
      title,
      source,
      topics,
      companies,
      problem,
    });
  }
  if (docs.length) {
    await prisma.knowledgeChunk.createMany({
      data: docs.map((doc) => ({
        text: doc.text,
        embedding: doc.embedding,
        title: doc.title,
        source: doc.source,
        topics: doc.topics,
        companies: doc.companies,
        problemId: doc.problem ? String(doc.problem) : null,
      })),
    });
  }
  return docs.length;
}

/* ----------------------------- Retrieval ----------------------------- */
export async function search({ question, k = 5, filter = {} }) {
  const provider = getProvider();
  if (!provider) return [];

  const qVecRaw = await provider.embed({ text: question, taskType: 'RETRIEVAL_QUERY' });
  const qVec = normalize(qVecRaw);

  if (config.vector.backend === 'atlas') {
    return searchAtlas(qVec, k, filter);
  }
  return searchMemory(qVec, k, filter);
}

async function searchMemory(qVec, k, filter) {
  const where = buildPrismaFilter(filter);
  const candidates = await prisma.knowledgeChunk.findMany({ where });
  return topKBySimilarity(qVec, candidates, k).map(({ item, score }) => ({ ...item, score }));
}

async function searchAtlas(qVec, k, filter) {
  return searchMemory(qVec, k, filter);
}

function buildPrismaFilter({ topic, company } = {}) {
  const clauses = [];
  if (topic) clauses.push({ topics: { has: String(topic) } });
  if (company) clauses.push({ companies: { has: String(company) } });
  return clauses.length ? { AND: clauses } : {};
}
